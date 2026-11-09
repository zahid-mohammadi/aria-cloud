import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { listEmail, provisionMailbox, toHttpError } from '@aria-cloud/api';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  try {
    return NextResponse.json(await listEmail(session.tenantId));
  } catch (error) {
    const e = toHttpError(error);
    return NextResponse.json({ error: e.error, message: e.message }, { status: e.status });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  try {
    const body = await req.json();
    const result = await provisionMailbox(session.tenantId, body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const e = toHttpError(error);
    return NextResponse.json({ error: e.error, message: e.message }, { status: e.status });
  }
}
