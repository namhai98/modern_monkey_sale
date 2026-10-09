import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../index.js';
import { pool } from '../config/db.js';
import { ensureTestDb, resetTestData } from '../test/setup.js';

// The schema seeds a sample catalogue; start from an empty one.
before(async () => {
  await ensureTestDb();
  await resetTestData();
});
afterEach(async () => {
  await resetTestData();
  await pool.query('TRUNCATE discount_products, discounts RESTART IDENTITY CASCADE');
  await pool.query("DELETE FROM brands WHERE slug LIKE 'tf-%'");
});
after(() => pool.end());

async function brand(name, slug) {
  const { rows } = await pool.query('INSERT INTO brands (name, slug) VALUES ($1, $2) RETURNING id', [name, slug]);
  return rows[0].id;
}

async function product(name, { price = 100, stock = 5, brandId = null } = {}) {
  const { rows } = await pool.query(
    `INSERT INTO products (name, price, stock, brand_id, is_active) VALUES ($1, $2, $3, $4, TRUE) RETURNING id`,
    [name, price, stock, brandId]
  );
  return rows[0].id;
}

async function discount(productId, percent) {
  const { rows } = await pool.query(
    `INSERT INTO discounts (name, type, value, start_date, end_date, is_active)
     VALUES ('Test', 'percentage', $1, CURRENT_DATE - 1, CURRENT_DATE + 1, TRUE) RETURNING id`,
    [percent]
  );
  await pool.query('INSERT INTO discount_products (discount_id, product_id) VALUES ($1, $2)', [rows[0].id, productId]);
}

const names = (res) => res.body.items.map((p) => p.name).sort();

test('several brands can be picked at once', async () => {
  const a = await brand('TF Aurele', 'tf-aurele');
  const b = await brand('TF Corvel', 'tf-corvel');
  const c = await brand('TF Halden', 'tf-halden');
  await product('A1', { brandId: a });
  await product('B1', { brandId: b });
  await product('C1', { brandId: c });

  const res = await request(app).get('/api/products?brand=tf-aurele,tf-halden');
  assert.deepEqual(names(res), ['A1', 'C1']);

  const facets = await request(app).get('/api/products/facets?brand=tf-aurele,tf-halden');
  // Every brand stays listed with its own count, so more can be added.
  assert.deepEqual(facets.body.brands.map((x) => [x.slug, x.count]), [['tf-aurele', 1], ['tf-corvel', 1], ['tf-halden', 1]]);
});

test('the price filter uses the price after discount', async () => {
  await product('Cheap', { price: 50 });
  const sale = await product('Was 300', { price: 300 });
  await discount(sale, 50); // pays 150
  await product('Dear', { price: 400 });

  const res = await request(app).get('/api/products?price_min=100&price_max=200');
  assert.deepEqual(names(res), ['Was 300']);

  const facets = await request(app).get('/api/products/facets?price_min=100&price_max=200');
  // The span ignores the price filter itself, so the shopper can widen it.
  assert.deepEqual(facets.body.price, { min: 50, max: 400 });
});

test('sorting by price follows the price after discount', async () => {
  await product('Plain 200', { price: 200 });
  const sale = await product('Sale 300', { price: 300 });
  await discount(sale, 50); // pays 150
  const res = await request(app).get('/api/products?sort=price&order=asc');
  assert.deepEqual(res.body.items.map((p) => p.name), ['Sale 300', 'Plain 200']);
});

test('in stock leaves out sold-out pieces, counting sizes', async () => {
  await product('In', { stock: 3 });
  await product('Out', { stock: 0 });
  const sized = await product('Sized out', { stock: 9 });
  await pool.query(`INSERT INTO product_variants (product_id, label, stock) VALUES ($1, 'M', 0)`, [sized]);

  const res = await request(app).get('/api/products?in_stock=1');
  assert.deepEqual(names(res), ['In']);
});

test('a malformed price is ignored rather than failing the listing', async () => {
  await product('Any');
  const res = await request(app).get('/api/products?price_min=abc&price_max=-5');
  assert.equal(res.status, 200);
  assert.deepEqual(names(res), ['Any']);
});
