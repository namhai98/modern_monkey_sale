-- Saved pieces (the heart). One row per user per product; a guest's list lives
-- in their browser and is merged in when they sign in.
--   npm run db:migrate
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS wishlist_items (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);
