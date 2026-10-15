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

async function login(role, email) {
  const password = 'Sup3rSecret!';
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, is_active) VALUES ($1, $2, $3, $4, TRUE) RETURNING id`,
    [role, email, await bcrypt.hash(password, 10), role]
  );
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return { id: rows[0].id, auth: { Authorization: `Bearer ${res.body.token}` } };
}

async function product(name = 'Delete Me') {
  const { rows } = await pool.query(
    `INSERT INTO products (name, price, stock, is_active) VALUES ($1, 100, 5, TRUE) RETURNING id`,
    [name]
  );
  return rows[0].id;
}

const count = async (sql, id) => (await pool.query(sql, [id])).rows[0].n;

test('a manager deletes a never-ordered product and everything hanging off it', async () => {
  const manager = await login('manager', 'manager@example.com');
  const id = await product();
  await pool.query(`INSERT INTO product_variants (product_id, label, stock) VALUES ($1, 'M', 2)`, [id]);
  await pool.query(
    `INSERT INTO stock_movements (product_id, delta, type, reason, user_id) VALUES ($1, 5, 'restock', 'initial', $2)`,
    [id, manager.id]
  );
  await pool.query(`INSERT INTO wishlist_items (user_id, product_id) VALUES ($1, $2)`, [manager.id, id]);

  const res = await request(app).delete(`/api/products/${id}`).set(manager.auth);
  assert.equal(res.status, 204);
  assert.equal(await count('SELECT COUNT(*)::int AS n FROM products WHERE id = $1', id), 0);
  assert.equal(await count('SELECT COUNT(*)::int AS n FROM product_variants WHERE product_id = $1', id), 0);
  assert.equal(await count('SELECT COUNT(*)::int AS n FROM stock_movements WHERE product_id = $1', id), 0);
  assert.equal(await count('SELECT COUNT(*)::int AS n FROM wishlist_items WHERE product_id = $1', id), 0);

  const again = await request(app).delete(`/api/products/${id}`).set(manager.auth);
  assert.equal(again.status, 404);
});

test('a product in a past order is refused, and stays', async () => {
  const manager = await login('manager', 'manager@example.com');
  const customer = await login('customer', 'buyer@example.com');
  const id = await product('Sold Once');
  const order = await request(app)
    .post('/api/orders')
    .set(customer.auth)
    .send({ items: [{ product_id: id, quantity: 1 }], shipping_address: 'UB' });
  assert.equal(order.status, 201);

  const res = await request(app).delete(`/api/products/${id}`).set(manager.auth);
  assert.equal(res.status, 409);
  assert.equal(res.body.code, 'PRODUCT_HAS_ORDERS');
  assert.equal(await count('SELECT COUNT(*)::int AS n FROM products WHERE id = $1', id), 1);
});

test('only managers and admins may delete', async () => {
  const staff = await login('staff', 'staff@example.com');
  const customer = await login('customer', 'buyer@example.com');
  const id = await product();
  assert.equal((await request(app).delete(`/api/products/${id}`).set(staff.auth)).status, 403);
  assert.equal((await request(app).delete(`/api/products/${id}`).set(customer.auth)).status, 403);
  assert.equal((await request(app).delete(`/api/products/${id}`)).status, 401);
  assert.equal(await count('SELECT COUNT(*)::int AS n FROM products WHERE id = $1', id), 1);
});
