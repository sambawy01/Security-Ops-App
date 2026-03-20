import { Worker, type Job } from 'bullmq';
import { prisma } from '../lib/prisma.js';
import { connection } from './setup.js';

// ─── SLA Monitor Worker ─────────────────────────────────────────────────────
// Runs every 60 seconds. Deterministic — no AI needed.
//
// 1. Incidents with status 'assigned' where sla_response_deadline has passed
//    → escalate and create an escalation update.
// 2. Incidents with status open/assigned/in_progress where
//    sla_resolution_deadline has passed → escalate.
// 3. Already-escalated incidents are skipped.
// ─────────────────────────────────────────────────────────────────────────────

async function processSlaCheck(_job: Job): Promise<void> {
  const now = new Date();

  // 1. Response SLA breaches: assigned incidents past response deadline
  const responseBreaches = await prisma.incident.findMany({
    where: {
      status: 'assigned',
      slaResponseDeadline: { not: null, lt: now },
    },
    select: { id: true, title: true },
  });

  for (const incident of responseBreaches) {
    await prisma.$transaction([
      prisma.incident.update({
        where: { id: incident.id },
        data: { status: 'escalated' },
      }),
      prisma.incidentUpdate.create({
        data: {
          incidentId: incident.id,
          type: 'escalation',
          content: `SLA response deadline breached — incident auto-escalated at ${now.toISOString()}`,
        },
      }),
    ]);
  }

  // 2. Resolution SLA breaches: open/assigned/in_progress past resolution deadline
  //    (exclude ones we just escalated above to avoid double-processing)
  const alreadyEscalated = new Set(responseBreaches.map((i) => i.id));

  const resolutionBreaches = await prisma.incident.findMany({
    where: {
      status: { in: ['open', 'assigned', 'in_progress'] },
      slaResolutionDeadline: { not: null, lt: now },
    },
    select: { id: true, title: true },
  });

  for (const incident of resolutionBreaches) {
    if (alreadyEscalated.has(incident.id)) continue;

    await prisma.$transaction([
      prisma.incident.update({
        where: { id: incident.id },
        data: { status: 'escalated' },
      }),
      prisma.incidentUpdate.create({
        data: {
          incidentId: incident.id,
          type: 'escalation',
          content: `SLA resolution deadline breached — incident auto-escalated at ${now.toISOString()}`,
        },
      }),
    ]);
  }

  const total = responseBreaches.length + resolutionBreaches.filter((i) => !alreadyEscalated.has(i.id)).length;
  if (total > 0) {
    console.log(`[sla-monitor] Escalated ${total} incident(s) for SLA breach`);
  }
}

export const slaMonitorWorker = new Worker('sla-monitor', processSlaCheck, {
  connection,
  concurrency: 1,
});

slaMonitorWorker.on('failed', (job, err) => {
  console.error(`[sla-monitor] Job ${job?.id} failed:`, err.message);
});
