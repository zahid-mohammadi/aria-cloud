import { NextResponse, type NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import {
  clientIp,
  createAccount,
  createSession,
  enforceRateLimits,
  findCredentialsByEmail,
} from '@aria-cloud/auth';
import { SESSION_COOKIE } from '@aria-cloud/auth/constants';
import { normalizeLocale, pool, withTenantContext } from '@aria-cloud/database';

export const runtime = 'nodejs';

const SUBDOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'app',
  'cdn',
  'mail',
  'console',
  'portal',
  'status',
  'auth',
  'billing',
  'www',
  'root',
  'static',
  'staging',
  'prod',
  'dev',
  'test',
  'help',
  'support',
  'docs',
  'assets',
  'system',
]);

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin && host && new URL(origin).host !== host) {
    return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403 });
  }

  const ip = clientIp(req.headers);
  // IP rate limiting: max 5 signups per hour per IP
  const limited = await enforceRateLimits([
    { key: `portal:signup:ip:${ip}`, limit: 5, windowSeconds: 60 * 60 },
  ]);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const businessName = typeof body?.businessName === 'string' ? body.businessName.trim() : '';
  const subdomain = typeof body?.subdomain === 'string' ? body.subdomain.trim().toLowerCase() : '';
  const fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const phone = typeof body?.phone === 'string' ? body.phone.trim() : null;
  const locale = normalizeLocale(body?.locale);

  if (!businessName) {
    return NextResponse.json({ error: 'Business name is required.' }, { status: 400 });
  }
  if (!fullName) {
    return NextResponse.json({ error: 'Full name is required.' }, { status: 400 });
  }
  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: 'Valid email address is required.' }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }
  if (!subdomain || !SUBDOMAIN_REGEX.test(subdomain)) {
    return NextResponse.json(
      { error: 'Subdomain must be 3-63 lowercase alphanumeric characters and hyphens.' },
      { status: 400 }
    );
  }
  if (RESERVED_SLUGS.has(subdomain)) {
    return NextResponse.json({ error: 'This subdomain is reserved. Please choose another.' }, { status: 400 });
  }

  try {
    // 1. Check if email already registered
    const existingCreds = await findCredentialsByEmail(email);
    if (existingCreds) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please log in.' },
        { status: 409 }
      );
    }

    // 2. Check if subdomain already claimed
    const existingSubdomain = await pool.query<{ id: string }>(
      `SELECT id FROM tenants WHERE lower(subdomain) = lower($1) LIMIT 1`,
      [subdomain]
    );
    if (existingSubdomain.rowCount && existingSubdomain.rowCount > 0) {
      return NextResponse.json(
        { error: `The subdomain "${subdomain}" is already taken. Please choose another.` },
        { status: 409 }
      );
    }

    // 3. Atomically create tenant
    const tenantId = randomUUID();
    await pool.query(
      `INSERT INTO tenants
         (id, business_name, subdomain, owner_phone, preferred_locale, plan_tier, account_status)
       VALUES ($1, $2, $3, $4, $5, 'starter_af', 'active')`,
      [tenantId, businessName, subdomain, phone, locale]
    );

    // Initialize tenant wallets inside tenant RLS context
    await withTenantContext(tenantId, async (client) => {
      await client.query(
        `INSERT INTO wallets (tenant_id, afn_balance_pul, usd_balance_cents)
         VALUES ($1, 0, 0)
         ON CONFLICT (tenant_id) DO NOTHING`,
        [tenantId]
      );
      await client.query(
        `INSERT INTO ai_credit_wallets (tenant_id, credit_balance, monthly_credit_quota)
         VALUES ($1, 25000, 25000)
         ON CONFLICT (tenant_id) DO NOTHING`,
        [tenantId]
      );
    });

    // 4. Create owner user account & credentials
    const { userId } = await createAccount({
      tenantId,
      email,
      password,
      fullName,
      phoneNumber: phone,
      role: 'owner',
    });

    // 5. Establish session & issue cookie
    const { token, expiresAt } = await createSession({
      userId,
      tenantId,
      ipAddress: ip,
      userAgent: req.headers.get('user-agent'),
    });

    const response = NextResponse.json({
      ok: true,
      user: {
        email,
        fullName,
        tenantId,
        subdomain,
      },
      redirect: '/dashboard',
    });

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      expires: expiresAt,
    });

    return response;
  } catch (error: any) {
    console.error('[auth/signup]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}
