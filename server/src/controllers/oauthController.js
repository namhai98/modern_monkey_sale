import crypto from 'node:crypto';
import { query, withTransaction } from '../config/db.js';
import { issueRefreshToken, setRefreshCookie } from '../utils/refreshTokens.js';
import { decideAccountAction } from '../utils/accountLinking.js';
import {
  appUrl,
  authorizeUrl,
  configuredProviders,
  exchangeCode,
  fetchProfile,
  getProvider,
  isConfigured,
} from '../utils/oauthProviders.js';

/* Social sign-in, authorization-code flow.
 *
 *   GET /api/auth/oauth/:provider           → 302 to the provider
 *   GET /api/auth/oauth/:provider/callback  → links/creates the user, sets the
 *                                             refresh cookie, 302s to the SPA
 *
 * The callback deliberately does NOT return an access token. It only sets the
 * same rotating refresh cookie a password login sets, then bounces to
 * /auth/callback in the SPA, which calls the existing POST /api/auth/refresh to
 * mint its access token. One session model, one code path, and no token ever
 * travels in a URL or in browser history.
 */

const STATE_COOKIE = 'mms_oauth';
const STATE_TTL_MS = 10 * 60 * 1000;

function stateCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // must survive the provider's top-level redirect back
    path: '/api/auth/oauth',
    maxAge: STATE_TTL_MS,
  };
}

// Only ever send the shopper back to a path on our own origin.
function safeRedirect(target) {
  if (typeof target !== 'string' || !target.startsWith('/') || target.startsWith('//')) {
    return '/';
  }
  if (/[\r\n\t]/.test(target)) return '/';
  // bouncing back into the callback route would loop
  if (target.startsWith('/auth/callback')) return '/';
  return target;
}

function finish(res, { redirect = '/', error } = {}) {
  const url = new URL(`${appUrl()}/auth/callback`);
  if (error) url.searchParams.set('error', error);
  else url.searchParams.set('redirect', redirect);
  res.redirect(302, url.toString());
}

// GET /api/auth/providers — lets the SPA hide buttons for anything unconfigured.
export function listProviders(req, res) {
  res.json(configuredProviders());
}

export function start(req, res) {
  const id = req.params.provider;
  if (!getProvider(id) || !isConfigured(id)) {
    return res.status(404).json({ error: 'Provider not enabled', code: 'PROVIDER_DISABLED' });
  }

  const state = crypto.randomBytes(16).toString('base64url');
  const redirect = safeRedirect(req.query.redirect);

  // Double-submit CSRF: the provider echoes `state` in the query string, and we
  // only trust it if it matches the copy in this httpOnly cookie.
  res.cookie(
    STATE_COOKIE,
    Buffer.from(JSON.stringify({ state, redirect, provider: id })).toString('base64url'),
    stateCookieOptions()
  );

  res.redirect(302, authorizeUrl(id, state));
}

export async function callback(req, res) {
  const id = req.params.provider;

  const raw = req.cookies?.[STATE_COOKIE];
  res.clearCookie(STATE_COOKIE, { ...stateCookieOptions(), maxAge: undefined });

  if (!getProvider(id) || !isConfigured(id)) {
    return finish(res, { error: 'provider_disabled' });
  }

  // The shopper pressed "Cancel" on the provider's consent screen.
  if (req.query.error) {
    return finish(res, { error: 'denied' });
  }

  let stored;
  try {
    stored = JSON.parse(Buffer.from(String(raw), 'base64url').toString('utf8'));
  } catch {
    return finish(res, { error: 'state' });
  }
  if (
    !stored?.state ||
    stored.provider !== id ||
    typeof req.query.state !== 'string' ||
    req.query.state.length !== stored.state.length ||
    !crypto.timingSafeEqual(Buffer.from(req.query.state), Buffer.from(stored.state))
  ) {
    return finish(res, { error: 'state' });
  }

  const redirect = safeRedirect(stored.redirect);
  const code = req.query.code;
  if (typeof code !== 'string' || !code) {
    return finish(res, { error: 'failed' });
  }

  try {
    const tokens = await exchangeCode(id, code);
    const profile = await fetchProfile(id, tokens);
    if (!profile.providerUserId) {
      return finish(res, { error: 'failed' });
    }

    const user = await resolveUser(id, profile);
    if (user.error) {
      return finish(res, { error: user.error });
    }

    const { raw: refreshRaw } = await issueRefreshToken(user.id, { req });
    setRefreshCookie(res, refreshRaw);
    return finish(res, { redirect });
  } catch (err) {
    // Message only — never the code, tokens or profile payload.
    console.error(`[oauth:${id}]`, err.message);
    return finish(res, { error: 'failed' });
  }
}

async function resolveUser(provider, profile) {
  const linked = await query(
    `SELECT u.id, u.is_active
       FROM user_identities i
       JOIN users u ON u.id = i.user_id
      WHERE i.provider = $1 AND i.provider_user_id = $2`,
    [provider, profile.providerUserId]
  );

  const existing = profile.email
    ? await query('SELECT id, is_active FROM users WHERE email = $1', [profile.email])
    : { rows: [] };

  const decision = decideAccountAction({
    linkedUser: linked.rows[0] || null,
    existingUser: existing.rows[0] || null,
    profile,
  });

  if (decision.action === 'error') return { error: decision.error };
  if (decision.action === 'signIn') return { id: decision.userId };

  if (decision.action === 'link') {
    await query(
      `INSERT INTO user_identities (user_id, provider, provider_user_id, email)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (provider, provider_user_id) DO NOTHING`,
      [decision.userId, provider, profile.providerUserId, profile.email]
    );
    return { id: decision.userId };
  }

  const name = (profile.name || profile.email.split('@')[0]).slice(0, 255);

  return withTransaction(async (q) => {
    // Social sign-up always creates a customer; staff roles stay admin-assigned.
    const inserted = await q(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, NULL, 'customer')
       RETURNING id`,
      [name, profile.email]
    );
    const userId = inserted.rows[0].id;
    await q(
      `INSERT INTO user_identities (user_id, provider, provider_user_id, email)
       VALUES ($1, $2, $3, $4)`,
      [userId, provider, profile.providerUserId, profile.email]
    );
    return { id: userId };
  });
}
