import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { serializeUser } from '../utils/serializeUser.js';
import { normalizeEmail, isValidEmail, passwordProblem } from '../utils/validators.js';
import { REFRESH_COOKIE, familyForToken, revokeAllForUser } from '../utils/refreshTokens.js';

const ASSIGNABLE_ROLES = ['staff', 'manager', 'admin']; // roles an admin may create
const ALL_ROLES = ['customer', 'staff', 'manager', 'admin'];

export async function updateMe(req, res) {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (!name) {
      return res.status(400).json({ error: 'name is required', code: 'VALIDATION_ERROR' });
    }
    const { rows } = await query(
      `UPDATE users SET name = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, name, email, role, is_active`,
      [name, req.user.id]
    );
    res.json({ user: serializeUser(rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
}

export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword) {
      return res
        .status(400)
        .json({ error: 'newPassword is required', code: 'VALIDATION_ERROR' });
    }
    const pwProblem = passwordProblem(newPassword);
    if (pwProblem) {
      return res.status(400).json({ error: pwProblem, code: 'VALIDATION_ERROR' });
    }

    const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Account no longer exists', code: 'INVALID_TOKEN' });
    }

    // An account created through Google or Facebook has no password to confirm,
    // so this doubles as "set a password". The request is already authenticated
    // by a valid access token, which is the same assurance a correct current
    // password would give us.
    const hasPassword = Boolean(rows[0].password_hash);
    if (hasPassword) {
      if (!currentPassword) {
        return res
          .status(400)
          .json({ error: 'currentPassword is required', code: 'VALIDATION_ERROR' });
      }
      const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
      if (!valid) {
        return res
          .status(401)
          .json({ error: 'Current password is incorrect', code: 'INVALID_CREDENTIALS' });
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
      passwordHash,
      req.user.id,
    ]);

    // Sign out other devices, keep the current session alive.
    const currentFamily = req.cookies?.[REFRESH_COOKIE]
      ? await familyForToken(req.cookies[REFRESH_COOKIE])
      : null;
    await revokeAllForUser(req.user.id, { exceptFamilyId: currentFamily });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to change password' });
  }
}

export async function listUsers(req, res) {
  try {
    const { role, search } = req.query;
    let sql = 'SELECT id, name, email, role, is_active, created_at FROM users WHERE 1=1';
    const params = [];
    if (role) {
      params.push(role);
      sql += ` AND role = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (name ILIKE $${params.length} OR email ILIKE $${params.length})`;
    }
    sql += ' ORDER BY created_at DESC';
    const { rows } = await query(sql, params);
    res.json(rows.map(serializeUser));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}

export async function createUser(req, res) {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = normalizeEmail(req.body.email);
    const { password, role } = req.body;

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
    if (!ASSIGNABLE_ROLES.includes(role)) {
      return res.status(400).json({
        error: `role must be one of: ${ASSIGNABLE_ROLES.join(', ')}`,
        code: 'VALIDATION_ERROR',
      });
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered', code: 'EMAIL_TAKEN' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, is_active`,
      [name, email, passwordHash, role]
    );
    res.status(201).json({ user: serializeUser(rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create user' });
  }
}

export async function updateUserRole(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!ALL_ROLES.includes(role)) {
      return res
        .status(400)
        .json({ error: `role must be one of: ${ALL_ROLES.join(', ')}`, code: 'VALIDATION_ERROR' });
    }
    if (Number(id) === req.user.id) {
      return res
        .status(400)
        .json({ error: 'You cannot change your own role', code: 'VALIDATION_ERROR' });
    }
    const { rows } = await query(
      `UPDATE users SET role = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, name, email, role, is_active`,
      [role, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
    }
    res.json({ user: serializeUser(rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update role' });
  }
}

export async function updateUserStatus(req, res) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') {
      return res
        .status(400)
        .json({ error: 'is_active must be a boolean', code: 'VALIDATION_ERROR' });
    }
    if (Number(id) === req.user.id) {
      return res
        .status(400)
        .json({ error: 'You cannot change your own status', code: 'VALIDATION_ERROR' });
    }
    const { rows } = await query(
      `UPDATE users SET is_active = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, name, email, role, is_active`,
      [is_active, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
    }
    res.json({ user: serializeUser(rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update status' });
  }
}
