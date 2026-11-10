import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { enqueueJob } from '@aria-cloud/database';
import { enforceRateLimits } from '@aria-cloud/auth';

export const runtime = 'nodejs';

const ALLOWED_JOB_TYPES = new Set([
  'generate_voice',
  'generate_image',
  'build_storefront',
  'deploy_app',
]);

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  try {
    const limited = await enforceRateLimits([
      { key: `jobs:user:${session.userId}`, limit: 30, windowSeconds: 60 },
    ]);
    if (limited) return limited;

    const body = await req.json().catch(() => null);
    const jobType = typeof body?.jobType === 'string' ? body.jobType.trim() : '';
    const payload = typeof body?.payload === 'object' && body.payload !== null ? body.payload : {};

    if (!ALLOWED_JOB_TYPES.has(jobType)) {
      return NextResponse.json(
        { error: `Invalid jobType. Allowed: ${[...ALLOWED_JOB_TYPES].join(', ')}` },
        { status: 400 }
      );
    }

    const { id } = await enqueueJob(session.tenantId, jobType, payload);

    return NextResponse.json(
      {
        ok: true,
        jobId: id,
        status: 'pending',
        message: 'Job enqueued successfully for asynchronous processing.',
      },
      { status: 202 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to enqueue job.' }, { status: 500 });
  }
}
