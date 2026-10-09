// Shared setup for integration tests: creates+schemas a dedicated test
// database on first use, and clears out rows between tests.
//
// Deliberately NOT a transaction-per-test/rollback helper: every controller
// queries through the shared `pool` (see config/db.js) rather than a
// request-scoped client, so a transaction opened here would not be the one
// the app's own queries run in. TRUNCATE between tests is the honest
// alternative given that architecture.
//
// This also means every *.test.js file that uses this helper shares one
// physical database, so they cannot run concurrently — package.json's `test`
// script passes --test-concurrency=1 for exactly this reason. Don't drop it.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';
import { pool } from '../config/db.js';

const { Pool } = pg;
const here = dirname(fileURLToPath(import.meta.url));

// Tables integration tests can write to, in an order TRUNCATE ... CASCADE
// can safely clear without also needing every other table listed.
const TEST_TABLES = [
  'wishlist_items',
  'stock_movements',
  'order_status_history',
  'order_items',
  'orders',
  'refresh_tokens',
  'password_reset_tokens',
  'users',
  'product_variants',
  'products',
];

function assertTestDatabase() {
  const name = process.env.PGDATABASE || '';
  if (!name.includes('test')) {
    throw new Error(
      `Refusing to run integration tests against "${name}" — PGDATABASE must contain ` +
        '"test". Copy server/.env.test.example to server/.env.test and run ' +
        '`npm test` (which loads it via --env-file).'
    );
  }
}

let ready;

// Idempotent: safe to call from every test file's top-level `before`.
export function ensureTestDb() {
  if (!ready) ready = setup();
  return ready;
}

// Arbitrary constant, just needs to be unique to this project's test setup —
// see the advisory-lock note below.
const SETUP_LOCK_KEY = 84827301;

async function setup() {
  assertTestDatabase();
  const dbName = process.env.PGDATABASE;

  const admin = new Pool({
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: 'postgres',
  });

  // `node --test` runs every *.test.js file in its own process, and each one
  // calls ensureTestDb() on startup — without coordination two of them race
  // into "duplicate database" (both see it missing, both CREATE it) or a
  // deadlock (both apply schema.sql's DDL at once). A session advisory lock,
  // held on a connection to the always-present `postgres` database, makes the
  // create-then-apply-schema sequence run one process at a time; everyone
  // else just blocks on pg_advisory_lock until the first one finishes.
  const lockClient = await admin.connect();
  try {
    await lockClient.query('SELECT pg_advisory_lock($1)', [SETUP_LOCK_KEY]);

    const { rows } = await lockClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (rows.length === 0) {
      // Not parameterisable — this identifier is our own PGDATABASE value, not user input.
      await lockClient.query(`CREATE DATABASE "${dbName}"`);
    }

    const schemaSql = readFileSync(join(here, '../config/schema.sql'), 'utf8');
    await pool.query(schemaSql);
  } finally {
    await lockClient.query('SELECT pg_advisory_unlock($1)', [SETUP_LOCK_KEY]);
    lockClient.release();
    await admin.end();
  }
}

// Call in `afterEach` so tests never see rows an earlier test left behind.
export async function resetTestData() {
  await pool.query(`TRUNCATE ${TEST_TABLES.join(', ')} RESTART IDENTITY CASCADE`);
}
