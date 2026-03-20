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

  // 3. ODH Management Escalation: escalated incidents where security manager hasn't acted
  //    - If escalated for >30min (critical) or >2hr (others) → flag for Ops Manager
  //    - If escalated for >1hr (critical) or >4hr (others) → flag for C-level
  const escalatedIncidents = await prisma.incident.findMany({
    where: {
      status: 'escalated',
    },
    select: { id: true, title: true, priority: true, createdAt: true, updatedAt: true },
  });

  for (const incident of escalatedIncidents) {
    const escalatedDuration = now.getTime() - new Date(incident.updatedAt).getTime();
    const isCritical = incident.priority === 'critical';
    const opsManagerThreshold = isCritical ? 30 * 60000 : 2 * 3600000; // 30min or 2hr
    const cLevelThreshold = isCritical ? 60 * 60000 : 4 * 3600000; // 1hr or 4hr

    // Check if already flagged (avoid duplicate updates)
    const existingFlags = await prisma.incidentUpdate.findMany({
      where: {
        incidentId: incident.id,
        type: 'escalation',
        content: { contains: 'ODH' },
      },
    });
    const hasOpsFlag = existingFlags.some((u: any) => u.content.includes('Operations Manager'));
    const hasCLevelFlag = existingFlags.some((u: any) => u.content.includes('C-Level'));

    if (escalatedDuration >= cLevelThreshold && !hasCLevelFlag) {
      await prisma.incidentUpdate.create({
        data: {
          incidentId: incident.id,
          type: 'escalation',
          content: `⚠️ CRITICAL ESCALATION: Incident unresolved for ${Math.round(escalatedDuration / 60000)}min — escalated to ODH C-Level management`,
          metadata: { escalationLevel: 'c_level', autoEscalated: true } as any,
        },
      });
      console.log(`[sla-monitor] Incident ${incident.id.slice(0,8)} escalated to C-Level`);
    } else if (escalatedDuration >= opsManagerThreshold && !hasOpsFlag) {
      await prisma.incidentUpdate.create({
        data: {
          incidentId: incident.id,
          type: 'escalation',
          content: `⚠️ Incident unresolved for ${Math.round(escalatedDuration / 60000)}min — escalated to ODH Operations Manager`,
          metadata: { escalationLevel: 'ops_manager', autoEscalated: true } as any,
        },
      });
      console.log(`[sla-monitor] Incident ${incident.id.slice(0,8)} escalated to Ops Manager`);
    }
  }
}

export const slaMonitorWorker = new Worker('sla-monitor', processSlaCheck, {
  connection,
  concurrency: 1,
});

slaMonitorWorker.on('failed', (job, err) => {
  console.error(`[sla-monitor] Job ${job?.id} failed:`, err.message);
});
