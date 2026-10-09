import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../index.js';
import { pool } from '../config/db.js';
import { ensureTestDb, resetTestData } from '../test/setup.js';
import { adminNotifyRecipients, sendNewOrderNotice } from '../utils/orderEmail.js';

before(() => ensureTestDb());
afterEach(() => resetTestData());
after(() => pool.end());

async function createUser(role, email, name = 'Person') {
  const password = 'Sup3rSecret!';
  const password_hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role, is_active) VALUES ($1, $2, $3, $4, TRUE)`,
    [name, email, password_hash, role]
  );
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token;
}

async function createProduct({ name = 'Bag', price = 100, stock = 10, threshold = 0 } = {}) {
  const { rows } = await pool.query(
    `INSERT INTO products (name, price, stock, low_stock_threshold, is_active)
     VALUES ($1, $2, $3, $4, TRUE) RETURNING id`,
    [name, price, stock, threshold]
  );
  return rows[0].id;
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

async function placeOrder(token, productId, quantity = 1, address = '1 Test St') {
  const res = await request(app)
    .post('/api/orders')
    .set(auth(token))
    .send({ items: [{ product_id: productId, quantity }], shipping_address: address });
  assert.equal(res.status, 201);
  return res.body.id;
}

test('the dashboard is staff-only', async () => {
  const customer = await createUser('customer', 'c@example.com');
  assert.equal((await request(app).get('/api/dashboard')).status, 401);
  assert.equal((await request(app).get('/api/dashboard').set(auth(customer))).status, 403);
});

test('dashboard sales leave out cancelled orders and count today', async () => {
  const admin = await createUser('admin', 'a@example.com');
  const customer = await createUser('customer', 'c@example.com');
  const productId = await createProduct({ price: 100 });

  await placeOrder(customer, productId, 2); // $200, stays pending
  const cancelled = await placeOrder(customer, productId, 1);
  const cancel = await request(app).post(`/api/orders/${cancelled}/cancel`).set(auth(customer));
  assert.equal(cancel.status, 200);

  const res = await request(app).get('/api/dashboard').set(auth(admin));
  assert.equal(res.status, 200);
  assert.equal(res.body.sales.today.orders, 1);
  assert.equal(res.body.sales.today.revenue, 200);
  assert.equal(res.body.sales.month.revenue, 200);
  assert.equal(res.body.status_counts.pending, 1);
  assert.equal(res.body.status_counts.cancelled, 1);
  assert.equal(res.body.top_products[0].units, 2);
  assert.equal(res.body.recent_orders.length, 2);
});

test('low stock counts the sizes of a piece sold in sizes', async () => {
  const admin = await createUser('admin', 'a@example.com');
  // The products row says 50, but the sizes hold 2 in total — that is low.
  const sized = await createProduct({ name: 'Sized coat', stock: 50, threshold: 3 });
  await pool.query(
    `INSERT INTO product_variants (product_id, label, stock) VALUES ($1, 'S', 1), ($1, 'M', 1)`,
    [sized]
  );
  await createProduct({ name: 'Plenty', stock: 50, threshold: 3 });

  const dash = await request(app).get('/api/dashboard').set(auth(admin));
  assert.deepEqual(dash.body.low_stock.map((p) => p.name), ['Sized coat']);
  assert.equal(dash.body.low_stock[0].stock, 2);

  const list = await request(app).get('/api/products?low_stock=1&include_inactive=1').set(auth(admin));
  assert.deepEqual(list.body.items.map((p) => p.name), ['Sized coat']);
});

test('the CSV export is a BOM-prefixed file that honours the filters', async () => {
  const admin = await createUser('admin', 'a@example.com');
  const alice = await createUser('customer', 'alice@example.com', 'Алиса');
  const bob = await createUser('customer', 'bob@example.com', 'Bob');
  const productId = await createProduct({ price: 50 });
  await placeOrder(alice, productId, 1, '=HYPERLINK("x"), Улаанбаатар');
  await placeOrder(bob, productId, 3);

  const res = await request(app).get('/api/orders/export?search=alice').set(auth(admin));
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /text\/csv/);
  assert.match(res.headers['content-disposition'], /attachment; filename="orders-\d{4}-\d{2}-\d{2}\.csv"/);

  const body = res.text;
  assert.equal(body.charCodeAt(0), 0xfeff);
  const lines = body.slice(1).trim().split('\r\n');
  assert.equal(lines.length, 2); // header + Alice's order only
  assert.match(lines[0], /^Order,Placed \(Ulaanbaatar\),Customer/);
  assert.match(lines[1], /Алиса,alice@example\.com,pending,1,50\.00,/);
  // A formula-looking address is neutralised and quoted.
  assert.match(lines[1], /"'=HYPERLINK\(""x""\), Улаанбаатар"$/);
});

test('the CSV export is staff-only and not mistaken for an order id', async () => {
  const customer = await createUser('customer', 'c@example.com');
  const res = await request(app).get('/api/orders/export').set(auth(customer));
  assert.equal(res.status, 403);
});

test('a customer sees when their order moved, not who moved it or the note', async () => {
  const admin = await createUser('admin', 'a@example.com', 'Staff Name');
  const customer = await createUser('customer', 'c@example.com');
  const productId = await createProduct();
  const orderId = await placeOrder(customer, productId);

  const move = await request(app)
    .patch(`/api/orders/${orderId}/status`)
    .set(auth(admin))
    .send({ status: 'paid', note: 'internal: paid by bank transfer' });
  assert.equal(move.status, 200);

  const mine = await request(app).get(`/api/orders/${orderId}`).set(auth(customer));
  const paid = mine.body.status_history.find((h) => h.to_status === 'paid');
  assert.ok(paid.created_at);
  assert.equal(paid.note, undefined);
  assert.equal(paid.user, undefined);

  const staffView = await request(app).get(`/api/orders/${orderId}`).set(auth(admin));
  const staffPaid = staffView.body.status_history.find((h) => h.to_status === 'paid');
  assert.equal(staffPaid.note, 'internal: paid by bank transfer');
  assert.equal(staffPaid.user.name, 'Staff Name');
});

test('the new-order notice goes nowhere until ADMIN_NOTIFY_EMAIL is set', async () => {
  assert.deepEqual(adminNotifyRecipients({}), []);
  assert.deepEqual(adminNotifyRecipients({ ADMIN_NOTIFY_EMAIL: ' a@x.mn, ,b@x.mn ' }), ['a@x.mn', 'b@x.mn']);

  const saved = process.env.ADMIN_NOTIFY_EMAIL;
  delete process.env.ADMIN_NOTIFY_EMAIL;
  try {
    const out = await sendNewOrderNotice({ orderId: 1, customer: {}, items: [], total: 0 });
    assert.deepEqual(out, { skipped: true });
  } finally {
    if (saved !== undefined) process.env.ADMIN_NOTIFY_EMAIL = saved;
  }
});
