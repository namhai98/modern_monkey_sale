import { query } from '../config/db.js';
import { normalizeEmail, isValidEmail } from '../utils/validators.js';

export async function subscribe(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'A valid email is required', code: 'VALIDATION_ERROR' });
    }

    // ON CONFLICT DO NOTHING rather than reporting a conflict: an already-
    // subscribed address should look identical to a new one to the caller.
    await query(
      'INSERT INTO newsletter_subscribers (email) VALUES ($1) ON CONFLICT (email) DO NOTHING',
      [email]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
}
