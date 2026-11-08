import { NextResponse, type NextRequest } from 'next/server';
import {
  findCredentialsByEmail,
  issueAuthToken,
  sendTransactionalEmail,
} from '@aria-cloud/auth';

export const runtime = 'nodejs';

const GENERIC_MESSAGE = 'If that account exists, a reset link has been sent.';

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin && host && new URL(origin).host !== host) {
    return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }

  // Always return the same response, whether or not the account exists, so
  // this endpoint cannot be used to enumerate merchants.
  try {
    const credentials = await findCredentialsByEmail(email);

    if (credentials) {
      const token = await issueAuthToken(credentials.user_id, 'password_reset', 60);
      const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
      const link = `${base}/reset?token=${encodeURIComponent(token)}`;

      await sendTransactionalEmail({
        to: credentials.email,
        subject: 'Reset your AriaCloud password',
        text:
          `Someone requested a password reset for your AriaCloud account.\n\n` +
          `Reset it here (valid for 60 minutes):\n${link}\n\n` +
          `If this wasn't you, you can ignore this email — your password has not changed.`,
        html:
          `<p>Someone requested a password reset for your AriaCloud account.</p>` +
          `<p><a href="${link}">Reset your password</a> — this link is valid for 60 minutes.</p>` +
          `<p>If this wasn't you, you can ignore this email; your password has not changed.</p>`,
      });
    }
  } catch (error) {
    // Log, but still return the generic response.
    console.error('[auth/forgot]', error);
  }

  return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
}
