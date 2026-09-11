-- Social sign-in (Google / Facebook).
--   psql -U postgres -d modern_monkey_sale -f src/config/migrations/012_oauth_identities.sql
--
-- One row per linked provider account, so a single user can have a password
-- AND Google AND Facebook attached to the same order history. The provider's
-- own account id is the join key — never the email, which users can change.

CREATE TABLE IF NOT EXISTS user_identities (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL,
  provider_user_id VARCHAR(191) NOT NULL,
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (provider, provider_user_id)
);

ALTER TABLE user_identities DROP CONSTRAINT IF EXISTS user_identities_provider_check;
ALTER TABLE user_identities ADD CONSTRAINT user_identities_provider_check
  CHECK (provider IN ('google', 'facebook'));

CREATE INDEX IF NOT EXISTS idx_user_identities_user ON user_identities (user_id);

-- An account created through Google or Facebook has no password. Existing
-- password accounts are untouched; the column simply stops being mandatory.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
