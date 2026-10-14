-- Online payments (QPay). One row per invoice issued for an order; an order
-- normally has one, but a cancelled or expired invoice is replaced by a fresh
-- one, so this is not unique per order.
--   npm run db:migrate
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL DEFAULT 'qpay',
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
  -- Our reference (sent as sender_invoice_no) and QPay's invoice id.
  sender_invoice_no VARCHAR(45) NOT NULL UNIQUE,
  invoice_id VARCHAR(64) UNIQUE,
  -- What was asked, in tögrög, and the USD total + rate it was converted from,
  -- so a later rate change can never alter an invoice already issued.
  amount_mnt NUMERIC(14, 2) NOT NULL,
  amount_usd NUMERIC(10, 2) NOT NULL,
  mnt_rate NUMERIC(12, 4) NOT NULL,
  qr_text TEXT,
  qr_image TEXT,
  short_url VARCHAR(255),
  urls JSONB,
  -- Filled once QPay reports the money in.
  payment_id VARCHAR(64),
  paid_amount NUMERIC(14, 2),
  paid_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments (order_id, created_at DESC);
