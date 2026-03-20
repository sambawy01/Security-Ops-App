// ─── Central Worker Entrypoint ──────────────────────────────────────────────
// Import all workers so they register with their respective queues,
// then call setupRecurringJobs() to schedule cron/interval jobs.
// ─────────────────────────────────────────────────────────────────────────────

import { setupRecurringJobs } from './setup.js';
import { slaMonitorWorker } from './sla-monitor.worker.js';
import { anomalyWorker } from './anomaly.worker.js';
import { patternWorker } from './pattern.worker.js';
import { staffingWorker } from './staffing.worker.js';
import { reportWorker } from './report.worker.js';

export const workers = [
  slaMonitorWorker,
  anomalyWorker,
  patternWorker,
  staffingWorker,
  reportWorker,
];

export async function startWorkers(): Promise<void> {
  await setupRecurringJobs();
  console.log(`[workers] ${workers.length} workers started`);
}

export async function stopWorkers(): Promise<void> {
  await Promise.all(workers.map((w) => w.close()));
  console.log('[workers] All workers stopped');
}
