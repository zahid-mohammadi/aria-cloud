import {
  claimNextJob,
  completeJob,
  failJob,
  type JobRow,
} from '@aria-cloud/database';
import { generateImage, generateVoice } from './studio';
import { buildStorefront } from './site-builder';
import { deployApp } from './apps';

export const SUPPORTED_JOB_TYPES = [
  'generate_voice',
  'generate_image',
  'build_storefront',
  'deploy_app',
] as const;

export type SupportedJobType = (typeof SUPPORTED_JOB_TYPES)[number];

export interface ProcessedJobOutcome {
  processed: boolean;
  jobId?: string;
  jobType?: string;
  status?: 'completed' | 'failed_or_retrying';
  error?: string;
}

/**
 * Executes a claimed job row against the appropriate AriaCloud domain handler.
 */
export async function dispatchJobPayload(job: JobRow): Promise<Record<string, any>> {
  const payload = (job.payload ?? {}) as Record<string, any>;

  switch (job.job_type) {
    case 'generate_voice': {
      const result = await generateVoice(job.tenant_id, payload as any);
      return (result ?? {}) as Record<string, any>;
    }
    case 'generate_image': {
      const result = await generateImage(job.tenant_id, payload as any);
      return (result ?? {}) as Record<string, any>;
    }
    case 'build_storefront': {
      const result = (await buildStorefront(job.tenant_id, payload as any)) as Record<string, any>;
      // Omit full HTML string from job_queue JSONB result if huge; return deployment metadata
      const { previewHtml: _preview, ...summary } = result;
      return summary;
    }
    case 'deploy_app': {
      const result = await deployApp(job.tenant_id, payload as any);
      return (result ?? {}) as unknown as Record<string, any>;
    }
    default:
      throw new Error(`Unsupported job type: ${job.job_type}`);
  }
}

/**
 * Claims and executes the next pending job in the PostgreSQL queue.
 * Uses FOR UPDATE SKIP LOCKED via `claimNextJob`.
 */
export async function processNextJob(
  workerId = `worker-${process.pid}`
): Promise<ProcessedJobOutcome> {
  const job = await claimNextJob(workerId, [...SUPPORTED_JOB_TYPES]);
  if (!job) {
    return { processed: false };
  }

  try {
    const result = await dispatchJobPayload(job);
    await completeJob(job.id, result);
    return {
      processed: true,
      jobId: job.id,
      jobType: job.job_type,
      status: 'completed',
    };
  } catch (err: any) {
    const message = err?.message || 'Job execution failed';
    await failJob(job.id, message);
    return {
      processed: true,
      jobId: job.id,
      jobType: job.job_type,
      status: 'failed_or_retrying',
      error: message,
    };
  }
}

/**
 * Starts a continuous polling loop for standalone background worker processes.
 */
export function runJobWorkerLoop(options?: {
  workerId?: string;
  pollIntervalMs?: number;
  onOutcome?: (outcome: ProcessedJobOutcome) => void;
  onError?: (err: unknown) => void;
}): { stop: () => void } {
  const workerId = options?.workerId || `aria-worker-${process.pid}`;
  const pollIntervalMs = Math.max(250, options?.pollIntervalMs ?? 2000);
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function tick() {
    if (stopped) return;
    try {
      const outcome = await processNextJob(workerId);
      if (outcome.processed) {
        options?.onOutcome?.(outcome);
        // Immediately check for another queued job when work was found
        if (!stopped) {
          timer = setTimeout(tick, 50);
          return;
        }
      }
    } catch (err) {
      options?.onError?.(err);
    }
    if (!stopped) {
      timer = setTimeout(tick, pollIntervalMs);
    }
  }

  timer = setTimeout(tick, 100);

  return {
    stop: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
  };
}
