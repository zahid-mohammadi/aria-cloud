import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getJobStatus } from '@aria-cloud/database';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const jobId = params?.id;
  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
  }

  try {
    const job = await getJobStatus(session.tenantId, jobId);
    if (!job) {
      return NextResponse.json({ error: 'JOB_NOT_FOUND', message: 'Job not found.' }, { status: 404 });
    }

    return NextResponse.json({
      id: job.id,
      jobType: job.job_type,
      status: job.status,
      result: job.result,
      errorMessage: job.error_message,
      attempts: job.attempts,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      completedAt: job.completed_at,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch job status.' }, { status: 500 });
  }
}
