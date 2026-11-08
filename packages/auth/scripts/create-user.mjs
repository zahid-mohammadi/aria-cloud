#!/usr/bin/env node
/**
 * Bootstraps a tenant + an email/password account.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... pnpm user:create -- \
 *     --email owner@kabul-saffron.af --password 'a-long-password' \
 *     --name "Sayed Owner" --business "Kabul Saffron Co." --subdomain kabul-saffron
 *
 * Add --admin to mark the account as a platform administrator.
 */
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { createAccount } from '../dist/index.js';

function arg(name, fallback = undefined) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const email = arg('email');
const password = arg('password');
const fullName = arg('name', 'AriaCloud Owner');
const business = arg('business', 'AriaCloud Merchant');
const subdomain = arg('subdomain', business.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40));
const isAdmin = process.argv.includes('--admin');

if (!email || !password) {
  console.error('Usage: --email <email> --password <password> [--name] [--business] [--subdomain] [--admin]');
  process.exit(1);
}
if (password.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  const existing = await client.query(
    `SELECT id FROM tenants WHERE subdomain = $1 LIMIT 1`,
    [subdomain]
  );

  let tenantId = existing.rows[0]?.id;
  if (!tenantId) {
    tenantId = randomUUID();
    await client.query(
      `INSERT INTO tenants (id, business_name, subdomain, plan_tier)
       VALUES ($1, $2, $3, 'standard')`,
      [tenantId, business, subdomain]
    );
    console.log(`created tenant ${tenantId} (${subdomain})`);
  } else {
    console.log(`reusing tenant ${tenantId} (${subdomain})`);
  }

  const { userId } = await createAccount({
    tenantId,
    email,
    password,
    fullName,
    role: 'owner',
    isPlatformAdmin: isAdmin,
  });

  console.log(`✅ account created`);
  console.log(`   user:   ${userId}`);
  console.log(`   email:  ${email.toLowerCase()}`);
  console.log(`   tenant: ${tenantId}`);
  console.log(`   admin:  ${isAdmin}`);
} catch (err) {
  console.error('❌ failed:', err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
