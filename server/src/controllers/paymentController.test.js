import { test, before, after, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../index.js';
import { pool } from '../config/db.js';
import { ensureTestDb, resetTestData } from '../test/setup.js';
import { __resetQpaySession, expiryToMs, isSettled, toInvoiceAmount } from '../services/qpay.js';
import { __resetRateCache } from '../services/exchangeRate.js';
import { signRef } from './paymentController.js';

// A stand-in QPay: records each call and answers like the Merchant V2 API.
const realFetch = globalThis.fetch;
let calls;
let paid; // invoice_id → amount reported as PAID
let invoiceSeq;

function fakeFetch(url, init = {}) {
  const u = new URL(url);
  const json = (body, status = 200) =>
    Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
  if (u.host === 'open.er-api.com') return json({ result: 'success', rates: { MNT: 3450 } });
  if (u.host !== 'qpay.test') return Promise.reject(new Error(`unexpected fetch ${url}`));

  const body = init.body ? JSON.parse(init.body) : null;
  calls.push({ method: init.method, path: u.pathname, body, auth: init.headers?.Authorization });
  if (u.pathname === '/v2/auth/token') {
    return json({ access_token: 'acc-1', refresh_token: 'ref-1', expires_in: Math.floor(Date.now() / 1000) + 3600 });
  }
  if (u.pathname === '/v2/invoice' && init.method === 'POST') {
    invoiceSeq += 1;
    return json({
      invoice_id: `inv-${invoiceSeq}`,
      qr_text: 'qr-text',
      qr_image: 'iVBORw0KGgo=',
      qPay_shortUrl: 'https://s.qpay.mn/x',
      urls: [{ name: 'Khan bank', description: 'Хаан банк', logo: 'https://x/logo.png', link: 'khanbank://q?qPay_QRcode=x' }],
    });
  }
  if (u.pathname.startsWith('/v2/invoice/') && init.method === 'DELETE') return json({});
  if (u.pathname === '/v2/payment/check') {
    const amount = paid.get(body.object_id);
    return json(
      amount
        ? { count: 1, paid_amount: amount, rows: [{ payment_id: 'pay-77', payment_status: 'PAID', payment_amount: amount }] }
        : { count: 0, paid_amount: 0, rows: [] }
    );
  }
  return json({ message: 'not found' }, 404);
}

before(() => ensureTestDb());
beforeEach(async () => {
  // Price invoices at the fake feed's rate, not one an earlier test file stored.
  await pool.query("DELETE FROM settings WHERE key LIKE 'mnt_rate%'");
  calls = [];
  paid = new Map();
  invoiceSeq = 0;
  globalThis.fetch = fakeFetch;
  process.env.QPAY_BASE_URL = 'https://qpay.test';
  process.env.QPAY_CLIENT_ID = 'TEST_MERCHANT';
  process.env.QPAY_CLIENT_SECRET = 'test-secret';
  process.env.QPAY_INVOICE_CODE = 'TEST_INVOICE';
  process.env.APP_URL = 'https://shop.test';
  __resetQpaySession();
  __resetRateCache();
});
afterEach(async () => {
  globalThis.fetch = realFetch;
  await resetTestData();
});
after(() => pool.end());

async function customer(email) {
  const password = 'Sup3rSecret!';
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role, is_active) VALUES ('Payer', $1, $2, 'customer', TRUE)`,
    [email, await bcrypt.hash(password, 10)]
  );
  return (await request(app).post('/api/auth/login').send({ email, password })).body.token;
}

async function placeOrder(token) {
  const { rows } = await pool.query(
    `INSERT INTO products (name, price, stock, is_active) VALUES ('Watch', 100.5, 5, TRUE) RETURNING id`
  );
  const res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({ items: [{ product_id: rows[0].id, quantity: 2 }], shipping_address: 'UB' });
  assert.equal(res.status, 201);
  return res.body.id;
}

test('amount and expiry helpers', () => {
  assert.equal(toInvoiceAmount(201, 3450), 693000); // 693,450 → floored to the thousand
  assert.equal(toInvoiceAmount(0.1, 3450), 1000);
  assert.equal(expiryToMs(2000000000), 2000000000 * 1000);
  assert.equal(expiryToMs(60, 1000), 61000);
  assert.equal(isSettled({ rows: [{ payment_status: 'PAID', payment_amount: 500 }] }, 1000).settled, false);
  assert.equal(isSettled({ rows: [{ payment_status: 'PAID', payment_amount: 1000 }] }, 1000).settled, true);
});

test('creates one invoice per order, reuses it, and settles the order on payment', async () => {
  const token = await customer('payer@example.com');
  const orderId = await placeOrder(token);

  const first = await request(app).post(`/api/payments/qpay/${orderId}`).set('Authorization', `Bearer ${token}`);
  assert.equal(first.status, 201);
  assert.equal(first.body.payment.amount_mnt, 693000);
  assert.equal(first.body.payment.qr_image, 'iVBORw0KGgo=');
  const invoiceCall = calls.find((c) => c.path === '/v2/invoice');
  assert.equal(invoiceCall.body.invoice_code, 'TEST_INVOICE');
  assert.equal(invoiceCall.body.amount, 693000);
  assert.match(invoiceCall.body.callback_url, /^https:\/\/shop\.test\/api\/payments\/qpay\/callback\?ref=MM\d+-[0-9a-f]+&sig=[0-9a-f]{32}$/);
  assert.match(calls[0].auth, /^Basic /);

  // Reloading the page reuses the open invoice.
  const again = await request(app).post(`/api/payments/qpay/${orderId}`).set('Authorization', `Bearer ${token}`);
  assert.equal(again.status, 200);
  assert.equal(again.body.payment.invoice_id, 'inv-1');
  assert.equal(calls.filter((c) => c.path === '/v2/invoice').length, 1);
  assert.equal(calls.filter((c) => c.path === '/v2/auth/token').length, 1, 'token is cached');

  // Not paid yet.
  let status = await request(app).get(`/api/payments/qpay/${orderId}`).set('Authorization', `Bearer ${token}`);
  assert.equal(status.body.payment.status, 'pending');
  assert.equal(status.body.order_status, 'pending');

  // Paid: a poll settles it, and only once.
  paid.set('inv-1', 693000);
  status = await request(app).get(`/api/payments/qpay/${orderId}`).set('Authorization', `Bearer ${token}`);
  assert.equal(status.body.payment.status, 'paid');
  assert.equal(status.body.order_status, 'paid');
  await request(app).get(`/api/payments/qpay/${orderId}`).set('Authorization', `Bearer ${token}`);
  const history = await pool.query(
    "SELECT note FROM order_status_history WHERE order_id = $1 AND to_status = 'paid'",
    [orderId]
  );
  assert.equal(history.rows.length, 1);
  assert.equal(history.rows[0].note, 'QPay · pay-77');
});

test('two requests at once issue one invoice', async () => {
  const token = await customer('twice@example.com');
  const orderId = await placeOrder(token);
  const [a, b] = await Promise.all([
    request(app).post(`/api/payments/qpay/${orderId}`).set('Authorization', `Bearer ${token}`),
    request(app).post(`/api/payments/qpay/${orderId}`).set('Authorization', `Bearer ${token}`),
  ]);
  assert.equal(a.body.payment.invoice_id, b.body.payment.invoice_id);
  assert.equal(calls.filter((c) => c.path === '/v2/invoice').length, 1);
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM payments WHERE order_id = $1', [orderId]);
  assert.equal(rows[0].n, 1);
});

test('the callback settles the payment, and rejects a forged signature', async () => {
  const token = await customer('cb@example.com');
  const orderId = await placeOrder(token);
  await request(app).post(`/api/payments/qpay/${orderId}`).set('Authorization', `Bearer ${token}`);
  const { rows } = await pool.query('SELECT sender_invoice_no FROM payments WHERE order_id = $1', [orderId]);
  const ref = rows[0].sender_invoice_no;

  const forged = await request(app).get(`/api/payments/qpay/callback?ref=${ref}&sig=${'0'.repeat(32)}`);
  assert.equal(forged.status, 400);

  paid.set('inv-1', 693000);
  const ok = await request(app).get(`/api/payments/qpay/callback?ref=${ref}&sig=${signRef(ref)}`);
  assert.equal(ok.status, 200);
  assert.equal(ok.text, 'SUCCESS');
  const order = await pool.query('SELECT status FROM orders WHERE id = $1', [orderId]);
  assert.equal(order.rows[0].status, 'paid');
});

test('an underpayment does not settle the order', async () => {
  const token = await customer('short@example.com');
  const orderId = await placeOrder(token);
  await request(app).post(`/api/payments/qpay/${orderId}`).set('Authorization', `Bearer ${token}`);
  paid.set('inv-1', 1000);
  const status = await request(app).get(`/api/payments/qpay/${orderId}`).set('Authorization', `Bearer ${token}`);
  assert.equal(status.body.payment.status, 'pending');
  assert.equal(status.body.order_status, 'pending');
});

test('only the owner can pay, and cancelling closes the invoice', async () => {
  const owner = await customer('owner@example.com');
  const other = await customer('other@example.com');
  const orderId = await placeOrder(owner);

  const denied = await request(app).post(`/api/payments/qpay/${orderId}`).set('Authorization', `Bearer ${other}`);
  assert.equal(denied.status, 403);

  await request(app).post(`/api/payments/qpay/${orderId}`).set('Authorization', `Bearer ${owner}`);
  await request(app).post(`/api/orders/${orderId}/cancel`).set('Authorization', `Bearer ${owner}`);
  // Closing runs off the response path; give it a moment.
  for (let i = 0; i < 20; i++) {
    const { rows } = await pool.query('SELECT status FROM payments WHERE order_id = $1', [orderId]);
    if (rows[0].status === 'cancelled') break;
    await new Promise((r) => setTimeout(r, 25));
  }
  const { rows } = await pool.query('SELECT status FROM payments WHERE order_id = $1', [orderId]);
  assert.equal(rows[0].status, 'cancelled');
  assert.ok(calls.some((c) => c.method === 'DELETE' && c.path === '/v2/invoice/inv-1'));
});

test('switched off without credentials', async () => {
  delete process.env.QPAY_CLIENT_ID;
  const token = await customer('off@example.com');
  const orderId = await placeOrder(token);
  const start = await request(app).post(`/api/payments/qpay/${orderId}`).set('Authorization', `Bearer ${token}`);
  assert.equal(start.status, 503);
  assert.equal(start.body.code, 'PAYMENTS_DISABLED');
  const status = await request(app).get(`/api/payments/qpay/${orderId}`).set('Authorization', `Bearer ${token}`);
  assert.equal(status.body.enabled, false);
});
