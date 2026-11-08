import { NextResponse } from 'next/server';
import { getSession, unauthorized } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  return NextResponse.json({
    user: {
      id: session.userId,
      email: session.email,
      fullName: session.fullName,
      role: session.role,
      tenantId: session.tenantId,
      isPlatformAdmin: session.isPlatformAdmin,
    },
    expiresAt: session.expiresAt,
  });
}
