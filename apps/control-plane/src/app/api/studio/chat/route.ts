import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-session';
import { audit } from '@/lib/audit';
import { chatAssistant, toHttpError } from '@aria-cloud/api';
import { enforceRateLimits } from '@aria-cloud/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  await audit(req, auth.session, 'api.studio.chat');
  try {
    // Shared across instances (PostgreSQL-backed); credits cap spend, this caps bursts.
    const limited = await enforceRateLimits([
      { key: `studio:user:${auth.session.userId}`, limit: 20, windowSeconds: 60 },
    ]);
    if (limited) return limited;

    const result = await chatAssistant(auth.session.tenantId, await req.json());
    return NextResponse.json(result);
  } catch (error) {
    const e = toHttpError(error);
    return NextResponse.json({ error: e.error, message: e.message }, { status: e.status });
  }
}
