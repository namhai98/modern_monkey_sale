-- Size variants with per-size stock. Products with no variant rows behave
-- exactly as before (stock stays on the products row).
--   psql -U postgres -d modern_monkey_sale -f src/config/migrations/010_product_variants.sql
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS product_variants (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label VARCHAR(40) NOT NULL,
  sku VARCHAR(60) UNIQUE,
  stock INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (product_id, label)
);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants (product_id, sort_order);

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_id INTEGER
  REFERENCES product_variants(id) ON DELETE SET NULL;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_label VARCHAR(40);

ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS variant_id INTEGER
  REFERENCES product_variants(id) ON DELETE SET NULL;

-- Demo: give two apparel pieces a size run (only if they have none yet)
INSERT INTO product_variants (product_id, label, sku, stock, sort_order)
SELECT p.id, s.label, p.sku || '-' || s.label, s.stock, s.ord
FROM products p
CROSS JOIN (VALUES
  ('S', 6, 0), ('M', 10, 1), ('L', 8, 2), ('XL', 3, 3)
) AS s(label, stock, ord)
WHERE p.sku IN ('APP-KNIT-02', 'APP-COAT-01')
  AND NOT EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id);
