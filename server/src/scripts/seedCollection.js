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
// photo was chosen to show that product alone, with no third-party logos.
import 'dotenv/config';
import { pool } from '../config/db.js';

const SKU_PREFIX = 'MM-';
const IMG = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1400&q=80`;
const SIZES = ['S', 'M', 'L', 'XL'];

// [sku, category, brand, gender, name, priceUSD, stock, unsplashId, description]
// Apparel stock is per size (split across SIZES); everything else is a count.
const PIECES = [
  ['MM-001', 'bags', 'verne', 'women', 'Botanical Print Top-Handle Bag', 1480, 8, '1591561954557-26941169b49e',
    'A structured top-handle bag in printed calfskin, with a turn-lock closure and a detachable shoulder strap.'],
  ['MM-002', 'bags', 'otero', 'women', 'Teal Leather Satchel', 1190, 6, '1594223274512-ad4803739b7c',
    'Smooth teal leather on a rigid frame, lined in suede, with a single top handle and brushed-gold hardware.'],
  ['MM-003', 'bags', 'halden', 'unisex', 'Nylon City Backpack', 540, 18, '1553062407-98eeb64c6a62',
    'Water-resistant nylon with leather trims, a padded laptop sleeve and a zipped front pocket for everyday carry.'],
  ['MM-004', 'bags', 'aurele', 'women', 'Blush Chevron Crossbody', 760, 10, '1566150905458-1bf1fc113f0d',
    'A compact crossbody in blush leather with a chevron flap panel and an adjustable chain-and-leather strap.'],
  ['MM-005', 'bags', 'verne', 'women', 'Woven Leather Basket Bag', 890, 5, '1590874103328-eac38a683ce7',
    'Hand-woven rattan wrapped in tan leather, with a rolled top handle — a summer bag built to last seasons.'],

  ['MM-006', 'watches', 'halden', 'men', 'Steel Field Automatic 40', 2350, 4, '1547996160-81dfa63595aa',
    'A 40 mm brushed-steel case, sapphire crystal and a self-winding movement with a 42-hour power reserve.'],
  ['MM-007', 'watches', 'lindqvist', 'men', 'Sunset Dial Chronograph', 1960, 6, '1533139502658-0198f920d8e8',
    'A two-register chronograph on a tan calfskin strap, with a deep graphite dial and luminous hands.'],
  ['MM-008', 'watches', 'lindqvist', 'unisex', 'Explorer Leather-Strap 38', 1420, 7, '1495856458515-0637185db551',
    'A 38 mm everyday watch with a matte black dial, arabic numerals and a quick-release leather strap.'],
  ['MM-009', 'watches', 'otero', 'men', 'Olive NATO Field Watch', 690, 14, '1508057198894-247b23fe5ade',
    'A military-inspired field watch on an olive NATO strap, with a gilt-accented dial and 100 m water resistance.'],
  ['MM-010', 'watches', 'halden', 'men', 'Bronze Diver 42', 2780, 3, '1622434641406-a158123450f9',
    'A 42 mm bronze case that develops its own patina, a unidirectional bezel and 300 m water resistance.'],

  ['MM-011', 'apparel', 'aurele', 'men', 'Suede Bomber Jacket', 1380, 12, '1591047139829-d91aecb6caea',
    'Soft rust suede with rib-knit cuffs and hem, a two-way zip and a quilted satin lining.'],
  ['MM-012', 'apparel', 'halden', 'unisex', 'Leather Biker Jacket', 1650, 10, '1551028719-00167b16eac5',
    'Black lambskin cut in a classic asymmetric biker silhouette, with silver-tone zips and a belted hem.'],
  ['MM-013', 'apparel', 'verne', 'men', 'Chambray Button-Down Shirt', 210, 24, '1596755094514-f87e34085b2c',
    'A soft washed chambray with a button-down collar, mother-of-pearl buttons and a relaxed, easy fit.'],
  ['MM-014', 'apparel', 'aurele', 'women', 'Chambray Shirt-Dress', 340, 16, '1591369822096-ffd140ec948f',
    'A light chambray shirt-dress with a full button front, short sleeves and a gently flared skirt.'],
  ['MM-015', 'apparel', 'lindqvist', 'men', 'Navy Two-Piece Suit', 1890, 8, '1617137968427-85924c800a22',
    'A two-button suit in Italian wool, half-canvassed, with slim flat-front trousers.'],

  ['MM-016', 'accessories', 'otero', 'unisex', 'Round Gold-Frame Sunglasses', 380, 15, '1511499767150-a48a237f0083',
    'Lightweight gold-tone metal frames with round tinted lenses offering full UV400 protection.'],
  ['MM-017', 'accessories', 'halden', 'men', 'Tan Leather Belt 3.5 cm', 260, 20, '1624222247344-550fb60583dc',
    'Vegetable-tanned full-grain leather, 3.5 cm wide, with a solid brass roller buckle.'],
  ['MM-018', 'accessories', 'lindqvist', 'men', 'Bifold Leather Wallet', 220, 22, '1606503825008-909a67e63c3d',
    'A slim bifold in grained calfskin with six card slots and a full-length note compartment.'],
  ['MM-019', 'accessories', 'aurele', 'women', 'Gold Tennis Bracelet', 1240, 5, '1611591437281-460bfbe1220a',
    'A line of hand-set crystals in a gold-plated setting, finished with a secure box clasp.'],
  ['MM-020', 'accessories', 'verne', 'women', 'Wool Felt Fedora', 290, 9, '1514327605112-b887c0e61c0a',
    'A wide-brim fedora in pure wool felt with a grosgrain band — shapes to its wearer over time.'],
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
