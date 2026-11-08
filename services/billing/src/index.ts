/**
 * AriaCloud billing: HesabPay settlement, field-agent cash OTP, ledger.
 *
 * Invariants this file is responsible for:
 *  - a payment only settles an invoice that belongs to the paying tenant,
 *    and only once
 *  - the subscription is extended by the invoice's own billing period, never a
 *    flat 365 days
 *  - every settlement writes balanced double-entry rows (debits == credits)
 *  - the cash endpoints are authenticated as a field agent, and agent_id is
 *    derived from the bearer key — never taken from the request body
 *  - OTPs are stored as peppered HMACs and compared in constant time
 *
 * Missing configuration is a hard failure (503), never a silent bypass.
 */
import crypto from 'node:crypto';
import type { PoolClient } from 'pg';
import { pool, withTenantContext } from '@aria-cloud/database';

const MAX_OTP_ATTEMPTS = 5;
const OTP_TTL_MINUTES = 10;

export interface LambdaEvent {
  rawPath?: string;
  path?: string;
  body?: string | null;
  headers?: Record<string, string | undefined>;
}

export interface LambdaResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code = 'ERROR'
  ) {
    super(message);
  }
}

const json = (statusCode: number, data: unknown, headers: Record<string, string> = {}): LambdaResponse => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(data),
});

// --- crypto helpers ---------------------------------------------------------

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

export function verifyHmacSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false;
  const provided = signatureHeader.replace(/^sha256=/i, '').trim().toLowerCase();
  const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  return safeEqual(expected, provided);
}

function requireSecret(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new HttpError(503, `${name} is not configured`, 'NOT_CONFIGURED');
  }
  return value;
}

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

/** 6-digit OTP is a short-lived challenge, so a peppered HMAC is enough. */
function hashOtp(otp: string, pepper: string): string {
  return crypto.createHmac('sha256', pepper).update(otp).digest('hex');
}

/** Money is compared in minor units (pul); never as floats. */
const toMinor = (afn: string | number): number => Math.round(Number(afn) * 100);

// --- auth helpers -----------------------------------------------------------

interface AgentRow {
  id: string;
  full_name: string;
  current_cash_held_afn: string;
  max_cash_float_afn: string;
}

function bearerToken(headers: Record<string, string | undefined>): string | null {
  const raw = headers['authorization'] || headers['Authorization'];
  if (!raw || !raw.startsWith('Bearer ')) return null;
  return raw.slice('Bearer '.length).trim() || null;
}

async function authenticateAgent(
  headers: Record<string, string | undefined>
): Promise<AgentRow> {
  const token = bearerToken(headers);
  if (!token) throw new HttpError(401, 'Agent credentials required', 'UNAUTHORIZED');

  const res = await pool.query<AgentRow>(
    `SELECT id, full_name, current_cash_held_afn, max_cash_float_afn
       FROM billing_agents
      WHERE api_key_hash = $1 AND is_authorized = true
      LIMIT 1`,
    [sha256(token)]
  );
  const agent = res.rows[0];
  if (!agent) throw new HttpError(401, 'Agent credentials required', 'UNAUTHORIZED');
  return agent;
}

// --- ledger -----------------------------------------------------------------

