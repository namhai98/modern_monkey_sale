// Create (or promote) an admin account.
//
//   npm run create-admin                                  # interactive prompts
//   npm run create-admin -- --email a@b.co --password ...  # non-interactive
//   ADMIN_EMAIL=a@b.co ADMIN_PASSWORD=... npm run create-admin
//
// An existing account with the same email is promoted to admin and re-enabled;
// its password is left unchanged.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { query, pool } from '../config/db.js';

function fromArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i += 1) {
    const m = /^--(name|email|password)(?:=(.*))?$/.exec(args[i]);
    if (!m) continue;
    out[m[1]] = m[2] !== undefined ? m[2] : args[(i += 1)];
  }
  return out;
}

async function collect() {
  const cli = fromArgs();
  let name = cli.name || process.env.ADMIN_NAME;
  let email = cli.email || process.env.ADMIN_EMAIL;
  let password = cli.password || process.env.ADMIN_PASSWORD;

  if ((!name || !email || !password) && input.isTTY) {
    const rl = readline.createInterface({ input, output });
    try {
      name = name || (await rl.question('Name: '));
      email = email || (await rl.question('Email: '));
      password = password || (await rl.question('Password (min 8 chars): '));
    } finally {
      rl.close();
    }
  }

  return {
    name: (name || '').trim(),
    email: (email || '').trim().toLowerCase(),
    password: (password || '').trim(),
  };
}

async function main() {
  const { name, email, password } = await collect();
  if (!name || !email || password.length < 8) {
    console.error(
      'Provide name, email and a password of at least 8 characters ' +
        '(flags --name/--email/--password, env ADMIN_*, or run interactively).'
    );
    process.exitCode = 1;
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO UPDATE SET role = 'admin', is_active = TRUE, updated_at = NOW()
     RETURNING id, name, email, role`,
    [name, email, passwordHash]
  );
  console.log('Admin ready:', rows[0]);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
