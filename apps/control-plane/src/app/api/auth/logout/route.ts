import { NextResponse, type NextRequest } from 'next/server';
import { recordAuditEvent, resolveSession, revokeSession } from '@aria-cloud/auth';
import { SESSION_COOKIE } from '@aria-cloud/auth/constants';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      const session = await resolveSession(token);
      if (session) {
        await recordAuditEvent({
          actorUserId: session.userId,
          actorEmail: session.email,
          action: 'admin.logout',
          targetTenantId: session.tenantId,
        });
      }
      await revokeSession(token);
    } catch (error) {
      console.error('[admin/logout]', error);
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}
