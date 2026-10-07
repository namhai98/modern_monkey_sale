// Add a 20-piece collection to the live catalogue — five each of bags,
// watches, apparel and accessories, under the house brands.
//
// Unlike seed:catalog (which wipes and regenerates the demo shop) this only
// ever adds: every row carries an MM- SKU, so the set is easy to find, refresh
// or remove, and nothing already in the shop is touched.
//
//   npm run seed:collection              add (or refresh) the 20 pieces
//   npm run seed:collection -- --remove  delete them again
//
// Re-runnable: ON CONFLICT on the unique sku updates the same rows.
//
// Images are hosted Unsplash photos rather than uploads: Render's free-plan
// disk is ephemeral, so an uploaded file would vanish on the next restart,
// and the existing catalogue already points at Unsplash the same way. Each
// photo was chosen to show that product alone, with no legible third-party
// logos, in the same dark, warm-lit art direction as the homepage.
import 'dotenv/config';
import { pool } from '../config/db.js';

const SKU_PREFIX = 'MM-';
const IMG = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1400&q=80`;
const SIZES = ['S', 'M', 'L', 'XL'];

// [sku, category, brand, gender, name, priceUSD, stock, unsplashId, description]
// Apparel stock is per size (split across SIZES); everything else is a count.
const PIECES = [
  ['MM-001', 'bags', 'verne', 'women', 'Croc-Embossed Top-Handle Bag', 1480, 8, '1546241183-0ed3f8a4a824',
    'Black calfskin embossed with a croc grain on a structured frame, with twin rolled handles and a zipped top.'],
  ['MM-002', 'bags', 'otero', 'women', 'Cognac Leather Satchel', 1190, 6, '1602082430164-0c1927ddecb2',
    'Polished cognac leather on a rigid frame, with a single top handle, a turn-lock flap and brushed-gold hardware.'],
  ['MM-003', 'bags', 'halden', 'unisex', 'Black Leather Box Bag', 540, 18, '1626875959581-bab0aca594d2',
    'A squared box bag in glossed black leather, with a wraparound zip, a rolled top handle and a detachable strap.'],
  ['MM-004', 'bags', 'aurele', 'women', 'Black Leather Bucket Bag', 760, 10, '1702326626601-74d2e86922b4',
    'Smooth black leather with contrast saddle stitching, a brass ring fitting and an adjustable shoulder strap.'],
  ['MM-005', 'bags', 'verne', 'women', 'Black Leather Mini Bowling Bag', 890, 5, '1664187284276-2f3254cdc7dc',
    'A compact dome-shaped bag in black leather, with twin top handles, a gold-tone zip and a long crossbody strap.'],

  ['MM-006', 'watches', 'halden', 'men', 'Steel Diver Automatic 40', 2350, 4, '1610889706547-54773e7cd71f',
    'A 40 mm brushed-steel case on a steel bracelet, a black dial under a unidirectional bezel and a self-winding movement.'],
  ['MM-007', 'watches', 'lindqvist', 'men', 'Black Dial Pilot Watch', 1960, 6, '1618960507963-9d2d4562c1b4',
    'Oversized luminous numerals on a matte black dial, a polished steel case and a stitched brown calfskin strap.'],
  ['MM-008', 'watches', 'lindqvist', 'unisex', 'Midnight Minimalist 38', 1420, 7, '1585679212498-ef63dfb0f58d',
    'A 38 mm all-black case and dial, rose-gold hands and a small-seconds sub-dial — nothing more than it needs.'],
  ['MM-009', 'watches', 'otero', 'men', 'Olive NATO Field Chronograph', 690, 14, '1617265860128-e23ad88cf98d',
    'A black field chronograph on an olive woven NATO strap, with a 60-minute scale and 100 m water resistance.'],
  ['MM-010', 'watches', 'halden', 'men', 'Rose Gold Bracelet Watch 41', 2780, 3, '1772949399823-dcd1678fcce7',
    'A 41 mm octagonal case in rose-gold-tone steel, a textured bezel and an integrated link bracelet.'],

  ['MM-011', 'apparel', 'aurele', 'men', 'Rust Suede Trucker Jacket', 1380, 12, '1610904497162-f9faef9a8e20',
    'Soft rust suede with a spread collar, a snap front and chest pockets, lined in cotton twill.'],
  ['MM-012', 'apparel', 'halden', 'unisex', 'Leather Biker Jacket', 1650, 10, '1521223890158-f9f7c3d5d504',
    'Black lambskin cut in a classic asymmetric biker silhouette, with silver-tone zips and a belted hem.'],
  ['MM-013', 'apparel', 'verne', 'men', 'Midnight Cotton Shirt', 210, 24, '1651390216692-c9096058583e',
    'A navy cotton shirt with a concealed placket and contrast piping — sharp for evening, easy for every day.'],
  ['MM-014', 'apparel', 'aurele', 'women', 'Black Sleeveless Midi Dress', 340, 16, '1582851992827-c717833a234d',
    'A sleeveless black midi in fluid crepe, with a round neck, a gathered waist and a softly flared skirt.'],
  ['MM-015', 'apparel', 'lindqvist', 'men', 'Navy Two-Piece Suit', 1890, 8, '1519085360753-af0119f7cbe7',
    'A two-button suit in Italian wool, half-canvassed, with slim flat-front trousers.'],

  ['MM-016', 'accessories', 'otero', 'unisex', 'Round Gold-Frame Sunglasses', 380, 15, '1585592695399-b1bab1d46a38',
    'Lightweight gold-tone metal frames with round tinted lenses offering full UV400 protection.'],
  ['MM-017', 'accessories', 'halden', 'men', 'Black Leather Belt 3.5 cm', 260, 20, '1590771976428-7af51cb3c575',
    'Full-grain black leather, 3.5 cm wide, with contrast edge stitching and a polished steel buckle.'],
  ['MM-018', 'accessories', 'lindqvist', 'men', 'Bifold Leather Wallet', 220, 22, '1637169797848-12431f1d355c',
    'A slim bifold in grained tan calfskin with six card slots and a full-length note compartment.'],
  ['MM-019', 'accessories', 'aurele', 'women', 'Gold Chain Bracelet', 1240, 5, '1633810542706-90e5ff7557be',
    'Hand-finished oval links in gold-plated sterling silver, closed with a secure lobster clasp.'],
  ['MM-020', 'accessories', 'verne', 'women', 'Wide-Brim Wool Fedora', 290, 9, '1657165746478-48ed8d9cffbd',
    'A wide-brim fedora in black wool felt with a grosgrain band — shapes to its wearer over time.'],
];

// Split an apparel piece's stock across sizes, heaviest in M/L.
function sizeStock(total) {
  const weights = [0.2, 0.3, 0.3, 0.2];
  const out = weights.map((w) => Math.floor(total * w));
  out[1] += total - out.reduce((a, b) => a + b, 0);
  return out;
}

async function remove(client) {
  const { rows } = await client.query('SELECT id FROM products WHERE sku LIKE $1', [`${SKU_PREFIX}%`]);
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return 0;
  // A piece that reached an order is part of someone's history — leave it.
  const { rows: used } = await client.query(
    'SELECT DISTINCT product_id FROM order_items WHERE product_id = ANY($1)',
    [ids]
  );
  const usedIds = new Set(used.map((r) => r.product_id));
  const free = ids.filter((id) => !usedIds.has(id));
  if (usedIds.size > 0) console.warn(`[seed:collection] ${usedIds.size} piece(s) appear in orders and were kept.`);
  if (free.length === 0) return 0;
  await client.query('DELETE FROM stock_movements WHERE product_id = ANY($1)', [free]);
  await client.query('DELETE FROM product_variants WHERE product_id = ANY($1)', [free]);
  await client.query('DELETE FROM product_images WHERE product_id = ANY($1)', [free]);
  await client.query('DELETE FROM products WHERE id = ANY($1)', [free]);
  return free.length;
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (process.argv.includes('--remove')) {
      const n = await remove(client);
      await client.query('COMMIT');
      console.log(`[seed:collection] removed ${n} piece(s)`);
      return;
    }

    const { rows: cats } = await client.query('SELECT id, slug FROM categories');
    const { rows: brands } = await client.query('SELECT id, slug FROM brands');
    const catId = Object.fromEntries(cats.map((c) => [c.slug, c.id]));
    const brandId = Object.fromEntries(brands.map((b) => [b.slug, b.id]));

    let written = 0;
    const skipped = [];
    for (const [sku, cat, brand, gender, name, price, stock, photo, description] of PIECES) {
      if (!catId[cat]) {
        skipped.push(`${sku} (no "${cat}" category)`);
        continue;
      }
      if (!brandId[brand]) console.warn(`[seed:collection] ${sku}: brand "${brand}" not found — saved without a brand`);

      const apparel = cat === 'apparel';
      const url = IMG(photo);
      const { rows } = await client.query(
        `INSERT INTO products
           (name, description, price, image_url, category_id, sku, stock,
            low_stock_threshold, brand_id, gender, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true)
         ON CONFLICT (sku) DO UPDATE SET
           name = EXCLUDED.name, description = EXCLUDED.description,
           price = EXCLUDED.price, image_url = EXCLUDED.image_url,
           category_id = EXCLUDED.category_id, stock = EXCLUDED.stock,
           low_stock_threshold = EXCLUDED.low_stock_threshold,
           brand_id = EXCLUDED.brand_id, gender = EXCLUDED.gender,
           is_active = true, updated_at = NOW()
         RETURNING id`,
        [name, description, price, url, catId[cat], sku, stock, apparel ? 2 : 3, brandId[brand] ?? null, gender]
      );
      const productId = rows[0].id;

      // Rewrite rather than append, so a re-run never doubles the gallery.
      await client.query('DELETE FROM product_images WHERE product_id = $1', [productId]);
      await client.query(
        'INSERT INTO product_images (product_id, url, sort_order) VALUES ($1, $2, 0)',
        [productId, url]
      );

      await client.query('DELETE FROM product_variants WHERE product_id = $1', [productId]);
      if (apparel) {
        const perSize = sizeStock(stock);
        for (let k = 0; k < SIZES.length; k += 1) {
          await client.query(
            `INSERT INTO product_variants (product_id, label, sku, stock, sort_order)
             VALUES ($1, $2, $3, $4, $5)`,
            [productId, SIZES[k], `${sku}-${SIZES[k]}`, perSize[k], k]
          );
        }
      }
      written += 1;
    }

    await client.query('COMMIT');
    console.log(`[seed:collection] wrote ${written} piece(s)`);
    if (skipped.length) console.warn(`[seed:collection] skipped: ${skipped.join(', ')}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[seed:collection] failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
