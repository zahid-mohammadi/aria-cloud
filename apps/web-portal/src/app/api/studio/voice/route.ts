import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { generateVoice, toHttpError } from '@aria-cloud/api';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  try {
    const result = await generateVoice(session.tenantId, await req.json());
    return NextResponse.json(result);
  } catch (error) {
    const e = toHttpError(error);
    return NextResponse.json({ error: e.error, message: e.message }, { status: e.status });
  }
}
