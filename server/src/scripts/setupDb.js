// Apply the full schema to a fresh database (idempotent — safe to re-run).
//   npm run db:setup
//
// schema.sql is the consolidated, current schema (every statement is
// CREATE ... IF NOT EXISTS / ON CONFLICT DO NOTHING). The files in
// config/migrations/ are only for upgrading a database created by an
// earlier version.
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pool } from '../config/db.js';

const here = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(here, '../config/schema.sql'), 'utf8');

try {
  await pool.query(sql);
  console.log('[db:setup] schema applied');
} catch (err) {
  console.error('[db:setup] failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
