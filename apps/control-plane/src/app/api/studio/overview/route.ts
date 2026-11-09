import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-session';
import { getAiStudioOverview, toHttpError } from '@aria-cloud/api';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  try {
    return NextResponse.json(await getAiStudioOverview(auth.session.tenantId));
  } catch (error) {
    const e = toHttpError(error);
    return NextResponse.json({ error: e.error, message: e.message }, { status: e.status });
  }
}
