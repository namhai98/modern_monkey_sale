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

async function createCustomer(email = 'saver@example.com') {
  const password = 'Sup3rSecret!';
  const password_hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role, is_active)
     VALUES ('Saver', $1, $2, 'customer', TRUE)`,
    [email, password_hash]
  );
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token;
}

async function createProduct(name = 'Saved Bag') {
  const { rows } = await pool.query(
    `INSERT INTO products (name, price, stock, is_active) VALUES ($1, 100, 5, TRUE) RETURNING id`,
    [name]
  );
  return rows[0].id;
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

test('the wishlist requires authentication', async () => {
  const res = await request(app).get('/api/wishlist');
  assert.equal(res.status, 401);
});

test('saving and removing a piece is idempotent', async () => {
  const token = await createCustomer();
  const productId = await createProduct();

  const first = await request(app).put(`/api/wishlist/${productId}`).set(auth(token));
  const again = await request(app).put(`/api/wishlist/${productId}`).set(auth(token));
  assert.equal(first.status, 200);
  assert.deepEqual(again.body.ids, [productId]);

  const removed = await request(app).delete(`/api/wishlist/${productId}`).set(auth(token));
  const removedAgain = await request(app).delete(`/api/wishlist/${productId}`).set(auth(token));
  assert.deepEqual(removed.body.ids, []);
  assert.equal(removedAgain.status, 200);

  const list = await request(app).get('/api/wishlist').set(auth(token));
  assert.deepEqual(list.body.ids, []);
});

test('saving an unknown product is a 404, a malformed id a 400', async () => {
  const token = await createCustomer();
  assert.equal((await request(app).put('/api/wishlist/999999').set(auth(token))).status, 404);
  assert.equal((await request(app).put('/api/wishlist/abc').set(auth(token))).status, 400);
});

test('merge folds a guest list in, skipping unknown and duplicate ids', async () => {
  const token = await createCustomer();
  const a = await createProduct('A');
  const b = await createProduct('B');
  await request(app).put(`/api/wishlist/${a}`).set(auth(token));

  const res = await request(app)
    .post('/api/wishlist/merge')
    .set(auth(token))
    .send({ ids: [a, b, b, 999999, 'x'] });

  assert.equal(res.status, 200);
  assert.deepEqual([...res.body.ids].sort((x, y) => x - y), [a, b].sort((x, y) => x - y));
});

test('one shopper never sees another shopper\'s saved pieces', async () => {
  const alice = await createCustomer('alice@example.com');
  const bob = await createCustomer('bob@example.com');
  const productId = await createProduct();
  await request(app).put(`/api/wishlist/${productId}`).set(auth(alice));

  const res = await request(app).get('/api/wishlist').set(auth(bob));
  assert.deepEqual(res.body.ids, []);
});
