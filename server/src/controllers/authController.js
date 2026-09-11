import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { query } from '../config/db.js';
import { serializeUser } from '../utils/serializeUser.js';
import { normalizeEmail, isValidEmail, passwordProblem } from '../utils/validators.js';
import {
  REFRESH_COOKIE,
  hashToken,
  issueRefreshToken,
  revokeFamily,
  revokeAllForUser,
  setRefreshCookie,
  clearRefreshCookie,
} from '../utils/refreshTokens.js';
import { sendMail } from '../utils/mailer.js';

const TOKEN_TTL = process.env.JWT_EXPIRES_IN || '15m';
const RESET_TTL_MIN = Number(process.env.PASSWORD_RESET_TTL_MIN || 30);

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

/* The session user shape, used by both /me and /refresh so a shopper's cached
   user object is identical however the session was established.
   has_password / providers let the profile screen offer "set a password"
   instead of "change password" on an account created through Google or
   Facebook, and show which of those are linked. */
const SESSION_USER_SQL = `
  SELECT u.id, u.name, u.email, u.role, u.is_active,
         (u.password_hash IS NOT NULL) AS has_password,
         COALESCE(
           (SELECT array_agg(i.provider ORDER BY i.provider)
              FROM user_identities i WHERE i.user_id = u.id),
           '{}'
         ) AS providers
    FROM users u WHERE u.id = $1`;

// Same columns minus the social bits, for a database that has not had
// migration 012 applied yet.
const SESSION_USER_SQL_LEGACY =
  'SELECT id, name, email, role, is_active FROM users WHERE id = $1';

let warnedMissingIdentities = false;

/* Load the user behind a session.
 *
 * Deliberately tolerant of a database still on the pre-012 schema: this runs on
 * every page load (/me) and every token renewal (/refresh), so if the API ships
 * ahead of the migration an outright failure here would sign out every shopper,
 * social or not. Falling back means the deploy order does not matter — the
 * enriched columns simply start appearing once the migration lands, with no
 * restart. Remove this once 012 is applied everywhere. */
async function loadSessionUser(userId) {
  try {
    return await query(SESSION_USER_SQL, [userId]);
  } catch (err) {
    // 42P01 = undefined_table
    if (err?.code !== '42P01') throw err;
    if (!warnedMissingIdentities) {
      warnedMissingIdentities = true;
      console.warn(
        '[auth] user_identities is missing — run migration 012_oauth_identities.sql. ' +
          'Serving sessions without has_password/providers until then.'
      );
    }
    return query(SESSION_USER_SQL_LEGACY, [userId]);
  }
}

// Issue a fresh refresh-token family and set the cookie; return an access token.
async function startSession(res, user, req) {
  const { raw } = await issueRefreshToken(user.id, { req });
  setRefreshCookie(res, raw);
  return signToken(user);
}

