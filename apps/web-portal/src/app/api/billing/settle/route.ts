import { NextRequest, NextResponse } from 'next/server';
import { getTenantOverview, withTenantContext } from '@aria-cloud/database';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

/**
 * The merchant console does NOT settle payments itself. Settlement is driven
 * server-side by the HesabPay webhook. This endpoint returns the real wallet
 * state, invoices, payment history, and HesabPay checkout details.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    if (process.env.DATABASE_URL) {
      const overview = await getTenantOverview(session.tenantId);
      const { invoices, transactions } = await withTenantContext(session.tenantId, async (client) => {
        const invRes = await client.query(
          `SELECT id, invoice_number, amount_afn, billing_period_months, status, due_date, paid_at, created_at
             FROM invoices
            WHERE tenant_id = $1
            ORDER BY created_at DESC
            LIMIT 25`,
          [session.tenantId]
        );
        const txRes = await client.query(
          `SELECT id, invoice_id, amount_afn, payment_channel, transaction_reference, is_verified, verified_at, created_at
             FROM payment_transactions
            WHERE tenant_id = $1
            ORDER BY created_at DESC
            LIMIT 25`,
          [session.tenantId]
        );
        return { invoices: invRes.rows, transactions: txRes.rows };
      });

      return NextResponse.json({ mode: 'live', overview, invoices, transactions });
    }

    return NextResponse.json({
      mode: 'unconfigured',
      overview: null,
      invoices: [],
      transactions: [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load billing overview.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const invoiceId = typeof body?.invoiceId === 'string' ? body.invoiceId.trim() : '';

    if (invoiceId && process.env.DATABASE_URL) {
      const invoice = await withTenantContext(session.tenantId, async (client) => {
        const res = await client.query<{
          id: string;
          invoice_number: string;
          amount_afn: string;
          status: string;
        }>(
          `SELECT id, invoice_number, amount_afn, status
             FROM invoices
            WHERE id = $1 AND tenant_id = $2
            LIMIT 1`,
          [invoiceId, session.tenantId]
        );
        return res.rows[0] ?? null;
      });

      if (!invoice) {
        return NextResponse.json({ error: 'INVOICE_NOT_FOUND' }, { status: 404 });
      }
      if (invoice.status === 'paid') {
        return NextResponse.json({ error: 'INVOICE_ALREADY_PAID' }, { status: 409 });
      }

      const merchantCode = process.env.HESABPAY_MERCHANT_CODE || 'ARIACLOUD-AF';
      const checkoutUrl = `https://pay.hesab.com/?merchant=${encodeURIComponent(merchantCode)}&ref=${encodeURIComponent(
        invoice.invoice_number
      )}&amount=${encodeURIComponent(invoice.amount_afn)}&currency=AFN`;

      return NextResponse.json({
        ok: true,
        mode: 'external',
        channels: ['hesabpay_qr'],
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        amountAfn: Number(invoice.amount_afn),
        merchantCode,
        checkoutUrl,
        message:
          'Complete payment in HesabPay using the checkout link or merchant reference. Webhook settlement updates your invoice automatically.',
      });
    }

    return NextResponse.json({
      ok: true,
      mode: 'external',
      channels: ['hesabpay_qr'],
      message:
        'Payment is completed via the HesabPay QR. Settlement is recorded automatically — no action is needed here.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Billing request failed.' }, { status: 500 });
  }
}
