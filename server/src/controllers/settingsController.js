import { query } from '../config/db.js';

async function readRate() {
  const { rows } = await query(
    "SELECT value, updated_at FROM settings WHERE key = 'mnt_rate'"
  );
  if (rows.length === 0) return { mnt_rate: null, updated_at: null };
  return { mnt_rate: Number(rows[0].value), updated_at: rows[0].updated_at };
}

// Public — the storefront reads this to show MN prices in tögrög.
export async function getSettings(req, res) {
  try {
    res.json(await readRate());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
}

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
    res.json(await readRate());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
}
