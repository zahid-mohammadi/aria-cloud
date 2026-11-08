import { NextResponse, type NextRequest } from 'next/server';
import { consumeAuthToken, setPassword } from '@aria-cloud/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin && host && new URL(origin).host !== host) {
    return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const token = typeof body?.token === 'string' ? body.token.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!token) {
    return NextResponse.json({ error: 'Reset token is missing.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters.' },
      { status: 400 }
    );
  }

  try {
    // Single-use: consumeAuthToken is an atomic UPDATE ... WHERE consumed_at IS NULL.
    const consumed = await consumeAuthToken(token, 'password_reset');
    if (!consumed) {
      return NextResponse.json(
        { error: 'This reset link is invalid or has expired. Request a new one.' },
        { status: 400 }
      );
    }

    // setPassword also revokes every existing session for the account, so a
    // stolen session does not survive a password reset.
    await setPassword(consumed.userId, password);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[auth/reset]', error);
    return NextResponse.json({ error: 'Could not reset the password.' }, { status: 500 });
  }
}
