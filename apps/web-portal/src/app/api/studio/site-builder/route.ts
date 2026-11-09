import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { buildStorefront, toHttpError } from '@aria-cloud/api';
import { enforceRateLimits } from '@aria-cloud/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  try {
    // Shared across instances (PostgreSQL-backed); credits cap spend, this caps bursts.
    const limited = await enforceRateLimits([
      { key: `studio:user:${session.userId}`, limit: 20, windowSeconds: 60 },
      { key: `studio:site_builder:tenant:${session.tenantId}`, limit: 30, windowSeconds: 60 * 60 },
    ]);
    if (limited) return limited;

    const result = await buildStorefront(session.tenantId, await req.json());
    return NextResponse.json(result);
  } catch (error) {
    const e = toHttpError(error);
    return NextResponse.json({ error: e.error, message: e.message }, { status: e.status });
  }
}
