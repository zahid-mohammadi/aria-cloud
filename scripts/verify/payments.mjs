/**
 * Payment integrity verification (HesabPay only).
 *
 * Runs the real billing handler against PostgreSQL (PGlite) and checks the
 * things that used to be wrong: anonymous webhooks, flat 365-day grants,
 * no invoice linkage, no ledger. Also asserts the cash/agent routes are gone.
 */
import crypto from 'node:crypto';
import path from 'node:path';
import { ROOT, freshDatabase, makeChecker, bindDatabaseToPglite } from './helpers.mjs';

const hmacHex = (secret, v) => crypto.createHmac('sha256', secret).update(v).digest('hex');

const TENANT = '66666666-6666-6666-6666-666666666666';
const OTHER_TENANT = '77777777-7777-7777-7777-777777777777';
const HESABPAY_SECRET = 'test-hesabpay-secret';

export async function run() {
  console.log('\n── payments ' + '─'.repeat(52));
  const { check, failures } = makeChecker();

  process.env.DATABASE_URL = 'postgresql://pglite/aria_cloud';
  process.env.HESABPAY_SECRET_KEY = HESABPAY_SECRET;
  delete process.env.META_PHONE_ID;
  delete process.env.META_ACCESS_TOKEN;

  const database = await import(path.join(ROOT, 'packages/database/dist/index.js'));
  const billing = await import(path.join(ROOT, 'services/billing/dist/index.js'));

  const { db } = await freshDatabase();
  bindDatabaseToPglite(database, db);

  await db.exec(`
    INSERT INTO tenants (id, business_name, subdomain) VALUES
      ('${TENANT}', 'Payer Co', 'payer-co'),
      ('${OTHER_TENANT}', 'Other Co', 'other-co');
    INSERT INTO invoices (id, tenant_id, invoice_number, amount_afn, billing_period_months, status, due_date)
    VALUES
      ('aaaaaaaa-0000-0000-0000-000000000001', '${TENANT}', 'INV-1', 1450.00, 12, 'unpaid', current_date + 30),
      ('aaaaaaaa-0000-0000-0000-000000000002', '${TENANT}', 'INV-2', 1450.00, 1,  'unpaid', current_date + 30);
  `);

  const hesa = (payload, { signature, secret = HESABPAY_SECRET } = {}) => {
    const raw = JSON.stringify(payload);
    return billing.handler({
      rawPath: '/webhooks/hesabpay',
      body: raw,
      headers: {
        'x-hesabpay-signature': signature ?? hmacHex(secret, raw),
      },
    });
  };

  // --- webhook authentication ---------------------------------------------
  let r = await billing.handler({
    rawPath: '/webhooks/hesabpay',
    body: '{}',
    headers: {},
  });
  check('unsigned HesabPay webhook rejected', r.statusCode === 401, `status=${r.statusCode}`);

  r = await hesa(
    { transaction_id: 'tx-bad', tenant_id: TENANT, invoice_id: 'aaaaaaaa-0000-0000-0000-000000000001', amount_afn: 1450, status: 'COMPLETED' },
    { secret: 'wrong-secret' }
  );
  check('bad signature rejected', r.statusCode === 401, `status=${r.statusCode}`);

  // --- invoice ownership + amount -----------------------------------------
  r = await hesa({ transaction_id: 'tx-1', tenant_id: OTHER_TENANT, invoice_id: 'aaaaaaaa-0000-0000-0000-000000000001', amount_afn: 1450, status: 'COMPLETED' });
  check('invoice from another tenant rejected', r.statusCode === 404, `status=${r.statusCode} ${r.body.slice(0, 60)}`);

  r = await hesa({ transaction_id: 'tx-2', tenant_id: TENANT, invoice_id: 'aaaaaaaa-0000-0000-0000-000000000001', amount_afn: 100, status: 'COMPLETED' });
  check('underpayment rejected', r.statusCode === 400 && JSON.parse(r.body).error === 'UNDERPAYMENT', `status=${r.statusCode}`);

  // --- settlement ----------------------------------------------------------
  r = await hesa({ transaction_id: 'tx-3', tenant_id: TENANT, invoice_id: 'aaaaaaaa-0000-0000-0000-000000000001', amount_afn: 1450, status: 'COMPLETED' });
  const settledBody = JSON.parse(r.body);
  check('valid payment settles', r.statusCode === 200 && settledBody.status === 'SETTLED', r.body.slice(0, 90));
  check('subscription extended by invoice period (12 months)', settledBody.monthsAdded === 12, `months=${settledBody.monthsAdded}`);

  const inv = await db.query(`SELECT status FROM invoices WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001'`);
  check('invoice marked paid', inv.rows[0].status === 'paid');

  const sub = await db.query(
    `SELECT subscription_end_date > now() + interval '11 months' AS extended FROM tenants WHERE id = $1`, [TENANT]
  );
  check('tenant subscription pushed ~12 months out', sub.rows[0].extended === true);

  // --- idempotency ---------------------------------------------------------
  const before = (await db.query(`SELECT count(*)::int n FROM ledger_entries`)).rows[0].n;
  r = await hesa({ transaction_id: 'tx-3', tenant_id: TENANT, invoice_id: 'aaaaaaaa-0000-0000-0000-000000000001', amount_afn: 1450, status: 'COMPLETED' });
  const dupBody = JSON.parse(r.body);
  const after = (await db.query(`SELECT count(*)::int n FROM ledger_entries`)).rows[0].n;
  check('replayed webhook is acknowledged as duplicate', r.statusCode === 200 && dupBody.status === 'ACK_DUPLICATE', dupBody.status);
  check('replay posts no extra ledger rows', before === after, `${before} -> ${after}`);

  // --- ledger balance ------------------------------------------------------
  const balance = await db.query(`
    SELECT
      SUM(CASE WHEN direction = 'debit'  THEN amount_minor ELSE 0 END)::bigint AS debits,
      SUM(CASE WHEN direction = 'credit' THEN amount_minor ELSE 0 END)::bigint AS credits
    FROM ledger_entries`);
  check(
    'ledger debits equal credits',
    String(balance.rows[0].debits) === String(balance.rows[0].credits),
    `${balance.rows[0].debits} vs ${balance.rows[0].credits}`
  );

  const revenue = await db.query(
    `SELECT SUM(amount_minor)::bigint AS n FROM ledger_entries WHERE account_code = 'platform:revenue:afn' AND direction = 'credit'`
  );
  check('revenue credited with the invoice amount', String(revenue.rows[0].n) === '145000', String(revenue.rows[0].n));

  // --- overpayment stays on the merchant balance ---------------------------
  r = await hesa({ transaction_id: 'tx-4', tenant_id: TENANT, invoice_id: 'aaaaaaaa-0000-0000-0000-000000000002', amount_afn: 1600, status: 'COMPLETED' });
  const wallet = await db.query(`SELECT afn_balance_pul FROM wallets WHERE tenant_id = $1`, [TENANT]);
  check('overpayment credited to wallet (150.00 AFN)', Number(wallet.rows[0]?.afn_balance_pul) === 15000, String(wallet.rows[0]?.afn_balance_pul));

  // --- HesabPay-only: the cash/agent rails are gone -------------------------
  r = await billing.handler({ rawPath: '/cash/initiate', body: '{}', headers: {} });
  check('cash/initiate route removed', r.statusCode === 404, `status=${r.statusCode}`);

  r = await billing.handler({ rawPath: '/cash/verify', body: '{}', headers: {} });
  check('cash/verify route removed', r.statusCode === 404, `status=${r.statusCode}`);

  // --- final invariant -----------------------------------------------------
  const finalBalance = await db.query(`
    SELECT
      SUM(CASE WHEN direction = 'debit'  THEN amount_minor ELSE 0 END)::bigint AS debits,
      SUM(CASE WHEN direction = 'credit' THEN amount_minor ELSE 0 END)::bigint AS credits
    FROM ledger_entries`);
  check(
    'ledger still balanced after all settlements',
    String(finalBalance.rows[0].debits) === String(finalBalance.rows[0].credits),
    `${finalBalance.rows[0].debits} vs ${finalBalance.rows[0].credits}`
  );

  return failures();
}
