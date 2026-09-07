-- Upgrade an existing database from the is_admin boolean to role-based auth.
-- Safe to run more than once.
--   psql -U postgres -d modern_monkey_sale -f src/config/migrations/001_auth_roles.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'customer';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Carry existing admins over to the new column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_admin'
  ) THEN
    UPDATE users SET role = 'admin' WHERE is_admin = TRUE AND role <> 'admin';
  END IF;
END $$;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('customer', 'staff', 'manager', 'admin'));

-- Once the application no longer reads is_admin, drop it:
--   ALTER TABLE users DROP COLUMN IF EXISTS is_admin;
