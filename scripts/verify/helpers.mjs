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

/**
 * A pg.Pool stand-in backed by PGlite that behaves like the real pools in
 * packages/database: every query / checked-out client runs as `role`, so RLS
 * and table grants are enforced exactly as in production (PGlite's default
 * user is a superuser, which would otherwise bypass RLS and hide bugs).
 *
 * PGlite is a single connection, so role-scoped work is serialized with a
 * small mutex. Fixtures written directly via `db.exec` still run as the
 * superuser, which is what test setup wants.
 */
export function pgliteRolePool(db, role) {
  let tail = Promise.resolve();
  const lock = () => {
    let release;
    const next = new Promise((resolve) => (release = resolve));
    const acquired = tail.then(() => release);
    tail = tail.then(() => next);
    return acquired;
  };

  return {
    async query(text, params) {
      const release = await lock();
      try {
        await db.exec(`SET ROLE ${role}`);
        return await db.query(text, params);
      } finally {
        await db.exec('RESET ROLE');
        release();
      }
    },
    async connect() {
      const release = await lock();
      await db.exec(`SET ROLE ${role}`);
      return {
        query: (text, params) => db.query(text, params),
        release: () => {
          db.exec('RESET ROLE').finally(release);
        },
      };
    },
  };
}

/** Points the shared database module's pools at PGlite, under the runtime roles. */
export function bindDatabaseToPglite(database, db) {
  const appPool = pgliteRolePool(db, 'aria_app_user');
  database.pool.query = appPool.query;
  database.pool.connect = appPool.connect;
  database.setAdminPoolForTesting(pgliteRolePool(db, 'aria_platform_admin'));
}
