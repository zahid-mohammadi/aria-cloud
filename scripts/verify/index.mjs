#!/usr/bin/env node
/**
 * Verification runner: applies every migration to a real PostgreSQL engine
 * (PGlite/WASM) and exercises the schema, RLS policies and auth flows.
 *
 *   pnpm build:packages && pnpm verify
 */
import { access } from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from './helpers.mjs';

const REQUIRED_BUILDS = [
  'packages/database/dist/index.js',
  'packages/auth/dist/index.js',
  'services/api-gateway/dist/index.js',
];

for (const rel of REQUIRED_BUILDS) {
  try {
    await access(path.join(ROOT, rel));
  } catch {
    console.error(`Missing build output: ${rel}\nRun \`pnpm build:packages\` first.`);
    process.exit(1);
  }
}

const schema = await import('./schema.mjs');
const auth = await import('./auth.mjs');
const gateway = await import('./gateway.mjs');

console.log('AriaCloud verification — PostgreSQL 16 (PGlite)');

let failures = 0;
failures += await schema.run();
failures += await auth.run();
failures += await gateway.run();

console.log('\n' + '─'.repeat(64));
if (failures === 0) {
  console.log('✅ ALL CHECKS PASSED');
  process.exit(0);
}
console.error(`❌ ${failures} CHECK(S) FAILED`);
process.exit(1);
