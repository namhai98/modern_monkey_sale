import { query } from '../config/db.js';
import { getRateSettings } from '../services/exchangeRate.js';

// Public — the storefront reads this to price the catalogue in tögrög.
// `mnt_rate` is the effective rate: the live feed when it answers, the
// admin-entered fallback when it doesn't.
export async function getSettings(req, res) {
  try {
    res.json(await getRateSettings());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
}

// The admin rate is no longer what shoppers normally see — it is the fallback
// used when no exchange-rate provider can be reached.
export async function updateSettings(req, res) {
  try {
    const rate = Number(req.body?.mnt_rate);
    if (!Number.isFinite(rate) || rate <= 0) {
      return res
        .status(400)
        .json({ error: 'mnt_rate must be a positive number', code: 'VALIDATION_ERROR' });
    }
    await query(
      `INSERT INTO settings (key, value, updated_at) VALUES ('mnt_rate', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [String(rate)]
    );
    res.json(await getRateSettings());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
}
