import crypto from 'node:crypto';
import { query } from '../config/db.js';

const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30);
const REFRESH_TTL_MS = REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000;

export const REFRESH_COOKIE = 'mms_refresh';

export function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// Path '/' so the cookie also reaches /api/users (e.g. changePassword needs to
// read it to keep the current session alive while revoking the others).
export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_TTL_MS,
  };
}

export function setRefreshCookie(res, raw) {
  res.cookie(REFRESH_COOKIE, raw, cookieOptions());
}

export function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, { ...cookieOptions(), maxAge: undefined });
}

// Mint a new refresh token row. Pass familyId to keep a rotation chain together.
export async function issueRefreshToken(userId, { familyId, req } = {}) {
  const raw = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashToken(raw);
  const family = familyId || crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at, user_agent, ip)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      userId,
      tokenHash,
      family,
      expiresAt,
      (req?.headers?.['user-agent'] || '').slice(0, 255),
      req?.ip || null,
    ]
  );

  return { raw, tokenHash, familyId: family };
}

export async function revokeFamily(familyId) {
  await query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE family_id = $1 AND revoked_at IS NULL',
    [familyId]
  );
}

export async function revokeAllForUser(userId, { exceptFamilyId = null } = {}) {
  await query(
    `UPDATE refresh_tokens SET revoked_at = NOW()
     WHERE user_id = $1 AND revoked_at IS NULL
       AND ($2::text IS NULL OR family_id <> $2)`,
    [userId, exceptFamilyId]
  );
}

export async function familyForToken(raw) {
  const { rows } = await query(
    'SELECT family_id FROM refresh_tokens WHERE token_hash = $1',
    [hashToken(raw)]
  );
  return rows[0]?.family_id || null;
}
