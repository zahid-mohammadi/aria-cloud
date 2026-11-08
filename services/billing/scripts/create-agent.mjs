#!/usr/bin/env node
/**
 * Creates a field agent and prints its bearer key ONCE.
 *
 *   DATABASE_URL=... pnpm agent:create -- \
 *     --name "Ahmad Karimi" --phone +93700000001 --region kabul --max-float 50000
 *
 * Only the SHA-256 of the key is stored, so it cannot be recovered later —
 * if it is lost, issue a new agent (or rotate the hash directly).
 */
import crypto from 'node:crypto';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

function arg(name, fallback = undefined) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const name = arg('name');
const phone = arg('phone');
const region = arg('region', 'kabul_central');
const maxFloat = Number(arg('max-float', '50000'));

if (!name || !phone) {
  console.error('Usage: --name <full name> --phone <E.164> [--region] [--max-float]');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

const apiKey = crypto.randomBytes(32).toString('base64url');
const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  const res = await client.query(
    `INSERT INTO billing_agents
       (id, full_name, phone_number, assigned_region, max_cash_float_afn, api_key_hash, is_authorized)
     VALUES ($1, $2, $3, $4, $5, $6, true)
     RETURNING id`,
    [randomUUID(), name, phone, region, maxFloat, apiKeyHash]
  );

  console.log('✅ field agent created');
  console.log(`   id:      ${res.rows[0].id}`);
  console.log(`   name:    ${name}`);
  console.log(`   region:  ${region}`);
  console.log(`   float:   ${maxFloat} AFN`);
  console.log('');
  console.log('   API KEY (shown once — store it now):');
  console.log(`   ${apiKey}`);
  console.log('');
  console.log('   Use it as: Authorization: Bearer <key>');
} catch (err) {
  console.error('❌ failed:', err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
