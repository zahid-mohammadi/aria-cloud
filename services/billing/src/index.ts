/**
 * AriaCloud billing: HesabPay settlement + double-entry ledger.
 *
 * Payment rails: HesabPay only. Field-agent cash collection and hawala were
 * removed so the platform is a HesabPay merchant (a customer of a licensed
 * payment transmitter) rather than a money-services business itself.
 *
 * Invariants this file is responsible for:
 *  - a payment only settles an invoice that belongs to the paying tenant,
 *    and only once
 *  - the subscription is extended by the invoice's own billing period, never a
 *    flat 365 days
 *  - every settlement writes balanced double-entry rows (debits == credits)
 *
 * Missing configuration is a hard failure (503), never a silent bypass.
 */
import crypto from 'node:crypto';
import type { PoolClient } from 'pg';
import { pool, withTenantContext } from '@aria-cloud/database';

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

/** Money is compared in minor units (pul); never as floats. */
const toMinor = (afn: string | number): number => Math.round(Number(afn) * 100);

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
  // A payment lifts a billing grace period, but never overrides an
  // administrative suspension or archive — those are lifted by an admin.
  await client.query(
    `UPDATE tenants
        SET subscription_end_date = GREATEST(subscription_end_date, now())
                                    + ($2::int * interval '1 month'),
            account_status = CASE
              WHEN account_status IN ('suspended', 'archived') THEN account_status
              ELSE 'active'
            END,
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

      // Sanctions check: never settle a blocked tenant.
      const ofacRes = await pool.query<{ ofac_screening_status: string }>(
        `SELECT ofac_screening_status FROM tenants WHERE id = $1 LIMIT 1`,
        [tenant_id]
      );
      if (ofacRes.rows[0]?.ofac_screening_status === 'blocked') {
        return json(403, { error: 'TENANT_SANCTIONS_BLOCKED' });
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

    return json(404, { error: 'ROUTE_NOT_FOUND' });
  } catch (error) {
    if (error instanceof HttpError) {
      return json(error.statusCode, { error: error.code, message: error.message });
    }
    console.error('[billing] unhandled error:', error);
    return json(500, { error: 'INTERNAL_BILLING_ERROR' });
  }
};
