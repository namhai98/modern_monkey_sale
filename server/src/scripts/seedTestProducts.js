// Add 50 test products to the existing catalogue.
//
// Deliberately NOT seed:catalog, which wipes products, categories AND orders to
// regenerate the demo shop. This one only ever adds: every row it writes carries
// a TEST- SKU, so the set is trivial to find, refresh or remove, and nothing
// already in the shop is touched.
//
//   npm run seed:test            add (or refresh) the 50
//   npm run seed:test -- --remove   delete them again
//
// Re-runnable: ON CONFLICT on the unique sku means a second run updates the
// same 50 rows rather than erroring or duplicating.
import 'dotenv/config';
import { pool } from '../config/db.js';

const COUNT = 50;
const SKU_PREFIX = 'TEST-';

const IMG = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1400&q=80`;

// The same Unsplash pools the demo catalogue draws on, so test rows sit beside
// the real ones without looking obviously different in a grid.
const POOLS = {
  bags: [
    '1584917865442-de89df76afd3', '1591561954557-26941169b49e', '1627123424574-724758594e93',
    '1548036328-c9fa89d128fa', '1594223274512-ad4803739b7c', '1553062407-98eeb64c6a62',
    '1566150905458-1bf1fc113f0d', '1590874103328-eac38a683ce7',
  ],
  watches: [
    '1523275335684-37898b6baf30', '1524592094714-0f0654e20314', '1547996160-81dfa63595aa',
    '1533139502658-0198f920d8e8', '1495856458515-0637185db551', '1508057198894-247b23fe5ade',
    '1587836374828-4dbafa94cf0e', '1622434641406-a158123450f9',
  ],
  apparel: [
    '1539533018447-63fcce2678e3', '1434389677669-e08b4cac3105', '1601924994987-69e26d50dc26',
    '1483985988355-763728e1935b', '1516762689617-e1cffcef479d', '1521572163474-6864f9cf17ab',
    '1487222477894-8943e31ef7b2', '1490481651871-ab68de25d43d',
  ],
};

const NAMES = {
  bags: [
    'Test Leather Duffle', 'Test Envelope Clutch', 'Test Rolltop Backpack',
    'Test Micro Shoulder Bag', 'Test Vanity Case', 'Test Saddle Bag',
    'Test Tote in Grained Calf', 'Test Zip-Around Wallet', 'Test Bucket in Suede',
    'Test Attaché Case', 'Test Sling in Nylon', 'Test Hatbox Bag',
    'Test Passport Sleeve', 'Test Garment Carrier', 'Test Coin Purse',
    'Test Trunk Mini', 'Test Messenger in Bridle',
  ],
  watches: [
    'Test Chronograph 41', 'Test Perpetual Calendar', 'Test Dive Automatic',
    'Test Rectangular Dress', 'Test Regulator Dial', 'Test Jumping Hour',
    'Test Travel GMT', 'Test Skeleton Tourbillon', 'Test Bronze Field',
    'Test Quartz Everyday', 'Test Chronometer 39', 'Test Monopusher',
    'Test Enamel Sector', 'Test Power Reserve 40', 'Test Titanium Sport',
    'Test Small Seconds',
  ],
  apparel: [
    'Test Cashmere Cardigan', 'Test Wool Topcoat', 'Test Silk Blouse',
    'Test Tailored Trousers', 'Test Cotton Oxford', 'Test Knit Waistcoat',
    'Test Shearling Jacket', 'Test Pleated Skirt', 'Test Linen Suit',
    'Test Cashmere Scarf', 'Test Poplin Shirt-Dress', 'Test Quilted Gilet',
    'Test Jersey Roll-Neck', 'Test Corduroy Trousers', 'Test Trench Coat',
    'Test Merino Crewneck', 'Test Velvet Dinner Jacket',
  ],
};

const BLURB = {
  bags: (n) => `${n} — a test piece in full-grain calfskin, saddle-stitched by hand. Seeded for QA; not a real product.`,
  watches: (n) => `${n} — a test piece with sapphire crystal and an automatic movement. Seeded for QA; not a real product.`,
  apparel: (n) => `${n} — a test piece woven from carefully sourced fibres. Seeded for QA; not a real product.`,
};

// Apparel is the one family the storefront shows a size selector for, so some
// of it gets variants — otherwise that path never sees test data.
const SIZES = ['XS', 'S', 'M', 'L', 'XL'];

// Prices span $45–$2,400 on purpose: wide enough that the tögrög conversion and
// its round-down-to-the-nearest-thousand rule are visible at both ends.
function priceFor(i) {
  const ladder = [45, 89, 129, 175, 240, 320, 415, 530, 680, 845, 1040, 1280, 1560, 1890, 2400];
  const base = ladder[i % ladder.length];
  return (base + (i % 4) * 7.5).toFixed(2);
}

// A deliberate spread of stock states: sold out, low, healthy — so the badges
// and the guarded-decrement path all have something to act on.
function stockFor(i) {
  if (i % 11 === 0) return 0; // sold out
  if (i % 7 === 0) return 2; // below threshold
  return [6, 14, 28, 45, 9, 60, 33, 18][i % 8];
}

async function remove(client) {
  const { rows } = await client.query(
    `SELECT id FROM products WHERE sku LIKE $1`,
    [`${SKU_PREFIX}%`]
  );
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return 0;

  // Refuse to delete anything a customer has actually ordered — a test SKU that
  // reached an order is part of someone's history now.
  const { rows: used } = await client.query(
    'SELECT DISTINCT product_id FROM order_items WHERE product_id = ANY($1)',
    [ids]
  );
  const usedIds = new Set(used.map((r) => r.product_id));
  const free = ids.filter((id) => !usedIds.has(id));
  if (usedIds.size > 0) {
    console.warn(
      `[seed:test] ${usedIds.size} test product(s) appear in orders and were left in place.`
    );
  }
  if (free.length === 0) return 0;

  await client.query('DELETE FROM stock_movements WHERE product_id = ANY($1)', [free]);
  await client.query('DELETE FROM product_variants WHERE product_id = ANY($1)', [free]);
  await client.query('DELETE FROM product_images WHERE product_id = ANY($1)', [free]);
  await client.query('DELETE FROM products WHERE id = ANY($1)', [free]);
  return free.length;
}

async function main() {
  const removing = process.argv.includes('--remove');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (removing) {
      const n = await remove(client);
      await client.query('COMMIT');
      console.log(`Removed ${n} test product(s).`);
      return;
    }

    // Attach to the real categories only — never to the stray test1/test2 ones.
    const { rows: cats } = await client.query(
      `SELECT id, slug FROM categories WHERE slug = ANY($1)`,
      [['bags', 'watches', 'apparel']]
    );
    if (cats.length === 0) {
      throw new Error('No bags/watches/apparel categories found — run npm run seed:catalog first.');
    }
    const { rows: brands } = await client.query('SELECT id FROM brands ORDER BY id');
    if (brands.length === 0) throw new Error('No brands found — seed brands first.');

    let written = 0;
    for (let i = 0; i < COUNT; i += 1) {
      const cat = cats[i % cats.length];
      const pool_ = POOLS[cat.slug];
      const names = NAMES[cat.slug];
      const name = `${names[Math.floor(i / cats.length) % names.length]} ${String(i + 1).padStart(2, '0')}`;
      const sku = `${SKU_PREFIX}${String(i + 1).padStart(3, '0')}`;
      const brandId = brands[i % brands.length].id;
      const gender = ['women', 'men', 'unisex'][i % 3];
      const stock = stockFor(i);

      const gallery = [];
      for (let k = 0; k < 4; k += 1) gallery.push(IMG(pool_[(i + k) % pool_.length]));

      const { rows } = await client.query(
        `INSERT INTO products
           (name, description, price, image_url, category_id, sku, stock,
            low_stock_threshold, brand_id, gender, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true)
         ON CONFLICT (sku) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           price = EXCLUDED.price,
           image_url = EXCLUDED.image_url,
           category_id = EXCLUDED.category_id,
           stock = EXCLUDED.stock,
           low_stock_threshold = EXCLUDED.low_stock_threshold,
           brand_id = EXCLUDED.brand_id,
           gender = EXCLUDED.gender,
           updated_at = NOW()
         RETURNING id`,
        [
          name,
          BLURB[cat.slug](name),
          priceFor(i),
          gallery[0],
          cat.id,
          sku,
          stock,
          4,
          brandId,
          gender,
        ]
      );
      const productId = rows[0].id;

      // Rewrite the gallery rather than appending to it, so a re-run does not
      // leave a product with eight images.
      await client.query('DELETE FROM product_images WHERE product_id = $1', [productId]);
      for (let k = 0; k < gallery.length; k += 1) {
        await client.query(
          'INSERT INTO product_images (product_id, url, sort_order) VALUES ($1,$2,$3)',
          [productId, gallery[k], k]
        );
      }

      // Sizes for roughly half the apparel, so both the with- and without-
      // variant paths on the product page have test data.
      await client.query('DELETE FROM product_variants WHERE product_id = $1', [productId]);
      if (cat.slug === 'apparel' && i % 2 === 0) {
        for (let k = 0; k < SIZES.length; k += 1) {
          await client.query(
            `INSERT INTO product_variants (product_id, label, sku, stock, sort_order)
             VALUES ($1,$2,$3,$4,$5)`,
            [productId, SIZES[k], `${sku}-${SIZES[k]}`, k === 0 ? 0 : 3 + k * 2, k]
          );
        }
      }

      written += 1;
    }

    await client.query('COMMIT');
    console.log(`Seeded ${written} test products (SKU ${SKU_PREFIX}001…${SKU_PREFIX}${String(COUNT).padStart(3, '0')}).`);
    console.log('Remove them again with: npm run seed:test -- --remove');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