interface LedgerEntry {
  tenantId: string | null;
  accountCode: string;
  direction: 'debit' | 'credit';
  amountMinor: number;
  referenceType: string;
  referenceId: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

async function postLedger(client: PoolClient, entries: LedgerEntry[]): Promise<void> {
  const debits = entries.filter((e) => e.direction === 'debit').reduce((s, e) => s + e.amountMinor, 0);
  const credits = entries.filter((e) => e.direction === 'credit').reduce((s, e) => s + e.amountMinor, 0);
  if (debits !== credits) {
    // Programming error, not a data error: refuse rather than corrupt the books.
    throw new HttpError(500, `Unbalanced ledger post (debits ${debits} != credits ${credits})`, 'UNBALANCED');
  }

  for (const entry of entries) {
    await client.query(
      `INSERT INTO ledger_entries
         (tenant_id, account_code, direction, amount_minor, reference_type, reference_id,
          idempotency_key, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [
        entry.tenantId,
        entry.accountCode,
        entry.direction,
        entry.amountMinor,
        entry.referenceType,
        entry.referenceId,
        entry.idempotencyKey,
        JSON.stringify(entry.metadata ?? {}),
      ]
    );
  }
}

// --- settlement -------------------------------------------------------------

interface SettleInput {
  tenantId: string;
  invoiceId: string;
  amountMinor: number;
  channel: string;
  reference: string;
}

interface SettleResult {
  alreadySettled: boolean;
  invoiceMinor: number;
  overpaymentMinor: number;
  months: number;
}

/**
 * Marks an invoice paid, extends the subscription by that invoice's period,
 * and posts the ledger rows. Must run inside the tenant's transaction with the
 * invoice row locked.
 */
async function settleInvoice(client: PoolClient, input: SettleInput): Promise<SettleResult> {
  const invoiceRes = await client.query<{
    id: string;
    amount_afn: string;
    billing_period_months: number;
    status: string;
  }>(
    `SELECT id, amount_afn, billing_period_months, status
       FROM invoices
      WHERE id = $1 AND tenant_id = $2
      FOR UPDATE`,
    [input.invoiceId, input.tenantId]
  );

  const invoice = invoiceRes.rows[0];
  if (!invoice) throw new HttpError(404, 'Invoice not found for this tenant', 'INVOICE_NOT_FOUND');

  const invoiceMinor = toMinor(invoice.amount_afn);
  const months = invoice.billing_period_months > 0 ? invoice.billing_period_months : 1;

  if (invoice.status === 'paid') {
    return { alreadySettled: true, invoiceMinor, overpaymentMinor: 0, months };
  }
  if (input.amountMinor < invoiceMinor) {
    throw new HttpError(
      400,
      `Underpayment: received ${input.amountMinor} minor units, invoice is ${invoiceMinor}`,
      'UNDERPAYMENT'
    );
  }

  const overpaymentMinor = input.amountMinor - invoiceMinor;

  await client.query(
    `UPDATE invoices SET status = 'paid', paid_at = now() WHERE id = $1`,
    [invoice.id]
  );

  // Extend from whichever is later: now, or the existing subscription end.
  await client.query(
    `UPDATE tenants
        SET subscription_end_date = GREATEST(subscription_end_date, now())
                                    + ($2::int * interval '1 month'),
            account_status = 'active',
            updated_at = now()
      WHERE id = $1`,
    [input.tenantId, months]
  );

  const walletAccount = `tenant:${input.tenantId}:wallet:afn`;
  await postLedger(client, [
    {
      tenantId: input.tenantId,
      accountCode: `platform:settlement:${input.channel}`,
      direction: 'debit',
      amountMinor: input.amountMinor,
      referenceType: 'payment',
      referenceId: input.reference,
      idempotencyKey: `${input.reference}:settlement-debit`,
      metadata: { channel: input.channel },
    },
    {
      tenantId: input.tenantId,
      accountCode: walletAccount,
      direction: 'credit',
      amountMinor: input.amountMinor,
      referenceType: 'payment',
      referenceId: input.reference,
      idempotencyKey: `${input.reference}:wallet-credit`,
    },
    {
      tenantId: input.tenantId,
      accountCode: walletAccount,
      direction: 'debit',
      amountMinor: invoiceMinor,
      referenceType: 'invoice',
      referenceId: invoice.id,
      idempotencyKey: `${input.reference}:wallet-debit`,
    },
    {
      tenantId: input.tenantId,
      accountCode: 'platform:revenue:afn',
      direction: 'credit',
      amountMinor: invoiceMinor,
      referenceType: 'invoice',
      referenceId: invoice.id,
      idempotencyKey: `${input.reference}:revenue-credit`,
      metadata: { months },
    },
  ]);

  // Any overpayment stays on the merchant's balance.
  if (overpaymentMinor > 0) {
    await client.query(
      `INSERT INTO wallets (tenant_id) VALUES ($1) ON CONFLICT (tenant_id) DO NOTHING`,
      [input.tenantId]
    );
    await client.query(
      `UPDATE wallets SET afn_balance_pul = afn_balance_pul + $1, updated_at = now()
        WHERE tenant_id = $2`,
      [overpaymentMinor, input.tenantId]
    );
  }

  return { alreadySettled: false, invoiceMinor, overpaymentMinor, months };
}

// --- WhatsApp notification (best effort) ------------------------------------

async function sendWhatsAppTemplate(
  recipientPhone: string,
  templateName: string,
  localeCode: string,
  bodyParams: string[]
): Promise<void> {
  const phoneId = process.env.META_PHONE_ID;
  const token = process.env.META_ACCESS_TOKEN;
  if (!phoneId || !token) {
    console.warn('[billing] WhatsApp not configured; skipping notification', templateName);
    return;
  }
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipientPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: localeCode || 'fa' },
          components: [
            {
              type: 'body',
              parameters: bodyParams.map((text) => ({ type: 'text', text: String(text) })),
            },
          ],
        },
      }),
    });
    if (!res.ok) {
      console.error(`[billing] WhatsApp error (${res.status}):`, await res.text());
    }
  } catch (error) {
    console.error('[billing] WhatsApp send failed:', error);
  }
}

async function getTenantContact(
  client: PoolClient,
  tenantId: string
): Promise<{ owner_phone: string; preferred_locale: string; business_name: string } | null> {
  const res = await client.query(
    `SELECT owner_phone, preferred_locale, business_name FROM tenants WHERE id = $1`,
    [tenantId]
  );
  return res.rows[0] ?? null;
}

// --- routes -----------------------------------------------------------------

export const handler = async (event: LambdaEvent): Promise<LambdaResponse> => {
  const route = event.rawPath || event.path || '';
  const rawBody = event.body || '{}';
  const headers = event.headers || {};

  let body: Record<string, any>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json(400, { error: 'INVALID_JSON_PAYLOAD' });
  }

  try {
    // ---------------------------------------------------------------- HesabPay
    if (route.endsWith('/webhooks/hesabpay')) {
      const secret = requireSecret('HESABPAY_SECRET_KEY');
      const signature = headers['x-hesabpay-signature'] || headers['X-HesabPay-Signature'];
      if (!verifyHmacSignature(rawBody, signature, secret)) {
        return json(401, { error: 'INVALID_SIGNATURE' });
      }

      const { transaction_id, status, tenant_id, invoice_id, amount_afn } = body;
      if (!transaction_id || !tenant_id || !invoice_id || amount_afn == null) {
        return json(400, {
          error: 'MISSING_REQUIRED_FIELDS',
          required: ['transaction_id', 'tenant_id', 'invoice_id', 'amount_afn'],
        });
      }
      if (status !== 'COMPLETED') {
        return json(200, { status: 'ACK_IGNORED', reason: `status=${status}` });
      }

      const result = await withTenantContext(tenant_id, async (client) => {
        const insert = await client.query<{ id: string }>(
          `INSERT INTO payment_transactions
             (tenant_id, invoice_id, amount_afn, payment_channel, transaction_reference,
              hesabpay_payer_mobile, is_verified, verified_at, settled_at)
           VALUES ($1, $2, $3, 'hesabpay', $4, $5, true, now(), now())
           ON CONFLICT (transaction_reference) DO NOTHING
           RETURNING id`,
          [tenant_id, invoice_id, amount_afn, transaction_id, body.payer_mobile ?? null]
        );

        if (insert.rowCount === 0) {
          return { duplicate: true as const };
        }

        const settled = await settleInvoice(client, {
          tenantId: tenant_id,
          invoiceId: invoice_id,
          amountMinor: toMinor(amount_afn),
          channel: 'hesabpay',
          reference: transaction_id,
        });

        const contact = await getTenantContact(client, tenant_id);
        return { duplicate: false as const, settled, contact };
      });

      if (result.duplicate) {
        return json(200, { status: 'ACK_DUPLICATE', idempotencyKey: transaction_id });
      }

      if (result.contact?.owner_phone) {
        await sendWhatsAppTemplate(
          result.contact.owner_phone,
          'aria_payment_receipt',
          result.contact.preferred_locale,
          [String(amount_afn), 'HesabPay', transaction_id]
        );
      }

      return json(200, {
        status: result.settled.alreadySettled ? 'ACK_ALREADY_SETTLED' : 'SETTLED',
        transactionId: transaction_id,
        invoiceId: invoice_id,
        monthsAdded: result.settled.alreadySettled ? 0 : result.settled.months,
        overpaymentMinor: result.settled.overpaymentMinor,
      });
    }

    // ------------------------------------------------------------- cash/initiate
    if (route.endsWith('/cash/initiate')) {
      const agent = await authenticateAgent(headers);
      const pepper = requireSecret('BILLING_OTP_PEPPER');

      const { tenant_id, invoice_id, amount_afn } = body;
      const amountMinor = toMinor(amount_afn ?? 0);
      if (!tenant_id || !invoice_id || amountMinor <= 0) {
        return json(400, {
          error: 'MISSING_REQUIRED_FIELDS',
          required: ['tenant_id', 'invoice_id', 'amount_afn'],
        });
      }

      // Float ceiling, checked against what this agent already holds.
      const committed = Number(agent.current_cash_held_afn) + Number(amount_afn);
      if (committed > Number(agent.max_cash_float_afn)) {
        return json(400, { error: 'AGENT_FLOAT_LIMIT_EXCEEDED' });
      }

      const otp = crypto.randomInt(100000, 1000000).toString();
      const otpHash = hashOtp(otp, pepper);

      const created = await withTenantContext(tenant_id, async (client) => {
        const invoice = await client.query(
          `SELECT id, amount_afn, status FROM invoices WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
          [invoice_id, tenant_id]
        );
        if (invoice.rowCount === 0) {
          throw new HttpError(404, 'Invoice not found for this tenant', 'INVOICE_NOT_FOUND');
        }
        if (invoice.rows[0].status === 'paid') {
          throw new HttpError(409, 'Invoice already paid', 'ALREADY_PAID');
        }
        if (amountMinor < toMinor(invoice.rows[0].amount_afn)) {
          throw new HttpError(400, 'Amount is less than the invoice total', 'UNDERPAYMENT');
        }

        const pending = await client.query(
          `SELECT 1 FROM payment_transactions
            WHERE invoice_id = $1 AND is_verified = false AND otp_expires_at > now()
            LIMIT 1`,
          [invoice_id]
        );
        if (pending.rowCount && pending.rowCount > 0) {
          throw new HttpError(409, 'A cash confirmation is already pending for this invoice', 'PENDING_EXISTS');
        }

        const tx = await client.query<{ id: string }>(
          `INSERT INTO payment_transactions
             (tenant_id, invoice_id, amount_afn, payment_channel, agent_id,
              otp_hash, otp_expires_at, otp_attempt_count, is_verified)
           VALUES ($1, $2, $3, 'field_cash', $4, $5,
                   now() + ($6::int * interval '1 minute'), 0, false)
           RETURNING id`,
          [tenant_id, invoice_id, amount_afn, agent.id, otpHash, OTP_TTL_MINUTES]
        );

        const contact = await getTenantContact(client, tenant_id);
        return { id: tx.rows[0].id, contact };
      });

