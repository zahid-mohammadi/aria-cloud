/**
 * Authentication flow verification.
 *
 * Runs the real packages/auth code against PostgreSQL (PGlite) by swapping the
 * shared pg.Pool for it. Covers: account creation, login lookup, sessions,
 * single-use reset tokens, password reset + session revocation, and the audit
 * log's append-only guarantee.
 */
import path from 'node:path';
import { ROOT, freshDatabase, makeChecker } from './helpers.mjs';

export async function run() {
  console.log('\n── auth flows ' + '─'.repeat(50));

  // withTenantContext() refuses to run without a DSN (fail-closed). Point it at
  // a dummy value; the pool below is redirected to PGlite.
  process.env.DATABASE_URL = 'postgresql://pglite/aria_cloud';

  const { check, failures } = makeChecker();

  const database = await import(path.join(ROOT, 'packages/database/dist/index.js'));
  const auth = await import(path.join(ROOT, 'packages/auth/dist/index.js'));

  const { db } = await freshDatabase();
  database.pool.query = (text, params) => db.query(text, params);
  database.pool.connect = async () => ({
    query: (text, params) => db.query(text, params),
    release: () => {},
  });

  const tenantId = '55555555-5555-5555-5555-555555555555';
  await db.exec(
    `INSERT INTO tenants (id, business_name, subdomain) VALUES ('${tenantId}', 'Test Co', 'test-co')`
  );

  const { userId } = await auth.createAccount({
    tenantId,
    email: 'Owner@Test.Co',
    password: 'initial-password',
    fullName: 'Owner',
  });
  check('createAccount returns a user id', !!userId);

  const creds = await auth.findCredentialsByEmail('owner@test.co');
  check('email lookup is case-insensitive', creds?.user_id === userId);
  check('correct password verifies', await auth.verifyPassword('initial-password', creds.password_hash));
  check('wrong password rejected', !(await auth.verifyPassword('nope', creds.password_hash)));

  const { token } = await auth.createSession({ userId, tenantId, ttlSeconds: 60 });
  const session = await auth.resolveSession(token);
  check('session resolves to tenant + profile', session?.tenantId === tenantId && session?.fullName === 'Owner');
  check('non-admin by default', session?.isPlatformAdmin === false);
  check('unknown token rejected', (await auth.resolveSession('not-a-token')) === null);

  const resetToken = await auth.issueAuthToken(userId, 'password_reset', 60);
  const first = await auth.consumeAuthToken(resetToken, 'password_reset');
  const second = await auth.consumeAuthToken(resetToken, 'password_reset');
  check('reset token consumed once', !!first && first.userId === userId);
  check('replay rejected', second === null);
  check('purpose confusion rejected', (await auth.consumeAuthToken(resetToken, 'email_verify')) === null);

  await auth.setPassword(userId, 'brand-new-password');
  const after = await auth.findCredentialsByEmail('owner@test.co');
  check('old password rejected after reset', !(await auth.verifyPassword('initial-password', after.password_hash)));
  check('new password accepted', await auth.verifyPassword('brand-new-password', after.password_hash));
  check('reset revokes existing sessions', (await auth.resolveSession(token)) === null);

  await auth.recordAuditEvent({
    actorUserId: userId,
    actorEmail: 'owner@test.co',
    action: 'wallet.credit_pack',
    targetTenantId: tenantId,
    targetType: 'wallet',
    targetId: 'pack_50000',
    metadata: { credits: 50000 },
    ipAddress: '203.0.113.7',
  });
  const auditRow = await db.query(
    `SELECT action, metadata, ip_address FROM admin_audit_log ORDER BY created_at DESC LIMIT 1`
  );
  check('audit event written', auditRow.rows[0]?.action === 'wallet.credit_pack');
  check('audit metadata is JSON', auditRow.rows[0]?.metadata?.credits === 50000);
  check('audit captures ip', auditRow.rows[0]?.ip_address === '203.0.113.7');

  let updateBlocked = false;
  try {
    await db.transaction(async (tx) => {
      await tx.query('SET ROLE aria_app_user');
      await tx.query(`UPDATE admin_audit_log SET action = 'tampered'`);
    });
  } catch {
    updateBlocked = true;
  }
  check('audit log is append-only for the app role', updateBlocked);

  return failures();
}
