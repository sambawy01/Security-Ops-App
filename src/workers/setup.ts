import { Queue, type ConnectionOptions } from 'bullmq';
import { config } from '../config.js';

// ─── Parse Redis URL into host/port for BullMQ ────────────────────────────
const redisUrl = new URL(config.REDIS_URL);
export const connection: ConnectionOptions = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port) || 6379,
  ...(redisUrl.password ? { password: redisUrl.password } : {}),
};

// ─── Queue Definitions ─────────────────────────────────────────────────────

export const slaQueue = new Queue('sla-monitor', { connection });
export const anomalyQueue = new Queue('anomaly-detection', { connection });
export const patternQueue = new Queue('pattern-detection', { connection });
export const reportQueue = new Queue('report-generation', { connection });
export const staffingQueue = new Queue('staffing-recommendation', { connection });

// ─── Recurring Job Schedules ────────────────────────────────────────────────

export async function setupRecurringJobs(): Promise<void> {
  // Remove old repeatable jobs to prevent duplicates on restart
  const queues = [slaQueue, anomalyQueue, patternQueue, reportQueue, staffingQueue];
  for (const queue of queues) {
    const repeatableJobs = await queue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await queue.removeRepeatableByKey(job.key);
    }
  }

  // SLA check — every 60 seconds
  await slaQueue.add('check-sla', {}, { repeat: { every: 60_000 } });

  // Anomaly detection — every 5 minutes
  await anomalyQueue.add('check-anomalies', {}, { repeat: { every: 300_000 } });

  // Pattern detection — every hour
  await patternQueue.add('detect-patterns', {}, { repeat: { every: 3_600_000 } });

  // Daily report — 10 PM every day
  await reportQueue.add('daily-report', {}, { repeat: { pattern: '0 22 * * *' } });

  // Weekly report — 6 AM every Sunday
  await reportQueue.add('weekly-report', {}, { repeat: { pattern: '0 6 * * 0' } });

  // Monthly report — 6 AM on the 1st of each month
  await reportQueue.add('monthly-report', {}, { repeat: { pattern: '0 6 1 * *' } });

  // Staffing recommendation — 6 AM every Sunday
  await staffingQueue.add('weekly-staffing', {}, { repeat: { pattern: '0 6 * * 0' } });

  console.log('[workers] Recurring jobs scheduled');
}
