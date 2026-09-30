import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../index.js';
import { pool } from '../config/db.js';
import { ensureTestDb, resetTestData } from '../test/setup.js';

before(() => ensureTestDb());
afterEach(() => resetTestData());
after(() => pool.end());

async function createCustomer() {
  const password = 'Sup3rSecret!';
  const password_hash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, is_active)
     VALUES ('Test Shopper', 'shopper@example.com', $1, 'customer', TRUE) RETURNING id`,
    [password_hash]
  );
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'shopper@example.com', password });
  return { id: rows[0].id, token: loginRes.body.token };
}

async function createProduct({ stock = 5, price = 100 } = {}) {
  const { rows } = await pool.query(
    `INSERT INTO products (name, price, stock, is_active) VALUES ($1, $2, $3, TRUE) RETURNING id`,
    ['Test Bag', price, stock]
  );
  return rows[0].id;
}

test('creating an order decrements stock by the ordered quantity', async () => {
  const customer = await createCustomer();
  const productId = await createProduct({ stock: 5 });

  const res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${customer.token}`)
    .send({
      items: [{ product_id: productId, quantity: 2 }],
      shipping_address: '123 Test St',
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.status, 'pending');

  const { rows } = await pool.query('SELECT stock FROM products WHERE id = $1', [productId]);
  assert.equal(rows[0].stock, 3);
});

test('an order that would oversell a product is rejected and stock is untouched', async () => {
  const customer = await createCustomer();
  const productId = await createProduct({ stock: 1 });

  const res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${customer.token}`)
    .send({
      items: [{ product_id: productId, quantity: 2 }],
      shipping_address: '123 Test St',
    });

  assert.equal(res.status, 409);
  assert.equal(res.body.code, 'INSUFFICIENT_STOCK');

  // Rejected inside the same transaction as the (never-committed) order row —
  // stock must be exactly what it started as, not partially decremented.
  const { rows } = await pool.query('SELECT stock FROM products WHERE id = $1', [productId]);
  assert.equal(rows[0].stock, 1);

  const orderCount = await pool.query('SELECT COUNT(*)::int AS n FROM orders');
  assert.equal(orderCount.rows[0].n, 0);
});

test('creating an order requires authentication', async () => {
  const productId = await createProduct({ stock: 5 });
  const res = await request(app)
    .post('/api/orders')
    .send({ items: [{ product_id: productId, quantity: 1 }], shipping_address: 'x' });
  assert.equal(res.status, 401);
});
