import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      method = 'HESABPAY',
      amountAfn = 1450,
      otpCode = '',
      invoiceId = 'INV-2026-1108',
    } = body;

    if (method === 'CASH_VOUCHER_OTP') {
      const cleaned = String(otpCode).trim();
      if (!/^\d{6}$/.test(cleaned)) {
        return NextResponse.json(
          {
            error:
              'Invalid 6-digit Cash/Hawala OTP voucher code. Enter 6 numeric digits (e.g. 849201).',
          },
          { status: 400 }
        );
      }
    }

    const afn = Number(amountAfn) || 1450;
    const usdCents = Math.round((afn / 72.5) * 100);
    const creditsAdded = usdCents;
    const txId = `tx_${method.toLowerCase()}_${Date.now().toString(36)}`;

    return NextResponse.json({
      ok: true,
      transactionId: txId,
      invoiceId,
      method,
      amountAfn: afn,
      amountUsdCents: usdCents,
      creditsAdded,
      idempotencyKey: `idem_${invoiceId}_${Date.now().toString(36)}`,
      status: 'SETTLED',
      settledAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Settlement failed' },
      { status: 500 }
    );
  }
}
