-- Footer newsletter signup — just captures an email address, no ESP
-- integration yet.
--   npm run db:migrate
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