      if (created.contact?.owner_phone) {
        await sendWhatsAppTemplate(
          created.contact.owner_phone,
          'aria_cash_otp_verify',
          created.contact.preferred_locale,
          [agent.full_name, String(amount_afn), otp]
        );
      }

      return json(200, {
        status: 'OTP_DISPATCHED',
        transactionId: created.id,
        expiresInSeconds: OTP_TTL_MINUTES * 60,
      });
    }

    // --------------------------------------------------------------- cash/verify
    if (route.endsWith('/cash/verify')) {
      const agent = await authenticateAgent(headers);
      const pepper = requireSecret('BILLING_OTP_PEPPER');

      const { tenant_id, transaction_id, entered_otp } = body;
      if (!tenant_id || !transaction_id || typeof entered_otp !== 'string') {
        return json(400, {
          error: 'MISSING_REQUIRED_FIELDS',
          required: ['tenant_id', 'transaction_id', 'entered_otp'],
        });
      }

      const outcome = await withTenantContext(tenant_id, async (client) => {
        const txRes = await client.query<{
          id: string;
          agent_id: string;
          invoice_id: string;
          amount_afn: string;
          otp_hash: string | null;
          otp_expires_at: string;
          otp_attempt_count: number;
          is_verified: boolean;
        }>(
          `SELECT id, agent_id, invoice_id, amount_afn, otp_hash, otp_expires_at,
                  otp_attempt_count, is_verified
             FROM payment_transactions
            WHERE id = $1 AND tenant_id = $2
            FOR UPDATE`,
          [transaction_id, tenant_id]
        );

        const tx = txRes.rows[0];
        if (!tx) throw new HttpError(404, 'Transaction not found', 'TX_NOT_FOUND');

        // An agent may only confirm their own collections.
        if (tx.agent_id !== agent.id) {
          throw new HttpError(403, 'This transaction belongs to another agent', 'FORBIDDEN');
        }
        if (tx.is_verified) throw new HttpError(409, 'Transaction already verified', 'ALREADY_VERIFIED');
        if (tx.otp_attempt_count >= MAX_OTP_ATTEMPTS) {
          throw new HttpError(429, 'Too many attempts; request a new code', 'OTP_MAX_ATTEMPTS');
        }
        if (!tx.otp_expires_at || new Date(tx.otp_expires_at) < new Date()) {
          throw new HttpError(400, 'OTP expired; request a new code', 'OTP_EXPIRED');
        }
        if (!tx.otp_hash || !safeEqual(tx.otp_hash, hashOtp(entered_otp.trim(), pepper))) {
          await client.query(
            `UPDATE payment_transactions
                SET otp_attempt_count = otp_attempt_count + 1
              WHERE id = $1`,
            [transaction_id]
          );
          return { kind: 'bad_otp' as const, attemptsLeft: MAX_OTP_ATTEMPTS - tx.otp_attempt_count - 1 };
        }

        const settled = await settleInvoice(client, {
          tenantId: tenant_id,
          invoiceId: tx.invoice_id,
          amountMinor: toMinor(tx.amount_afn),
          channel: 'field_cash',
          reference: `CASH-${transaction_id.slice(0, 8).toUpperCase()}`,
        });

        const receiptRef = `CASH-${transaction_id.slice(0, 8).toUpperCase()}`;

        await client.query(
          `UPDATE payment_transactions
              SET is_verified = true,
                  verified_at = now(),
                  settled_at = now(),
                  otp_hash = NULL,
                  transaction_reference = $2
            WHERE id = $1`,
          [transaction_id, receiptRef]
        );

        await client.query(
          `UPDATE billing_agents
              SET current_cash_held_afn = current_cash_held_afn + $1
            WHERE id = $2`,
          [tx.amount_afn, agent.id]
        );

        const contact = await getTenantContact(client, tenant_id);
        return { kind: 'settled' as const, settled, receiptRef, amountAfn: tx.amount_afn, contact };
      });

      if (outcome.kind === 'bad_otp') {
        return json(400, { error: 'INVALID_OTP', attemptsLeft: outcome.attemptsLeft });
      }

      if (outcome.contact?.owner_phone) {
        await sendWhatsAppTemplate(
          outcome.contact.owner_phone,
          'aria_payment_receipt',
          outcome.contact.preferred_locale,
          [String(outcome.amountAfn), 'Field Agent Cash', outcome.receiptRef]
        );
      }

      return json(200, {
        status: 'PAYMENT_CONFIRMED',
        receiptReference: outcome.receiptRef,
        monthsAdded: outcome.settled.months,
      });
    }

    return json(404, { error: 'ROUTE_NOT_FOUND' });
  } catch (error) {
    if (error instanceof HttpError) {
      return json(error.statusCode, { error: error.code, message: error.message });
    }
    console.error('[billing] unhandled error:', error);
    return json(500, { error: 'INTERNAL_BILLING_ERROR' });
  }
};
