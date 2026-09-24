// Live USD → MNT. Catalogue prices are stored in USD, but the storefront quotes
// tögrög, so the rate has to come off a real feed instead of a number somebody
// typed once and left to rot.
//
// Two key-less providers, tried in order; the admin-entered `mnt_rate` in
// `settings` is the last resort. The last good live reading is written back to
// `settings.mnt_rate_live` so a restart — or a provider outage lasting longer
// than the process — still has yesterday's number rather than nothing.
import { query } from '../config/db.js';

const LIVE_KEY = 'mnt_rate_live';
const MANUAL_KEY = 'mnt_rate';

// How long a reading is considered current. The feeds themselves refresh daily,
// so anything under a day is courtesy; six hours keeps us close to the update.
const TTL_MS = Number(process.env.FX_REFRESH_MINUTES || 360) * 60 * 1000;
const TIMEOUT_MS = Number(process.env.FX_TIMEOUT_MS || 6000);

// A provider that changes its base currency, or hands back a placeholder, must
// not be able to reprice the whole shop. USD/MNT has sat in the low thousands
// for years; anything outside this band is a bug, not a market move.
const MIN_PLAUSIBLE = 1000;
const MAX_PLAUSIBLE = 10000;

const PROVIDERS = [
  {
    name: 'open.er-api.com',
    url: 'https://open.er-api.com/v6/latest/USD',
    pick: (json) => (json?.result === 'success' ? json?.rates?.MNT : null),
  },
  {
    name: 'currency-api',
    url: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
    pick: (json) => json?.usd?.mnt,
  },
];

// Exported for the tests: pull the rate out of a provider payload and refuse
// anything that isn't a plausible USD→MNT number.
export function readProviderRate(provider, json) {
  const rate = Number(provider.pick(json));
  if (!Number.isFinite(rate) || rate < MIN_PLAUSIBLE || rate > MAX_PLAUSIBLE) {
    throw new Error(`${provider.name} returned an implausible USD→MNT rate: ${rate}`);
  }
  return rate;
}

// Last successful live reading: { rate, at: Date }. Null until the first fetch
// or a hydrate from the settings table.
let live = null;
let hydrated = false;
let inflight = null;

async function readSetting(key) {
  const { rows } = await query('SELECT value, updated_at FROM settings WHERE key = $1', [key]);
  if (rows.length === 0) return null;
  const value = Number(rows[0].value);
  return Number.isFinite(value) ? { value, updatedAt: rows[0].updated_at } : null;
}

async function writeLive(rate) {
  await query(
    `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [LIVE_KEY, String(rate)]
  );
}

async function hydrate() {
  hydrated = true;
  try {
    const stored = await readSetting(LIVE_KEY);
    if (stored && !live) live = { rate: stored.value, at: stored.updatedAt };
  } catch (err) {
    console.error('Could not read the stored exchange rate:', err.message);
  }
}

async function fetchFromProvider(provider) {
  const res = await fetch(provider.url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${provider.name} responded ${res.status}`);
  return readProviderRate(provider, await res.json());
}

// One shared attempt per refresh, so a burst of storefront requests can't fan
// out into a burst of provider calls.
function refresh() {
  inflight =
    inflight ||
    (async () => {
      for (const provider of PROVIDERS) {
        try {
          const rate = await fetchFromProvider(provider);
          live = { rate, at: new Date() };
          await writeLive(rate).catch((err) =>
            console.error('Could not persist the exchange rate:', err.message)
          );
          return live;
        } catch (err) {
          console.error(`Exchange rate lookup failed via ${provider.name}:`, err.message);
        }
      }
      throw new Error('No exchange-rate provider was reachable');
    })().finally(() => {
      inflight = null;
    });
  return inflight;
}

async function snapshot() {
  const manual = await readSetting(MANUAL_KEY).catch(() => null);
  const manualRate = manual?.value ?? null;

  if (live) {
    return {
      mnt_rate: live.rate,
      mnt_rate_source: 'live',
      mnt_rate_updated_at: live.at,
      mnt_rate_stale: Date.now() - new Date(live.at).getTime() > TTL_MS,
      mnt_rate_manual: manualRate,
      updated_at: manual?.updatedAt ?? null,
    };
  }

  // Nothing live has ever landed: fall back to the admin's rate, and if there
  // isn't one either, say so rather than invent a number.
  return {
    mnt_rate: manualRate,
    mnt_rate_source: manualRate == null ? 'unavailable' : 'manual',
    mnt_rate_updated_at: manual?.updatedAt ?? null,
    mnt_rate_stale: false,
    mnt_rate_manual: manualRate,
    updated_at: manual?.updatedAt ?? null,
  };
}

/**
 * The rate the storefront should price with, plus where it came from.
 *
 * A current reading is served straight from memory. A stale one is served
 * immediately and refreshed in the background, so a slow provider never adds
 * latency to a shopper's page. Only a cold start — no reading at all — waits.
 */
export async function getRateSettings() {
  if (!hydrated) await hydrate();

  const current = live && Date.now() - new Date(live.at).getTime() < TTL_MS;
  if (!current) {
    const refreshing = refresh();
    // Nothing usable yet, so this request has to wait for the lookup; a failure
    // here is not fatal, snapshot() falls back to the admin rate.
    if (!live) await refreshing.catch(() => {});
    else refreshing.catch(() => {});
  }

  return snapshot();
}

// Test seam — drops the in-memory reading so a test starts from a cold cache.
export function __resetRateCache() {
  live = null;
  hydrated = false;
  inflight = null;
}
