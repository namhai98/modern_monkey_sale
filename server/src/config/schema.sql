-- Run this once against your database to create the initial schema
-- psql -U postgres -d modern_monkey_sale -f src/config/schema.sql

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'customer'
    CHECK (role IN ('customer', 'staff', 'manager', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Upgrading an existing database? Run src/config/migrations/001_auth_roles.sql
-- Create the first admin with:  npm run create-admin

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  image_url VARCHAR(500),
  category_id INTEGER REFERENCES categories(id),
  sku VARCHAR(60) UNIQUE,
  brand VARCHAR(120),
  gender VARCHAR(16) CHECK (gender IN ('women', 'men', 'unisex')),
  stock INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_images (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  storage_key VARCHAR(255),          -- object-storage prefix for the WebP variants
  url VARCHAR(500),                  -- legacy / external images (optional)
  sort_order INTEGER NOT NULL DEFAULT 0,
  width INTEGER,
  height INTEGER,
  mime_type VARCHAR(50),
  file_size INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_product_images_sort ON product_images (product_id, sort_order);

-- Upgrading an existing database? Run migrations 003, 005 and 006 in order.

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded')),
  total NUMERIC(10, 2) NOT NULL,
  shipping_address TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price NUMERIC(10, 2) NOT NULL,          -- final unit price paid
  original_price NUMERIC(10, 2),          -- unit price before any discount
  discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  discount_name VARCHAR(120),
  product_name VARCHAR(255)               -- snapshot: name at time of purchase
);

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

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  family_id VARCHAR(36) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  replaced_by VARCHAR(64),
  user_agent VARCHAR(255),
  ip VARCHAR(64),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens (family_id);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens (user_id);

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

-- Simple discount system (see migration 008)
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

-- Sample seed data — a small luxury demo catalogue (bags, watches, apparel)
INSERT INTO categories (name, slug) VALUES
  ('Bags', 'bags'),
  ('Watches', 'watches'),
  ('Apparel', 'apparel')
ON CONFLICT DO NOTHING;

INSERT INTO products (name, description, price, image_url, category_id, sku, stock, low_stock_threshold)
VALUES
  ('Structured Leather Tote',
   'A clean-lined tote cut from full-grain calfskin and finished by hand. Roomy enough for the day, quiet enough for the evening.',
   1290.00, 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1400&q=80',
   (SELECT id FROM categories WHERE slug = 'bags'), 'BAG-TOTE-01', 24, 4),
  ('Quilted Shoulder Bag',
   'Diamond-quilted lambskin with an aged-gold chain. Compact proportions, considered weight.',
   2150.00, 'https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=1400&q=80',
   (SELECT id FROM categories WHERE slug = 'bags'), 'BAG-QLT-02', 12, 3),
  ('Leather Card Holder',
   'Four card slots and a centre pocket in vegetable-tanned leather that patinas with use.',
   240.00, 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=1400&q=80',
   (SELECT id FROM categories WHERE slug = 'bags'), 'BAG-CARD-03', 60, 8),
  ('Automatic Chronograph',
   'A 40mm steel case, sapphire crystal and an in-house automatic movement visible through the caseback.',
   3450.00, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1400&q=80',
   (SELECT id FROM categories WHERE slug = 'watches'), 'WCH-CHR-01', 8, 2),
  ('Minimalist Dress Watch',
   'Slim 38mm profile, brushed silver dial, alligator strap. Made to disappear under a cuff.',
   1780.00, 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=1400&q=80',
   (SELECT id FROM categories WHERE slug = 'watches'), 'WCH-DRS-02', 15, 3),
  ('Cashmere Overcoat',
   'A double-faced cashmere coat with a soft shoulder and a below-the-knee line. Unlined, feather-light.',
   2890.00, 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=1400&q=80',
   (SELECT id FROM categories WHERE slug = 'apparel'), 'APP-COAT-01', 10, 2),
  ('Merino Roll-Neck',
   'Fine-gauge extra-fine merino knitted in Italy. A wardrobe constant in five quiet tones.',
   320.00, 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=1400&q=80',
   (SELECT id FROM categories WHERE slug = 'apparel'), 'APP-KNIT-02', 40, 6),
  ('Silk Twill Scarf',
   'A 90cm hand-rolled scarf printed in a house archive motif on heavyweight silk twill.',
   410.00, 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?auto=format&fit=crop&w=1400&q=80',
   (SELECT id FROM categories WHERE slug = 'apparel'), 'APP-SCF-03', 30, 5)
ON CONFLICT DO NOTHING;

INSERT INTO product_images (product_id, url, sort_order)
SELECT p.id, p.image_url, 0
FROM products p
WHERE p.image_url <> ''
  AND NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = p.id);

-- Demo brand + gender so the shop filters have something to show
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
