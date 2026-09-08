-- Admin-editable settings (key/value). First use: mnt_rate — how many Mongolian
-- tögrög per 1 USD, for the customer-facing MN price display.
--   psql -U postgres -d modern_monkey_sale -f src/config/migrations/009_settings.sql
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(64) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO settings (key, value) VALUES ('mnt_rate', '3450')
ON CONFLICT (key) DO NOTHING;
