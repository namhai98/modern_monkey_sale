// Regenerate the demo catalogue: 3 categories x 20 products.
// Clears products + orders (keeps users). Re-runnable.
//   npm run seed:catalog
import 'dotenv/config';
import { pool } from '../config/db.js';
import { storage } from '../storage/index.js';

const IMG = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1400&q=80`;

const CATALOGUE = {
  Bags: {
    slug: 'bags',
    images: [
      '1584917865442-de89df76afd3',
      '1591561954557-26941169b49e',
      '1627123424574-724758594e93',
      '1548036328-c9fa89d128fa',
      '1594223274512-ad4803739b7c',
      '1553062407-98eeb64c6a62',
      '1566150905458-1bf1fc113f0d',
      '1590874103328-eac38a683ce7',
    ],
    names: [
      'Structured Leather Tote', 'Quilted Shoulder Bag', 'Leather Card Holder',
      'Saffiano Crossbody', 'Suede Bucket Bag', 'Canvas Weekender',
      'Nappa Leather Clutch', 'Pebbled Calfskin Satchel', 'Woven Raffia Basket',
      'Grained Leather Belt Bag', 'Top-Handle Mini Bag', 'Drawstring Bucket',
      'Slim Zip Wallet', 'Document Portfolio', 'Boxy Camera Bag',
      'Hobo Shoulder Bag', 'Foldover Clutch', 'Bowling Bag',
      'Chain-Strap Baguette', 'Traveller Holdall',
    ],
    priceFrom: 190, priceStep: 128,
    blurb: (n) => `The ${n.toLowerCase()} in full-grain calfskin, cut and saddle-stitched by hand. Made to soften and patina with the years.`,
  },
  Watches: {
    slug: 'watches',
    images: [
      '1523275335684-37898b6baf30',
      '1524592094714-0f0654e20314',
      '1547996160-81dfa63595aa',
      '1533139502658-0198f920d8e8',
      '1495856458515-0637185db551',
      '1508057198894-247b23fe5ade',
      '1587836374828-4dbafa94cf0e',
      '1622434641406-a158123450f9',
    ],
    names: [
      'Automatic Chronograph', 'Minimalist Dress Watch', 'Skeleton Openwork',
      'GMT Traveller', 'Moonphase Complication', 'Field Watch',
      'Dive Watch 300m', 'Ultra-Thin Quartz', 'Two-Hand Rose Gold',
      'Steel Sports Chronometer', 'Power-Reserve Automatic', 'Enamel Dial Classic',
      'Annual Calendar', 'Bauhaus Two-Hand', 'Bronze Diver',
      'Pilot Type-B', 'Sector Dial Revival', 'Grand Complication',
      'Everyday Automatic 38', 'World-Timer',
    ],
    priceFrom: 780, priceStep: 240,
    blurb: (n) => `A ${n.toLowerCase()} with a sapphire crystal and an in-house automatic movement, visible through the caseback. Two-year international warranty.`,
  },
  Apparel: {
    slug: 'apparel',
    images: [
      '1539533018447-63fcce2678e3',
      '1434389677669-e08b4cac3105',
      '1601924994987-69e26d50dc26',
      '1483985988355-763728e1935b',
      '1516762689617-e1cffcef479d',
      '1521572163474-6864f9cf17ab',
      '1487222477894-8943e31ef7b2',
      '1490481651871-ab68de25d43d',
    ],
    names: [
      'Cashmere Overcoat', 'Merino Roll-Neck', 'Silk Twill Scarf',
      'Double-Breasted Blazer', 'Pleated Wool Trousers', 'Oxford Cotton Shirt',
      'Suede Chelsea Boots', 'Bridle Leather Belt', 'Linen Shirt-Jacket',
      'Ribbed Knit Polo', 'Herringbone Field Coat', 'Cotton-Cashmere Crew',
      'Garment-Dyed Chinos', 'Brushed Flannel Shirt', 'Unstructured Sport Coat',
      'Loro Piana Wool Scarf', 'Pima Cotton Tee', 'Corduroy Overshirt',
      'Tailored Tuxedo Jacket', 'Cashmere Lounge Trousers',
    ],
    priceFrom: 150, priceStep: 165,
    blurb: (n) => `The ${n.toLowerCase()}, woven in Italy from carefully sourced fibres. Cut for a relaxed, timeless line. Dry clean only.`,
  },
};

async function main() {
  const client = await pool.connect();
  try {
    // Drop any uploaded image variants for the products we're about to wipe
    await storage.deletePrefix('products').catch((e) => console.warn('[seed] storage cleanup:', e.message));

    await client.query('BEGIN');
    // Wipe the shop (keep accounts + sessions)
    await client.query('DELETE FROM order_status_history');
    await client.query('DELETE FROM stock_movements');
    await client.query('DELETE FROM order_items');
    await client.query('DELETE FROM orders');
    await client.query('DELETE FROM product_images');
    await client.query('DELETE FROM products');
    await client.query('DELETE FROM categories');

    let totalProducts = 0;
    for (const [name, cfg] of Object.entries(CATALOGUE)) {
      const cat = await client.query(
        'INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING id',
        [name, cfg.slug]
      );
      const categoryId = cat.rows[0].id;
      const prefix = cfg.slug.slice(0, 3).toUpperCase();

      for (let i = 0; i < 20; i += 1) {
        const pname = cfg.names[i] || `${name} Piece ${i + 1}`;
        const price = cfg.priceFrom + cfg.priceStep * i + (i % 2 ? 0.5 : 0);
        const stock = [4, 60, 25, 8, 40, 15, 30, 6, 50, 12][i % 10] + (i % 3);
        const threshold = 5 + (i % 3);
        const sku = `${prefix}-${String(i + 1).padStart(3, '0')}`;

        // 4 distinct images per product, cycled from the category pool
        const gallery = [];
        for (let k = 0; k < 4; k += 1) {
          gallery.push(IMG(cfg.images[(i + k) % cfg.images.length]));
        }

        const ins = await client.query(
          `INSERT INTO products
             (name, description, price, image_url, category_id, sku, stock, low_stock_threshold)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
          [pname, cfg.blurb(pname), price.toFixed(2), gallery[0], categoryId, sku, stock, threshold]
        );
        const productId = ins.rows[0].id;
        for (let k = 0; k < gallery.length; k += 1) {
          await client.query(
            'INSERT INTO product_images (product_id, url, sort_order) VALUES ($1, $2, $3)',
            [productId, gallery[k], k]
          );
        }
        totalProducts += 1;
      }
    }

    await client.query('COMMIT');
    console.log(`Seeded ${totalProducts} products across ${Object.keys(CATALOGUE).length} categories.`);
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
