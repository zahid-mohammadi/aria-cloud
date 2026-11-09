import { NextRequest, NextResponse } from 'next/server';
import { getTenantOverview } from '@aria-cloud/database';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

/**
 * The merchant console does NOT settle payments itself. Settlement is driven
 * server-side by the HesabPay webhook or by an authenticated field agent
 * (cash OTP). This endpoint returns the real wallet state and the available
 * payment channels instead of fabricating a "SETTLED" transaction.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    if (process.env.DATABASE_URL) {
      const overview = await getTenantOverview(session.tenantId);
      return NextResponse.json({ mode: 'live', overview });
    }

    return NextResponse.json({
      mode: 'unconfigured',
      overview: null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load billing overview.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    return NextResponse.json({
      ok: true,
      mode: 'external',
      channels: ['hesabpay_qr', 'doorstep_cash'],
      message:
        'Payment is completed via the HesabPay QR or doorstep cash. Settlement is recorded automatically — no action is needed here.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Billing request failed.' }, { status: 500 });
  }
}
