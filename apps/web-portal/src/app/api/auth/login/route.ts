import { NextResponse, type NextRequest } from 'next/server';
import {
  createSession,
  findCredentialsByEmail,
  recordFailedLogin,
  recordSuccessfulLogin,
  verifyPassword,
} from '@aria-cloud/auth';
import { SESSION_COOKIE } from '@aria-cloud/auth/constants';

export const runtime = 'nodejs';

// A real scrypt hash of a random string. Verified against when no account
// exists, so that a missing account costs the same time as a wrong password
// (prevents user enumeration by response timing).
const DUMMY_HASH =
  'scrypt$32768$8$1$bSmmKieXlHIVQkVx5TJHhQ==$he2kb4FG8A9NMyDcJHEcfk0bgU2qRogLb4qv5F8/sjitl2T1QOvJWGC7wablzKOkcrr3uwSJQDh2MMzgFjMRoQ==';

export async function POST(req: NextRequest) {
  // Same-origin check: the session is a cookie, so cross-site POSTs must be
  // rejected even though the cookie is SameSite=Lax.
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin && host && new URL(origin).host !== host) {
    return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required.' },
      { status: 400 }
    );
  }

  try {
    const credentials = await findCredentialsByEmail(email);

    if (credentials?.locked_until && new Date(credentials.locked_until) > new Date()) {
      return NextResponse.json(
        { error: 'Too many failed attempts. Try again in a few minutes.' },
        { status: 429 }
      );
    }

    const passwordOk = await verifyPassword(
      password,
      credentials?.password_hash ?? DUMMY_HASH
    );

    if (!credentials || !passwordOk) {
      if (credentials) await recordFailedLogin(credentials.user_id);
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    await recordSuccessfulLogin(credentials.user_id);

    const { token, expiresAt } = await createSession({
      userId: credentials.user_id,
      tenantId: credentials.tenant_id,
      ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      userAgent: req.headers.get('user-agent'),
    });

    const response = NextResponse.json({
      ok: true,
      user: {
        email: credentials.email,
        tenantId: credentials.tenant_id,
        emailVerified: Boolean(credentials.email_verified_at),
        isPlatformAdmin: credentials.is_platform_admin,
      },
    });

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      expires: expiresAt,
    });

    return response;
  } catch (error) {
    console.error('[auth/login]', error);
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 });
  }
}
