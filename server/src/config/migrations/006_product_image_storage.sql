-- Product image storage & optimisation: metadata columns for the WebP variant
-- pipeline. Existing rows keep their `url` (external / legacy) and keep working.
--   psql -U postgres -d modern_monkey_sale -f src/config/migrations/006_product_image_storage.sql
-- Safe to run more than once.

ALTER TABLE product_images ADD COLUMN IF NOT EXISTS storage_key VARCHAR(255);
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS sort_order INTEGER;
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS width INTEGER;
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS height INTEGER;
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS mime_type VARCHAR(50);
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS file_size INTEGER;
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- carry the legacy ordering column over
UPDATE product_images SET sort_order = COALESCE(sort_order, position, 0);
ALTER TABLE product_images ALTER COLUMN sort_order SET DEFAULT 0;
ALTER TABLE product_images ALTER COLUMN sort_order SET NOT NULL;

-- `url` becomes optional (new uploads reference object storage via storage_key)
ALTER TABLE product_images ALTER COLUMN url DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_images_sort ON product_images (product_id, sort_order);

-- `position` is now unused; drop it once the app has been redeployed:
--   ALTER TABLE product_images DROP COLUMN IF EXISTS position;
