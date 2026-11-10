import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@aria-cloud/auth/constants';

/**
 * Cheap gate: redirects signed-out browsers to /login and returns 401 JSON for
 * API calls. It deliberately does NOT trust the cookie — it only checks that
 * one is present. `lib/session.ts` performs the real, database-backed
 * validation in each route, because middleware runs on the edge runtime and
 * cannot reach PostgreSQL.
 */
const PUBLIC_PAGES = ['/', '/login', '/signup', '/forgot', '/reset'];
const PUBLIC_API = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/auth/forgot',
  '/api/auth/reset',
];

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (PUBLIC_PAGES.includes(pathname) || PUBLIC_API.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (req.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  if (pathname !== '/') url.searchParams.set('next', pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|css|js|woff2?)$).*)',
  ],
};
