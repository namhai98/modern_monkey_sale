import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Hosted Postgres (Neon, Render, etc.) hands you a single DATABASE_URL and
// requires TLS. Local dev keeps using the discrete PG* variables.
const useConnectionString = Boolean(process.env.DATABASE_URL);

export const pool = new Pool(
  useConnectionString
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: process.env.PGHOST,
        port: process.env.PGPORT,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
      }
);

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

export const query = (text, params) => pool.query(text, params);

// Run a set of statements on one client inside BEGIN/COMMIT. Used where a
// partial write would leave the row graph inconsistent — e.g. creating a user
// and its linked social identity together.
export async function withTransaction(fn) {
  const clientConn = await pool.connect();
  try {
    await clientConn.query('BEGIN');
    const result = await fn((text, params) => clientConn.query(text, params));
    await clientConn.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await clientConn.query('ROLLBACK');
    } catch {
      // the connection is already broken; the pool will discard it
    }
    throw err;
  } finally {
    clientConn.release();
  }
}
