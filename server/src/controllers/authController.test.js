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

async function createUser({
  email = 'shopper@example.com',
  password = 'Sup3rSecret!',
  role = 'customer',
  is_active = true,
} = {}) {
  const password_hash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, is_active)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, email, role`,
    ['Test User', email, password_hash, role, is_active]
  );
  return { ...rows[0], password };
}

test('login succeeds with correct credentials', async () => {
  const user = await createUser();
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password: user.password });
  assert.equal(res.status, 200);
  assert.equal(res.body.user.email, user.email);
  assert.ok(res.body.token);
});

test('login fails with the wrong password', async () => {
  const user = await createUser();
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password: 'not-it' });
  assert.equal(res.status, 401);
  assert.equal(res.body.code, 'INVALID_CREDENTIALS');
});

test('login fails for a disabled account', async () => {
  const user = await createUser({ is_active: false });
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password: user.password });
  assert.equal(res.status, 403);
  assert.equal(res.body.code, 'ACCOUNT_DISABLED');
});

test('refresh rotates the token and rejects reuse of the old one', async () => {
  const user = await createUser();
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password: user.password });
  const cookies = loginRes.headers['set-cookie'];
  assert.ok(cookies?.length, 'login should set a refresh-token cookie');

  const refreshRes = await request(app).post('/api/auth/refresh').set('Cookie', cookies);
  assert.equal(refreshRes.status, 200);
  assert.ok(refreshRes.body.token);
  // Not asserting the access token string differs from login's: its payload
  // (id/email/role/iat/exp) can be byte-identical when both are minted in the
  // same second, which is a JWT granularity artifact, not a rotation bug. The
  // refresh *token* (the cookie) rotating is what's asserted below.
  assert.notEqual(refreshRes.headers['set-cookie']?.[0], cookies[0]);

  // The rotated-out cookie is now a used family member — re-presenting it is
  // reuse detection, not just "expired".
  const reuseRes = await request(app).post('/api/auth/refresh').set('Cookie', cookies);
  assert.equal(reuseRes.status, 401);
  assert.equal(reuseRes.body.code, 'TOKEN_REUSED');
});

test('logout revokes the session so refresh no longer works', async () => {
  const user = await createUser();
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password: user.password });
  const cookies = loginRes.headers['set-cookie'];

  const logoutRes = await request(app).post('/api/auth/logout').set('Cookie', cookies);
  assert.equal(logoutRes.status, 204);

  const refreshRes = await request(app).post('/api/auth/refresh').set('Cookie', cookies);
  assert.equal(refreshRes.status, 401);
});

test('a customer is forbidden from the staff-only user list (RBAC)', async () => {
  const user = await createUser({ email: 'customer@example.com', role: 'customer' });
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password: user.password });

  const res = await request(app)
    .get('/api/users')
    .set('Authorization', `Bearer ${loginRes.body.token}`);
  assert.equal(res.status, 403);
  assert.equal(res.body.code, 'FORBIDDEN');
});

test('an admin can reach the staff-only user list (RBAC)', async () => {
  const admin = await createUser({ email: 'admin@example.com', role: 'admin' });
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: admin.email, password: admin.password });

  const res = await request(app)
    .get('/api/users')
    .set('Authorization', `Bearer ${loginRes.body.token}`);
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.items));
});
