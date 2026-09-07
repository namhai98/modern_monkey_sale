-- Phase 3: categories, product inventory fields, stock movement log
--   psql -U postgres -d modern_monkey_sale -f src/config/migrations/003_products_inventory.sql
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(60);
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_sku_key') THEN
    ALTER TABLE products ADD CONSTRAINT products_sku_key UNIQUE (sku);
  END IF;
END $$;

-- Backfill categories from the legacy free-text column, then link products.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'category'
  ) THEN
    INSERT INTO categories (name, slug)
    SELECT DISTINCT initcap(trim(category)),
           lower(regexp_replace(trim(category), '\s+', '-', 'g'))
    FROM products
    WHERE category IS NOT NULL AND trim(category) <> ''
    ON CONFLICT DO NOTHING;

    UPDATE products p SET category_id = c.id
    FROM categories c
    WHERE p.category_id IS NULL
      AND lower(trim(p.category)) = lower(c.name);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS stock_movements (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  delta INTEGER NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('sale', 'restock', 'adjustment', 'return')),
  reason TEXT,
  order_id INTEGER REFERENCES orders(id),
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product
  ON stock_movements (product_id, created_at DESC);

-- The legacy products.category text column is unused once the app is on Phase 3:
--   ALTER TABLE products DROP COLUMN IF EXISTS category;
