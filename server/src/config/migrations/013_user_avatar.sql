-- Profile avatar: a storage_key pointing at the same object-storage pipeline
-- product images use (see 006_product_image_storage.sql). NULL means no
-- avatar has been uploaded — the client shows its "no image" placeholder.
--   psql -U postgres -d modern_monkey_sale -f src/config/migrations/013_user_avatar.sql
-- Safe to run more than once.

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_key VARCHAR(255);
