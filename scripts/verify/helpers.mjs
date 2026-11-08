import { PGlite } from '@electric-sql/pglite';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const MIGRATIONS = path.join(ROOT, 'packages/database/migrations');

export function makeChecker() {
  let failures = 0;
  const check = (label, ok, detail = '') => {
    console.log(`  ${ok ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`);
    if (!ok) failures++;
  };
  return { check, failures: () => failures };
}

/** Applies every migration in filename order to a fresh in-memory Postgres. */
export async function freshDatabase() {
  const db = new PGlite({ extensions: { uuid_ossp, pgcrypto } });
  const files = (await readdir(MIGRATIONS)).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    await db.exec(await readFile(path.join(MIGRATIONS, file), 'utf8'));
  }
  return { db, files };
}
