/**
 * Schema + RLS verification.
 *
 * Applies migrations 001-007 to a real PostgreSQL (PGlite/WASM) and asserts
 * that tenant isolation actually holds for the tables the application uses.
 */
import { freshDatabase, makeChecker } from './helpers.mjs';

export async function run() {
  console.log('\n── schema & RLS ' + '─'.repeat(48));
  const { check, failures } = makeChecker();

  const { db, files } = await freshDatabase();
  console.log(`  applied ${files.length} migrations`);

  const A = '11111111-1111-1111-1111-111111111111';
  const B = '22222222-2222-2222-2222-222222222222';

  await db.exec(`
    INSERT INTO tenants (id, business_name, subdomain) VALUES
      ('${A}', 'Aria A', 'aria-a'),
      ('${B}', 'Aria B', 'aria-b')
  `);
  await db.exec(`INSERT INTO wallets (tenant_id, usd_balance_cents, afn_balance_pul)
                 VALUES ('${A}', 1250, 685000)`);
  await db.exec(`INSERT INTO ai_credit_wallets (tenant_id, credit_balance)
                 VALUES ('${A}', 148420)`);

  check('wallet tables exist', (await db.query(`SELECT count(*)::int n FROM wallets`)).rows[0].n === 1);

  // The exact query getTenantOverview runs (fixed column names).
  const overview = await db.query(
    `SELECT t.id AS tenant_id, t.business_name AS organization_name, t.plan_tier AS subscription_tier,
            COALESCE(w.usd_balance_cents, 0) AS usd_balance_cents,
            COALESCE(w.afn_balance_pul, 0) AS afn_balance_pul,
            COALESCE(a.credit_balance, 0) AS credit_balance
       FROM tenants t
       LEFT JOIN wallets w ON w.tenant_id = t.id
       LEFT JOIN ai_credit_wallets a ON a.tenant_id = t.id
      WHERE t.id = $1 LIMIT 1`,
    [A]
  );
  check('overview query returns a row', overview.rows.length === 1);
  check('business_name maps to organization_name', overview.rows[0]?.organization_name === 'Aria A');
  check('balances map through', Number(overview.rows[0]?.usd_balance_cents) === 1250);

  const overviewB = await db.query(
    `SELECT COALESCE(w.usd_balance_cents, 0) AS usd FROM tenants t
       LEFT JOIN wallets w ON w.tenant_id = t.id WHERE t.id = $1`,
    [B]
  );
  check('tenant without wallet still returns (COALESCE 0)', Number(overviewB.rows[0]?.usd) === 0);

  const iso = await db.transaction(async (tx) => {
    await tx.query(`SET ROLE aria_app_user`);
    await tx.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [A]);
    const own = await tx.query(`SELECT count(*)::int n FROM wallets`);
    const foreign = await tx.query(`SELECT count(*)::int n FROM wallets WHERE tenant_id = $1`, [B]);
    return { own: own.rows[0].n, foreign: foreign.rows[0].n };
  });
  check('tenant sees its own rows', iso.own === 1, `rows=${iso.own}`);
  check('tenant cannot see another tenant rows', iso.foreign === 0, `rows=${iso.foreign}`);

  let blocked = false;
  try {
    await db.transaction(async (tx) => {
      await tx.query(`SET ROLE aria_app_user`);
      await tx.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [A]);
      await tx.query(`INSERT INTO wallets (tenant_id) VALUES ($1)`, [B]);
    });
  } catch {
    blocked = true;
  }
  check('cross-tenant INSERT rejected by WITH CHECK', blocked);

  let negativeBlocked = false;
  try {
    await db.transaction(async (tx) => {
      await tx.query('RESET ROLE');
      await tx.query(`UPDATE ai_credit_wallets SET credit_balance = -5 WHERE tenant_id = $1`, [A]);
    });
  } catch {
    negativeBlocked = true;
  }
  check('negative balance rejected', negativeBlocked);

  // --- Platform admin access policy checks (migration 009) ----------------
  const adminReads = await db.transaction(async (tx) => {
    await tx.query(`SET ROLE aria_platform_admin`);
    // Querying with NO app.current_tenant_id
    const res = await tx.query(`SELECT count(*)::int n FROM wallets`);
    return res.rows[0].n;
  });
  check('aria_platform_admin can read cross-tenant via policy', adminReads === 1, `count=${adminReads}`);

  const appReadsWithoutTenant = await db.transaction(async (tx) => {
    await tx.query(`SET ROLE aria_app_user`);
    // Querying with NO app.current_tenant_id set
    const res = await tx.query(`SELECT count(*)::int n FROM wallets`);
    return res.rows[0].n;
  });
  check('aria_app_user without tenant context sees 0 rows', appReadsWithoutTenant === 0, `count=${appReadsWithoutTenant}`);

  let adminAuditBlocked = false;
  try {
    await db.transaction(async (tx) => {
      await tx.query('SET ROLE aria_platform_admin');
      await tx.query(`DELETE FROM admin_audit_log`);
    });
  } catch {
    adminAuditBlocked = true;
  }
  check('admin audit log is append-only even for platform admin', adminAuditBlocked);

  return failures();
}
