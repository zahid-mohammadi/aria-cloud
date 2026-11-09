import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-session';
import { audit } from '@/lib/audit';
import { deployApp, getApp, listApps, pauseApp, resumeApp, toHttpError } from '@aria-cloud/api';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const id = req.nextUrl.searchParams.get('id');
  try {
    if (id) {
      return NextResponse.json(await getApp(auth.session.tenantId, id));
    }
    return NextResponse.json({ apps: await listApps(auth.session.tenantId) });
  } catch (error) {
    const e = toHttpError(error);
    return NextResponse.json({ error: e.error, message: e.message }, { status: e.status });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  await audit(req, auth.session, 'api.apps');

  const body = await req.json();
  try {
    if (body.action === 'pause') {
      return NextResponse.json(await pauseApp(auth.session.tenantId, body.deploymentId));
    }
    if (body.action === 'resume') {
      return NextResponse.json(await resumeApp(auth.session.tenantId, body.deploymentId));
    }
    const result = await deployApp(auth.session.tenantId, body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const e = toHttpError(error);
    return NextResponse.json({ error: e.error, message: e.message }, { status: e.status });
  }
}
