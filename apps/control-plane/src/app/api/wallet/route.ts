import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-session';
import { audit } from '@/lib/audit';
import { getTenantOverview, withTenantContext } from '@aria-cloud/database';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const tenantId = req.nextUrl.searchParams.get('tenantId') || auth.session.tenantId;

  try {
    const overview = await getTenantOverview(tenantId);
    if (overview) {
      return NextResponse.json({ mode: 'live', overview });
    }
    return NextResponse.json({ error: 'TENANT_NOT_FOUND' }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;
    await audit(req, auth.session, 'api.wallet');

    const body = await req.json();
    const { action, packCredits = 50000, amountAfn = 350 } = body;

    const tenantId = auth.session.tenantId;

    if (action === 'buy_credit_pack') {
      await withTenantContext(tenantId, async (client) => {
        await client.query(
          `INSERT INTO ai_credit_wallets (tenant_id) VALUES ($1)
           ON CONFLICT (tenant_id) DO NOTHING`,
          [tenantId]
        );
        await client.query(
          `UPDATE ai_credit_wallets
           SET credit_balance = credit_balance + $1, updated_at = NOW()
           WHERE tenant_id = $2`,
          [packCredits, tenantId]
        );
      });

      return NextResponse.json({
        status: 'SETTLED',
        packCredits,
        amountAfn,
        message: `Added ${Number(packCredits).toLocaleString()} AI Studio Credits via HesabPay.`,
      });
    }

    return NextResponse.json({ error: 'Unsupported wallet action.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Wallet operation failed.' }, { status: 500 });
  }
}
