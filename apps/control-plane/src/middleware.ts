import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@aria-cloud/auth/constants';

/**
 * Gate for the platform control plane. Presence of a cookie only — the real
 * check (valid session + is_platform_admin) happens in `lib/admin-session.ts`,
 * because middleware runs on the edge runtime without database access.
 */
const PUBLIC_PAGE = '/login';
const PUBLIC_API = ['/api/auth/login', '/api/auth/logout', '/api/auth/me'];

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (pathname === PUBLIC_PAGE || PUBLIC_API.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (req.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = PUBLIC_PAGE;
  url.search = '';
  if (pathname !== '/') url.searchParams.set('next', pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|css|js|woff2?)$).*)',
  ],
};
