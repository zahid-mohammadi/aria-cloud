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

// Admin sessions are deliberately short-lived compared with merchant sessions.
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

const DUMMY_HASH =
  'scrypt$32768$8$1$bSmmKieXlHIVQkVx5TJHhQ==$he2kb4FG8A9NMyDcJHEcfk0bgU2qRogLb4qv5F8/sjitl2T1QOvJWGC7wablzKOkcrr3uwSJQDh2MMzgFjMRoQ==';

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin && host && new URL(origin).host !== host) {
    return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  try {
    const credentials = await findCredentialsByEmail(email);

    if (credentials?.locked_until && new Date(credentials.locked_until) > new Date()) {
      return NextResponse.json(
        { error: 'Too many failed attempts. Try again in a few minutes.' },
        { status: 429 }
      );
    }

    const passwordOk = await verifyPassword(password, credentials?.password_hash ?? DUMMY_HASH);

    if (!credentials || !passwordOk) {
      if (credentials) await recordFailedLogin(credentials.user_id);
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // Correct password but not an administrator: refuse, and do not create a
    // session. Do not count this as a failed login (the credentials are valid;
    // this is simply the wrong console).
    if (!credentials.is_platform_admin) {
      console.warn('[admin/login] rejected non-admin account:', credentials.email);
      return NextResponse.json(
        { error: 'This account is not authorized for platform administration.' },
        { status: 403 }
      );
    }

    await recordSuccessfulLogin(credentials.user_id);

    const { token, expiresAt } = await createSession({
      userId: credentials.user_id,
      tenantId: credentials.tenant_id,
      ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      userAgent: req.headers.get('user-agent'),
      ttlSeconds: ADMIN_SESSION_TTL_SECONDS,
    });

    console.info('[admin/login]', credentials.email, 'signed in');

    const response = NextResponse.json({
      ok: true,
      user: {
        email: credentials.email,
        tenantId: credentials.tenant_id,
        isPlatformAdmin: true,
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
    console.error('[admin/login]', error);
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 });
  }
}
