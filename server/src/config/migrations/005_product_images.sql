-- Phase: multiple images per product (up to 5, ordered).
--   psql -U postgres -d modern_monkey_sale -f src/config/migrations/005_product_images.sql
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS product_images (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images (product_id, position);

-- Carry the legacy single image over as the first image
INSERT INTO product_images (product_id, url, position)
SELECT p.id, p.image_url, 0
FROM products p
WHERE p.image_url IS NOT NULL AND p.image_url <> ''
  AND NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = p.id);
