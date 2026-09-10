-- Brand registry: a real `brands` table (mirrors `categories`), so brand
-- becomes a managed list instead of free-typed text on each product.
--   psql -U postgres -d modern_monkey_sale -f src/config/migrations/011_brands.sql
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS brands (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  slug VARCHAR(140) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Register every brand name already in use on products (existing free text).
INSERT INTO brands (name, slug)
SELECT DISTINCT p.brand,
       lower(regexp_replace(regexp_replace(trim(p.brand), '[^a-zA-Z0-9]+', '-', 'g'), '^-+|-+$', '', 'g'))
FROM products p
WHERE p.brand IS NOT NULL AND p.brand <> ''
ON CONFLICT (name) DO NOTHING;

ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_id INTEGER REFERENCES brands(id);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products (brand_id);

-- Point existing products at their matching brand row (only fills blanks — re-runnable).
UPDATE products p
SET brand_id = b.id
FROM brands b
WHERE b.name = p.brand AND p.brand_id IS NULL;

-- The old free-text `brand` column is superseded by `brand_id` and no longer
-- written to by the app; left in place (unused) rather than dropped, so no
-- data is lost if anything still reads it.
