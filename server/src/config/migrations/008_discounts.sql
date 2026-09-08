-- Simple discount system: a Discount entity, an M:N link to products, and a
-- price snapshot on order_items so historical orders keep what was actually paid.
--   psql -U postgres -d modern_monkey_sale -f src/config/migrations/008_discounts.sql
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS discounts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  type VARCHAR(16) NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value NUMERIC(12, 2) NOT NULL CHECK (value > 0),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT discounts_dates_chk CHECK (end_date >= start_date),
  CONSTRAINT discounts_percent_chk CHECK (type <> 'percentage' OR value <= 100)
);

CREATE TABLE IF NOT EXISTS discount_products (
  discount_id INTEGER NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (discount_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_discount_products_product ON discount_products (product_id);
CREATE INDEX IF NOT EXISTS idx_discounts_active ON discounts (is_active, start_date, end_date);

-- Order line price snapshot (Step 16): `price` stays the final unit price paid.
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS original_price NUMERIC(10, 2);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS discount_name VARCHAR(120);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);

-- Backfill existing rows: no discount was applied, name from the product.
UPDATE order_items SET original_price = price WHERE original_price IS NULL;
UPDATE order_items i SET product_name = p.name
  FROM products p WHERE p.id = i.product_id AND i.product_name IS NULL;
