import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { enqueueJob, listTenantJobs } from '@aria-cloud/database';
import { enforceRateLimits } from '@aria-cloud/auth';
import { processNextJob, SUPPORTED_JOB_TYPES } from '@aria-cloud/api';

export const runtime = 'nodejs';

const ALLOWED_JOB_TYPES = new Set<string>(SUPPORTED_JOB_TYPES);

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  try {
    const jobs = await listTenantJobs(session.tenantId, 25);
    return NextResponse.json({ jobs });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch jobs.' }, { status: 500 });
  }
}

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

    // Kick off in-process background execution unless a dedicated worker process is active
    if (process.env.EXTERNAL_JOB_WORKER !== 'true') {
      setImmediate(() => {
        void processNextJob(`web-async-${process.pid}`).catch((err) => {
          console.error('[jobs] async background execution error:', err);
        });
      });
    }

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
