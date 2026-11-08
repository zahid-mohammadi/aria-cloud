import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-session';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  return NextResponse.json({
    user: {
      id: auth.session.userId,
      email: auth.session.email,
      fullName: auth.session.fullName,
      tenantId: auth.session.tenantId,
      isPlatformAdmin: true,
    },
    expiresAt: auth.session.expiresAt,
  });
}