export async function register(req, res) {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: 'name, email and password are required', code: 'VALIDATION_ERROR' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address', code: 'VALIDATION_ERROR' });
    }
    const pwProblem = passwordProblem(password);
    if (pwProblem) {
      return res.status(400).json({ error: pwProblem, code: 'VALIDATION_ERROR' });
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered', code: 'EMAIL_TAKEN' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    // Public registration always creates a customer; staff roles are assigned by an admin.
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'customer')
       RETURNING id, name, email, role, is_active`,
      [name, email, passwordHash]
    );

    const user = rows[0];
    const token = await startSession(res, user, req);
    res.status(201).json({ token, user: serializeUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
}

export async function login(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: 'email and password are required', code: 'VALIDATION_ERROR' });
    }

    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    const user = rows[0];
    // A social-only account has no password_hash. Answer exactly as we would
    // for a wrong password, so this endpoint never reveals which addresses are
    // registered or how they sign in.
    if (!user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is disabled', code: 'ACCOUNT_DISABLED' });
    }

    const token = await startSession(res, user, req);
    res.json({ token, user: serializeUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
}

export async function me(req, res) {
  try {
    const { rows } = await loadSessionUser(req.user.id);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Account no longer exists', code: 'INVALID_TOKEN' });
    }
    if (!rows[0].is_active) {
      return res.status(403).json({ error: 'Account is disabled', code: 'ACCOUNT_DISABLED' });
    }
    res.json({ user: serializeUser(rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
}

// Rotating refresh: each call mints a successor in the same family and revokes
// the presented token. Re-presenting a revoked token nukes the whole family.
export async function refresh(req, res) {
  const raw = req.cookies?.[REFRESH_COOKIE];
  if (!raw) {
    return res.status(401).json({ error: 'No refresh token', code: 'NO_TOKEN' });
  }

  try {
    const { rows } = await query('SELECT * FROM refresh_tokens WHERE token_hash = $1', [
      hashToken(raw),
    ]);
    if (rows.length === 0) {
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'Invalid refresh token', code: 'INVALID_TOKEN' });
    }

    const record = rows[0];

    if (record.revoked_at) {
      await revokeFamily(record.family_id);
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'Refresh token reuse detected', code: 'TOKEN_REUSED' });
    }
    if (new Date(record.expires_at) < new Date()) {
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'Refresh token expired', code: 'TOKEN_EXPIRED' });
    }

    const userRes = await loadSessionUser(record.user_id);
    if (userRes.rows.length === 0 || !userRes.rows[0].is_active) {
      await revokeFamily(record.family_id);
      clearRefreshCookie(res);
      return res.status(403).json({ error: 'Account is disabled', code: 'ACCOUNT_DISABLED' });
    }
    const user = userRes.rows[0];

    const next = await issueRefreshToken(user.id, { familyId: record.family_id, req });
    await query('UPDATE refresh_tokens SET revoked_at = NOW(), replaced_by = $1 WHERE id = $2', [
      next.tokenHash,
      record.id,
    ]);
    setRefreshCookie(res, next.raw);

    res.json({ token: signToken(user), user: serializeUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Refresh failed' });
  }
}

export async function logout(req, res) {
  const raw = req.cookies?.[REFRESH_COOKIE];
  if (raw) {
    try {
      const { rows } = await query('SELECT family_id FROM refresh_tokens WHERE token_hash = $1', [
        hashToken(raw),
      ]);
      if (rows.length > 0) await revokeFamily(rows[0].family_id);
    } catch (err) {
      console.error(err);
    }
  }
  clearRefreshCookie(res);
  res.status(204).send();
}

export async function logoutAll(req, res) {
  try {
    await revokeAllForUser(req.user.id);
    clearRefreshCookie(res);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Logout failed' });
  }
}

export async function forgotPassword(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) {
      return res.status(400).json({ error: 'email is required', code: 'VALIDATION_ERROR' });
    }

    const { rows } = await query(
      'SELECT id, name, email, is_active FROM users WHERE email = $1',
      [email]
    );

    if (rows.length > 0 && rows[0].is_active) {
      const user = rows[0];
      await query(
        'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
        [user.id]
      );

      const rawToken = crypto.randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + RESET_TTL_MIN * 60 * 1000);
      await query(
        'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
        [user.id, hashToken(rawToken), expiresAt]
      );

      const appUrl = process.env.APP_URL || 'http://localhost:5173';
      const link = `${appUrl}/reset-password?token=${rawToken}`;
      await sendMail({
        to: user.email,
        subject: 'Reset your Modern Monkey Sale password',
        text: `Hi ${user.name},\n\nUse the link below to reset your password (valid for ${RESET_TTL_MIN} minutes):\n\n${link}\n\nIf you didn't request this, you can ignore this email.`,
        html: `<p>Hi ${user.name},</p><p>Use the link below to reset your password (valid for ${RESET_TTL_MIN} minutes):</p><p><a href="${link}">${link}</a></p><p>If you didn't request this, you can ignore this email.</p>`,
      });
    }

    // Same response whether or not the address exists.
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.json({ ok: true });
  }
}

export async function resetPassword(req, res) {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res
        .status(400)
        .json({ error: 'token and password are required', code: 'VALIDATION_ERROR' });
    }
    const pwProblem = passwordProblem(password);
    if (pwProblem) {
      return res.status(400).json({ error: pwProblem, code: 'VALIDATION_ERROR' });
    }

    const { rows } = await query('SELECT * FROM password_reset_tokens WHERE token_hash = $1', [
      hashToken(token),
    ]);
    const record = rows[0];
    if (!record || record.used_at || new Date(record.expires_at) < new Date()) {
      return res
        .status(400)
        .json({ error: 'Invalid or expired reset token', code: 'INVALID_TOKEN' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
      passwordHash,
      record.user_id,
    ]);
    await query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [record.id]);
    // A reset invalidates every existing session.
    await revokeAllForUser(record.user_id);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Password reset failed' });
  }
}
