/**
 * Container bootstrap: runs on every deploy / restart.
 *
 *   1. prisma migrate deploy  — always
 *   2. schema seed            — only if officers table is empty (first boot)
 *   3. simulate-demo + spread — always (idempotent: scoped to today, keeps
 *                                the live-demo activity fresh after restarts)
 *
 * Ordered as a single sequential script so the API never starts against a
 * half-initialised database. Failures in step 3 are logged but non-fatal —
 * the API still boots so the rest of the demo (login, static UI) keeps working.
 */

import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { prisma } from '../src/lib/prisma.js';

function run(label: string, cmd: string, args: string[]): boolean {
  console.log(`[bootstrap] ${label} → ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`[bootstrap] ${label} exited with code ${r.status}`);
    return false;
  }
  return true;
}

async function main() {
  if (!run('migrate', 'npx', ['prisma', 'migrate', 'deploy'])) {
    process.exit(1);
  }

  let officerCount = -1;
  try {
    officerCount = await prisma.officer.count();
  } catch (e) {
    console.error('[bootstrap] could not query officer count — skipping seed', e);
  }

  if (officerCount === 0) {
    console.log('[bootstrap] empty database — running schema seed');
    if (!run('schema seed', 'npx', ['tsx', 'prisma/seed.ts'])) {
      process.exit(1);
    }
  } else if (officerCount > 0) {
    console.log(`[bootstrap] ${officerCount} officers present — skipping schema seed`);
  }

  // Backfill orphan incidents: any row with a GPS point but no zone gets
  // healed by the polygon that contains it. Idempotent — only touches rows
  // where zone_id IS NULL, and only when a matching zone exists.
  try {
    const healed = await prisma.$executeRaw`
      UPDATE incidents i
      SET zone_id = z.id
      FROM zones z
      WHERE i.zone_id IS NULL
        AND i.location IS NOT NULL
        AND ST_Within(i.location, z.boundary)
    `;
    if (healed > 0) console.log(`[bootstrap] backfilled zone_id on ${healed} orphan incidents`);
  } catch (e) {
    console.error('[bootstrap] zone backfill failed (non-fatal):', e);
  }

  // Today-scoped demo activity — refreshes shifts/incidents/locations on every
  // restart so a long-running container does not show data from days ago.
  run('demo: simulate', 'npx', ['tsx', 'scripts/simulate-demo.ts']);
  run('demo: spread',   'npx', ['tsx', 'scripts/spread-elgouna.ts']);

  await prisma.$disconnect();
  console.log('[bootstrap] complete');
}

main().catch(async (e) => {
  console.error('[bootstrap] fatal:', e);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
