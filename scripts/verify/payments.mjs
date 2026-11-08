/**
 * Payment integrity verification.
 *
 * Runs the real billing handler against PostgreSQL (PGlite) and checks the
 * things that used to be wrong: anonymous cash endpoints, flat 365-day
 * grants, no invoice linkage, no ledger, plaintext OTPs.
 */
import crypto from 'node:crypto';
import path from 'node:path';
import { ROOT, freshDatabase, makeChecker } from './helpers.mjs';

const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');
const hmacHex = (secret, v) => crypto.createHmac('sha256', secret).update(v).digest('hex');

const TENANT = '66666666-6666-6666-6666-666666666666';
const OTHER_TENANT = '77777777-7777-7777-7777-777777777777';
const AGENT_KEY = 'agent-key-test-123';
const PEPPER = 'test-otp-pepper';
const HESABPAY_SECRET = 'test-hesabpay-secret';

export async function run() {
  console.log('\n── payments ' + '─'.repeat(52));
  const { check, failures } = makeChecker();

  process.env.DATABASE_URL = 'postgresql://pglite/aria_cloud';
  process.env.HESABPAY_SECRET_KEY = HESABPAY_SECRET;
  process.env.BILLING_OTP_PEPPER = PEPPER;
  delete process.env.META_PHONE_ID;
  delete process.env.META_ACCESS_TOKEN;

  const database = await import(path.join(ROOT, 'packages/database/dist/index.js'));
  const billing = await import(path.join(ROOT, 'services/billing/dist/index.js'));

  const { db } = await freshDatabase();
  database.pool.query = (text, params) => db.query(text, params);
  database.pool.connect = async () => ({
    query: (text, params) => db.query(text, params),
    release: () => {},
  });

  await db.exec(`
    INSERT INTO tenants (id, business_name, subdomain) VALUES
      ('${TENANT}', 'Payer Co', 'payer-co'),
      ('${OTHER_TENANT}', 'Other Co', 'other-co');
    INSERT INTO invoices (id, tenant_id, invoice_number, amount_afn, billing_period_months, status, due_date)
    VALUES
      ('aaaaaaaa-0000-0000-0000-000000000001', '${TENANT}', 'INV-1', 1450.00, 12, 'unpaid', current_date + 30),
      ('aaaaaaaa-0000-0000-0000-000000000002', '${TENANT}', 'INV-2', 1450.00, 1,  'unpaid', current_date + 30);
    INSERT INTO billing_agents (id, full_name, phone_number, assigned_region, api_key_hash, max_cash_float_afn)
    VALUES ('bbbbbbbb-0000-0000-0000-000000000001', 'Agent One', '+93700000001', 'kabul',
            '${sha256(AGENT_KEY)}', 100000);
    INSERT INTO billing_agents (id, full_name, phone_number, assigned_region, api_key_hash, max_cash_float_afn)
    VALUES ('bbbbbbbb-0000-0000-0000-000000000002', 'Agent Two', '+93700000002', 'herat',
            '${sha256('other-agent-key')}', 100000);
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

  // --- cash endpoints require an agent -------------------------------------
  r = await billing.handler({
    rawPath: '/cash/initiate',
    body: JSON.stringify({ tenant_id: TENANT, invoice_id: 'aaaaaaaa-0000-0000-0000-000000000001', amount_afn: 1450 }),
    headers: {},
  });
  check('cash/initiate rejects anonymous callers', r.statusCode === 401, `status=${r.statusCode}`);

  r = await billing.handler({
    rawPath: '/cash/verify',
    body: JSON.stringify({ tenant_id: TENANT, transaction_id: 'x', entered_otp: '000000' }),
    headers: {},
  });
  check('cash/verify rejects anonymous callers', r.statusCode === 401, `status=${r.statusCode}`);

  // --- cash flow -----------------------------------------------------------
  await db.exec(`INSERT INTO invoices (id, tenant_id, invoice_number, amount_afn, billing_period_months, status, due_date)
                 VALUES ('aaaaaaaa-0000-0000-0000-000000000003', '${TENANT}', 'INV-3', 900.00, 1, 'unpaid', current_date + 30)`);

  r = await billing.handler({
    rawPath: '/cash/initiate',
    body: JSON.stringify({ tenant_id: TENANT, invoice_id: 'aaaaaaaa-0000-0000-0000-000000000003', amount_afn: 900 }),
    headers: { authorization: `Bearer ${AGENT_KEY}` },
  });
  const initiateBody = JSON.parse(r.body);
  check('agent can initiate a cash collection', r.statusCode === 200 && initiateBody.status === 'OTP_DISPATCHED', r.body.slice(0, 80));

  const txId = initiateBody.transactionId;
  const stored = await db.query(`SELECT otp_hash FROM payment_transactions WHERE id = $1`, [txId]);
  check('OTP stored as a hash, not plaintext', typeof stored.rows[0].otp_hash === 'string' && stored.rows[0].otp_hash.length === 64);

  // Wrong agent cannot confirm it
  r = await billing.handler({
    rawPath: '/cash/verify',
    body: JSON.stringify({ tenant_id: TENANT, transaction_id: txId, entered_otp: '123456' }),
    headers: { authorization: 'Bearer other-agent-key' },
  });
  check('another agent cannot confirm the transaction', r.statusCode === 403, `status=${r.statusCode}`);

  // Wrong OTP is rejected and counted
  r = await billing.handler({
    rawPath: '/cash/verify',
    body: JSON.stringify({ tenant_id: TENANT, transaction_id: txId, entered_otp: '000000' }),
    headers: { authorization: `Bearer ${AGENT_KEY}` },
  });
  check('wrong OTP rejected', r.statusCode === 400 && JSON.parse(r.body).error === 'INVALID_OTP', `status=${r.statusCode}`);

  // Simulate the code the agent was given, then confirm
  await db.query(`UPDATE payment_transactions SET otp_hash = $1 WHERE id = $2`, [hmacHex(PEPPER, '424242'), txId]);
  r = await billing.handler({
    rawPath: '/cash/verify',
    body: JSON.stringify({ tenant_id: TENANT, transaction_id: txId, entered_otp: '424242' }),
    headers: { authorization: `Bearer ${AGENT_KEY}` },
  });
  check('correct OTP settles the invoice', r.statusCode === 200 && JSON.parse(r.body).status === 'PAYMENT_CONFIRMED', r.body.slice(0, 90));

  const inv3 = await db.query(`SELECT status FROM invoices WHERE id = 'aaaaaaaa-0000-0000-0000-000000000003'`);
  check('cash-settled invoice marked paid', inv3.rows[0].status === 'paid');

  const agent = await db.query(
    `SELECT current_cash_held_afn FROM billing_agents WHERE id = 'bbbbbbbb-0000-0000-0000-000000000001'`
  );
  check('agent float increased by the collection', Number(agent.rows[0].current_cash_held_afn) === 900);

  const replayCash = await billing.handler({
    rawPath: '/cash/verify',
    body: JSON.stringify({ tenant_id: TENANT, transaction_id: txId, entered_otp: '424242' }),
    headers: { authorization: `Bearer ${AGENT_KEY}` },
  });
  check('cash confirmation cannot be replayed', replayCash.statusCode === 409, `status=${replayCash.statusCode}`);

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
