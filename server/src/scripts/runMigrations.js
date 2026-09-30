// Apply pending files from config/migrations/ in order, recording each one in
// schema_migrations so re-runs (locally or against production) only apply
// what's new.
//   npm run db:migrate
//
// Each migration file is idempotent on its own (CREATE ... IF NOT EXISTS /
// ON CONFLICT DO NOTHING), but schema_migrations is what turns "safe to
// re-run" into "we know what's applied where" — this project's migrations
// used to be run by hand with no record of which ones had landed on a given
// database.
//
// First run on a database that was set up via `npm run db:setup` (schema.sql
// — the consolidated, current shape) rather than by replaying every
// migration in order:
//   npm run db:migrate -- --baseline-through=013_user_avatar.sql
// schema.sql already contains every migration's cumulative effect up to
// whatever point it was last regenerated, so replaying an old one against it
// can fail outright — e.g. 005's INSERT references a `position` column
// schema.sql never creates, because that column was later renamed to
// `sort_order` and schema.sql only ever reflects the current name.
// --baseline-through=<filename> records every migration up to and including
// <filename> as applied WITHOUT running its SQL (it's already reflected in
// the database via schema.sql), then executes anything after it normally in
// the same run — so a mid-history addition like 014 still actually runs.
// Pass the filename of the newest migration you're sure schema.sql already
// covers; never guess.
import 'dotenv/config';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pool, withTransaction } from '../config/db.js';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, '../config/migrations');

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();
const baselineArg = process.argv.find((a) => a.startsWith('--baseline-through='));
const baselineThrough = baselineArg ? baselineArg.slice('--baseline-through='.length) : null;
if (baselineArg && !files.includes(baselineThrough)) {
  console.error(`[db:migrate] --baseline-through names a file that doesn't exist: ${baselineThrough}`);
  process.exit(1);
}

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  const { rows } = await pool.query('SELECT filename FROM schema_migrations');
  const applied = new Set(rows.map((r) => r.filename));

  let stillBaselining = Boolean(baselineThrough);
  let ranCount = 0;
  for (const filename of files) {
    if (applied.has(filename)) {
      if (filename === baselineThrough) stillBaselining = false;
      continue;
    }
    if (stillBaselining) {
      await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
      console.log(`[db:migrate] baselined ${filename} (not executed)`);
      if (filename === baselineThrough) stillBaselining = false;
    } else {
      const sql = readFileSync(join(migrationsDir, filename), 'utf8');
      await withTransaction(async (query) => {
        await query(sql);
        await query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
      });
      console.log(`[db:migrate] applied ${filename}`);
    }
    ranCount += 1;
  }

  console.log(ranCount === 0 ? '[db:migrate] up to date, nothing to apply' : `[db:migrate] processed ${ranCount} migration(s)`);
} catch (err) {
  console.error('[db:migrate] failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
