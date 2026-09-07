-- Phase 4: order status workflow + audit trail
--   psql -U postgres -d modern_monkey_sale -f src/config/migrations/004_order_management.sql
-- Safe to run more than once.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
UPDATE orders SET status = 'pending'
WHERE status NOT IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded');
ALTER TABLE orders ALTER COLUMN status TYPE VARCHAR(20);
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'));

CREATE TABLE IF NOT EXISTS order_status_history (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status VARCHAR(20),
  to_status VARCHAR(20) NOT NULL,
  note TEXT,
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order
  ON order_status_history (order_id, created_at);

-- Give existing orders a baseline history row
INSERT INTO order_status_history (order_id, from_status, to_status, user_id, created_at)
SELECT o.id, NULL, o.status, o.user_id, o.created_at
FROM orders o
WHERE NOT EXISTS (SELECT 1 FROM order_status_history h WHERE h.order_id = o.id);
