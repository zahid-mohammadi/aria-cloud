#!/usr/bin/env node
/**
 * Standalone AriaCloud Async Job Queue Worker
 * Polls PostgreSQL `job_queue` via `FOR UPDATE SKIP LOCKED` and executes
 * long-running AI voice, image, storefront build, and app deployment jobs.
 */
import { runJobWorkerLoop } from '../dist/index.js';

if (!process.env.DATABASE_URL) {
  console.error('[job-worker] DATABASE_URL is required to run the job queue worker.');
  process.exit(1);
}

console.log('[job-worker] Starting AriaCloud background job worker...');
const loop = runJobWorkerLoop({
  workerId: `worker-${process.pid}`,
  pollIntervalMs: Number(process.env.JOB_POLL_INTERVAL_MS || 2000),
  onOutcome: (outcome) => {
    console.log(
      `[job-worker] job=${outcome.jobId} type=${outcome.jobType} status=${outcome.status}` +
        (outcome.error ? ` error=${outcome.error}` : '')
    );
  },
  onError: (err) => {
    console.error('[job-worker] poll error:', err);
  },
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log(`[job-worker] Received ${sig}, shutting down gracefully...`);
    loop.stop();
    process.exit(0);
  });
}
