import { normalizeEmail } from './validators.js';

/* OAuth 2.0 authorization-code providers.
 *
 * Deliberately server-side and dependency-free:
 *   - the browser never loads Google's or Facebook's JavaScript, so there is
 *     no third-party script on the storefront and no CSP to loosen;
 *   - the code↔token exchange carries the client secret, which must never
 *     reach the browser;
 *   - Node 22's global fetch is all the HTTP client we need.
 *
 * The redirect URI is always APP_URL + /api/auth/oauth/<provider>/callback.
 * That resolves to the storefront's own origin in both environments (the Vite
 * proxy in dev, the Netlify /api/* rule in production), which keeps the
 * refresh-token cookie first-party.
 */

export const PROVIDERS = ['google', 'facebook'];

function decodeJwtPayload(token) {
  const part = String(token || '').split('.')[1];
  if (!part) throw new Error('Malformed id_token');
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
}

const google = {
  id: 'google',
  label: 'Google',
  authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  scope: 'openid email profile',
  // `select_account` so a shared browser doesn't silently reuse a session.
  authorizeParams: { access_type: 'online', prompt: 'select_account' },
  clientId: () => process.env.GOOGLE_CLIENT_ID,
  clientSecret: () => process.env.GOOGLE_CLIENT_SECRET,

  // The id_token arrives directly from Google's token endpoint over TLS, in a
  // response authenticated by our client secret. Per Google's own guidance a
  // token obtained that way needs no separate JWKS signature check — that step
  // exists for tokens received second-hand (e.g. posted up by a browser).
  async profile(tokens) {
    const claims = decodeJwtPayload(tokens.id_token);
    return {
      providerUserId: String(claims.sub),
      email: normalizeEmail(claims.email) || null,
      emailVerified: claims.email_verified === true || claims.email_verified === 'true',
      name: claims.name || claims.given_name || '',
    };
  },
};

const FB_VERSION = 'v21.0';

const facebook = {
  id: 'facebook',
  label: 'Facebook',
  authorizeUrl: `https://www.facebook.com/${FB_VERSION}/dialog/oauth`,
  tokenUrl: `https://graph.facebook.com/${FB_VERSION}/oauth/access_token`,
  scope: 'email,public_profile',
  authorizeParams: {},
  clientId: () => process.env.FACEBOOK_APP_ID,
  clientSecret: () => process.env.FACEBOOK_APP_SECRET,

  async profile(tokens) {
    const url = new URL(`https://graph.facebook.com/${FB_VERSION}/me`);
    url.searchParams.set('fields', 'id,name,email');
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!res.ok) {
      throw new Error(`Facebook profile request failed (${res.status})`);
    }
    const json = await res.json();
    return {
      providerUserId: String(json.id),
      email: normalizeEmail(json.email) || null,
      // Facebook returns the email field only for an address it has itself
      // confirmed, and omits it otherwise — so its presence is the signal.
      emailVerified: Boolean(json.email),
      name: json.name || '',
    };
  },
};

const BY_ID = { google, facebook };

export function getProvider(id) {
  return BY_ID[id] || null;
}

export function isConfigured(id) {
  const p = BY_ID[id];
  return Boolean(p && p.clientId() && p.clientSecret());
}

export function configuredProviders() {
  return Object.fromEntries(PROVIDERS.map((id) => [id, isConfigured(id)]));
}

export function appUrl() {
  return (process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, '');
}

export function redirectUri(id) {
  return `${appUrl()}/api/auth/oauth/${id}/callback`;
}

export function authorizeUrl(id, state) {
  const p = BY_ID[id];
  const url = new URL(p.authorizeUrl);
  url.searchParams.set('client_id', p.clientId());
  url.searchParams.set('redirect_uri', redirectUri(id));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', p.scope);
  url.searchParams.set('state', state);
  for (const [k, v] of Object.entries(p.authorizeParams)) {
    url.searchParams.set(k, v);
  }
  return url.toString();
}

// Exchange the one-time authorization code for tokens. Both providers accept
// the same form-encoded body shape.
export async function exchangeCode(id, code) {
  const p = BY_ID[id];
  const body = new URLSearchParams({
    code,
    client_id: p.clientId(),
    client_secret: p.clientSecret(),
    redirect_uri: redirectUri(id),
    grant_type: 'authorization_code',
  });

  const res = await fetch(p.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || !json) {
    // Provider error bodies can carry the code back; keep them out of our logs.
    throw new Error(`${p.label} token exchange failed (${res.status})`);
  }
  return json;
}

export async function fetchProfile(id, tokens) {
  return BY_ID[id].profile(tokens);
}
