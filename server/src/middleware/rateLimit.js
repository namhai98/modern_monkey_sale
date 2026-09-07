// Minimal fixed-window rate limiter kept in memory. Good enough for a single
// instance / Phase 1. Move to express-rate-limit backed by a shared store
// (Redis) before running more than one process.
export function rateLimit({
  windowMs = 15 * 60 * 1000,
  max = 30,
  message = 'Too many requests, please try again later',
} = {}) {
  const hits = new Map(); // ip -> { count, resetAt }

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now > entry.resetAt) hits.delete(key);
    }
  }, windowMs);
  sweep.unref();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    let entry = hits.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;

    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ error: message, code: 'RATE_LIMITED' });
    }
    next();
  };
}
