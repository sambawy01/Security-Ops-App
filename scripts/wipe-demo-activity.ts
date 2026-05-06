/**
 * Wipe demo activity — incidents, shifts, locations, AI artifacts, audit logs,
 * sync queue. Keeps the structural skeleton: officers, zones, categories,
 * SLA rules, checkpoints, patrol routes.
 *
 * Resets officer.status to off_duty and officer.lastSeenAt to NULL so the
 * dashboard shows a true clean slate after the wipe.
 *
 * Run manually:  railway run npx tsx scripts/wipe-demo-activity.ts
 */

import 'dotenv/config';
import { prisma } from '../src/lib/prisma.js';

async function main() {
  console.log('[wipe] clearing demo activity…');

  // Order matters — children first
  const counts = {
    incidentUpdates: await prisma.incidentUpdate.deleteMany(),
    incidentMedia:   await prisma.incidentMedia.deleteMany(),
    aiSuggestions:   await prisma.aiSuggestion.deleteMany(),
    whatsappMessages: await prisma.whatsappMessage.deleteMany(),
    incidents:       await prisma.incident.deleteMany(),
    patrolCheckpoints: await prisma.patrolCheckpointLog.deleteMany(),
    patrolLogs:      await prisma.patrolLog.deleteMany(),
    shifts:          await prisma.shift.deleteMany(),
    officerLocations: await prisma.officerLocation.deleteMany(),
    aiAnalyses:      await prisma.aiAnalysis.deleteMany(),
    generatedReports: await prisma.generatedReport.deleteMany(),
    aiConversations: await prisma.aiConversation.deleteMany(),
    auditLogs:       await prisma.auditLog.deleteMany(),
    syncQueue:       await prisma.syncQueue.deleteMany(),
  };

  // Reset officer presence + duty status
  const reset = await prisma.officer.updateMany({
    data: { status: 'off_duty', lastSeenAt: null, failedLoginAttempts: 0, lockedUntil: null },
  });

  console.log('[wipe] deleted:');
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: ${v.count}`);
  console.log(`  officers reset: ${reset.count}`);

  await prisma.$disconnect();
  console.log('[wipe] done');
}

main().catch(async (e) => {
  console.error('[wipe] failed:', e);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
