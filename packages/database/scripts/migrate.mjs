#!/usr/bin/env node
/**
 * AriaCloud migration runner.
 *
 * Applies packages/database/migrations/*.sql in filename order inside a
 * transaction per file, recording each applied file (and its checksum) in
 * `schema_migrations`. Re-running is a no-op; editing an already-applied
 * migration fails loudly instead of silently drifting.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... pnpm db:migrate
 */
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(here, '..', 'migrations');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is required (e.g. postgresql://user:pass@host:5432/aria_cloud)');
  process.exit(1);
}

const client = new pg.Client({ connectionString });
await client.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      checksum   TEXT NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    )
  `);

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const { rows } = await client.query('SELECT filename, checksum FROM schema_migrations');
  const applied = new Map(rows.map((r) => [r.filename, r.checksum]));

  let appliedCount = 0;
  let drift = false;

  for (const file of files) {
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');

    if (applied.has(file)) {
      if (applied.get(file) !== checksum) {
        console.error(`✗ ${file} has changed since it was applied (checksum mismatch)`);
        drift = true;
      } else {
        console.log(`• ${file} — already applied`);
      }
      continue;
    }

    process.stdout.write(`→ applying ${file} ... `);
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)',
        [file, checksum]
      );
      await client.query('COMMIT');
      console.log('ok');
      appliedCount++;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('FAILED');
      throw err;
    }
  }

  if (drift) {
    console.error('\n❌ Migration checksum drift detected — do not edit applied migrations.');
    process.exitCode = 1;
  } else if (appliedCount === 0) {
    console.log('\n✅ Database already up to date');
  } else {
    console.log(`\n✅ Applied ${appliedCount} migration(s)`);
  }
} finally {
  await client.end();
}
