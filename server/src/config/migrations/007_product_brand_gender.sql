-- Product brand + gender: two filterable catalogue fields.
--   psql -U postgres -d modern_monkey_sale -f src/config/migrations/007_product_brand_gender.sql
-- Safe to run more than once.

ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(120);
ALTER TABLE products ADD COLUMN IF NOT EXISTS gender VARCHAR(16);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_gender_check') THEN
    ALTER TABLE products
      ADD CONSTRAINT products_gender_check CHECK (gender IN ('women', 'men', 'unisex'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_brand ON products (brand);
CREATE INDEX IF NOT EXISTS idx_products_gender ON products (gender);

-- Backfill test brands + gender for existing rows (only fills blanks — re-runnable)
UPDATE products p
SET brand = CASE c.slug
    WHEN 'bags'    THEN (ARRAY['Aurele', 'Halden', 'Otero'])[(p.id % 3) + 1]
    WHEN 'watches' THEN (ARRAY['Corvel', 'Halden', 'Lindqvist'])[(p.id % 3) + 1]
    WHEN 'apparel' THEN (ARRAY['Aurele', 'Verne', 'Otero'])[(p.id % 3) + 1]
    ELSE 'Aurele' END
FROM categories c
WHERE c.id = p.category_id AND (p.brand IS NULL OR p.brand = '');

UPDATE products
SET gender = (ARRAY['women', 'men', 'unisex'])[(id % 3) + 1]
WHERE gender IS NULL;
