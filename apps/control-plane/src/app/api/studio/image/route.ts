import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-session';
import { audit } from '@/lib/audit';
import { generateImage, toHttpError } from '@aria-cloud/api';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  await audit(req, auth.session, 'api.studio.image');
  try {
    const result = await generateImage(auth.session.tenantId, await req.json());
    return NextResponse.json(result);
  } catch (error) {
    const e = toHttpError(error);
    return NextResponse.json({ error: e.error, message: e.message }, { status: e.status });
  }
}
