import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getAiStudioOverview, toHttpError } from '@aria-cloud/api';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  try {
    return NextResponse.json(await getAiStudioOverview(session.tenantId));
  } catch (error) {
    const e = toHttpError(error);
    return NextResponse.json({ error: e.error, message: e.message }, { status: e.status });
  }
}
