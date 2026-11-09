/**
 * Authentication flow verification.
 *
 * Runs the real packages/auth code against PostgreSQL (PGlite) by swapping the
 * shared pg.Pool for it. Covers: account creation, login lookup, sessions,
 * single-use reset tokens, password reset + session revocation, and the audit
 * log's append-only guarantee.
 */
import path from 'node:path';
import { ROOT, freshDatabase, makeChecker, bindDatabaseToPglite } from './helpers.mjs';

export async function run() {
  console.log('\n── auth flows ' + '─'.repeat(50));

  // withTenantContext() refuses to run without a DSN (fail-closed). Point it at
  // a dummy value; the pool below is redirected to PGlite.
  process.env.DATABASE_URL = 'postgresql://pglite/aria_cloud';

  const { check, failures } = makeChecker();

  const database = await import(path.join(ROOT, 'packages/database/dist/index.js'));
  const auth = await import(path.join(ROOT, 'packages/auth/dist/index.js'));

  const { db } = await freshDatabase();
  bindDatabaseToPglite(database, db);

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

  // --- Suspension checks --------------------------------------------------
  const { token: session2 } = await auth.createSession({ userId, tenantId, ttlSeconds: 300 });
  check('valid active session resolves', (await auth.resolveSession(session2)) !== null);

  // Suspend the tenant: active session must instantly resolve to null
  await db.query(`UPDATE tenants SET account_status = 'suspended' WHERE id = $1`, [tenantId]);
  check('session resolution blocked immediately when tenant is suspended', (await auth.resolveSession(session2)) === null);

  const suspendedCreds = await auth.findCredentialsByEmail('owner@test.co');
  check('credentials report suspended tenant status', auth.isTenantBlocked(suspendedCreds?.tenant_account_status));

  // Reinstate tenant for remaining checks
  await db.query(`UPDATE tenants SET account_status = 'active' WHERE id = $1`, [tenantId]);
  check('session resolution works again once reinstated', (await auth.resolveSession(session2)) !== null);

  // Sanctions block: a tenant screened 'blocked' cannot resolve a session.
  await db.query(`UPDATE tenants SET ofac_screening_status = 'blocked' WHERE id = $1`, [tenantId]);
  check('session resolution blocked immediately when tenant is sanctions-blocked', (await auth.resolveSession(session2)) === null);

  const blockedCreds = await auth.findCredentialsByEmail('owner@test.co');
  check('credentials report sanctions-blocked status', auth.isSanctionsBlocked(blockedCreds?.ofac_screening_status));

  await db.query(`UPDATE tenants SET ofac_screening_status = 'unscreened' WHERE id = $1`, [tenantId]);
  check('session resolution works again once screening cleared', (await auth.resolveSession(session2)) !== null);

  // --- Shared rate limiting checks ----------------------------------------
  const rlKey = 'test:login:ip:10.0.0.1';
  const rl1 = await database.consumeRateLimit(rlKey, 2, 60);
  check('rate limiter allows hit 1', rl1.allowed && rl1.hits === 1);
  const rl2 = await database.consumeRateLimit(rlKey, 2, 60);
  check('rate limiter allows hit 2 (limit reached)', rl2.allowed && rl2.hits === 2);
  const rl3 = await database.consumeRateLimit(rlKey, 2, 60);
  check('rate limiter blocks hit 3 (limit exceeded)', !rl3.allowed && rl3.hits === 3);
  check('rate limiter reports positive retry_after', rl3.retryAfterSeconds > 0);

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
