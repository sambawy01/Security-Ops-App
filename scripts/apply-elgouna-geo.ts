/**
 * Apply real El Gouna geography to the database.
 *
 *   - UPDATE zones in place by nameEn (so officer.zoneId stays valid)
 *   - DELETE all checkpoints + patrol routes (in FK order)
 *   - INSERT new checkpoints + patrol routes from prisma/elgouna-geo.ts
 *
 * Idempotent — running it twice produces the same DB state. Safe to call from
 * bootstrap on every Railway restart so the live demo never drifts.
 *
 * Run manually:  railway run npx tsx scripts/apply-elgouna-geo.ts
 */

import 'dotenv/config';
import { prisma } from '../src/lib/prisma.js';
import { EL_GOUNA_ZONES, bboxToRing } from '../prisma/elgouna-geo.js';

async function main() {
  const force = process.argv.includes('--force');

  // Idempotency guard — count checkpoints and verify they match the El Gouna
  // dataset. If they do, this is a no-op and any real patrol logs survive
  // restart. Pass --force to wipe + reapply unconditionally (e.g. after edits
  // to elgouna-geo.ts).
  if (!force) {
    const expectedCount = EL_GOUNA_ZONES.reduce((s, z) => s + z.checkpoints.length, 0);
    const actualCount = await prisma.checkpoint.count();
    if (actualCount === expectedCount) {
      // Spot-check: pick one expected name and confirm it exists.
      const sample = EL_GOUNA_ZONES[0].checkpoints[0].nameEn;
      const found = await prisma.checkpoint.findFirst({ where: { nameEn: sample }, select: { id: true } });
      if (found) {
        console.log(`[geo] checkpoints match El Gouna dataset (${actualCount}) — skipping (use --force to override)`);
        await prisma.$disconnect();
        return;
      }
    }
    console.log(`[geo] state drift detected (have ${actualCount} checkpoints, expected ${expectedCount}) — applying`);
  } else {
    console.log('[geo] --force: applying unconditionally');
  }

  console.log('[geo] applying El Gouna geography…');

  // 1. Update zones in place by nameEn
  for (const z of EL_GOUNA_ZONES) {
    const existing = await prisma.zone.findFirst({ where: { nameEn: z.nameEn }, select: { id: true } });
    if (!existing) {
      console.log(`[geo] zone "${z.nameEn}" missing — skipping (run prisma seed first)`);
      continue;
    }
    const ring = bboxToRing(z.bbox);
    const wkt = `POLYGON((${ring.map(([x, y]) => `${x} ${y}`).join(', ')}))`;
    await prisma.$executeRawUnsafe(
      `UPDATE zones SET name_ar=$1, name_en=$2, color=$3, boundary=ST_GeomFromText($4, 4326) WHERE id=$5::uuid`,
      z.nameAr, z.nameEn, z.color, wkt, existing.id,
    );
  }
  console.log(`[geo] updated ${EL_GOUNA_ZONES.length} zones`);

  // 2. Wipe checkpoint + patrol-route graph (FK order)
  await prisma.patrolCheckpointLog.deleteMany();
  await prisma.patrolLog.deleteMany();
  await prisma.patrolRouteCheckpoint.deleteMany();
  await prisma.patrolRoute.deleteMany();
  await prisma.checkpoint.deleteMany();
  console.log('[geo] cleared old checkpoints + patrol routes');

  // 3. Insert checkpoints. Build a lookup so we can wire routes by checkpoint name.
  const checkpointIdByName = new Map<string, string>();

  for (const z of EL_GOUNA_ZONES) {
    const zone = await prisma.zone.findFirst({ where: { nameEn: z.nameEn }, select: { id: true } });
    if (!zone) continue;

    for (const cp of z.checkpoints) {
      const inserted = await prisma.$queryRawUnsafe<{ id: string }[]>(
        `INSERT INTO checkpoints (id, name_ar, name_en, zone_id, type, location, status)
         VALUES (gen_random_uuid(), $1, $2, $3::uuid, $4::"CheckpointType",
                 ST_SetSRID(ST_MakePoint($5, $6), 4326), 'active')
         RETURNING id::text`,
        cp.nameAr, cp.nameEn, zone.id, cp.type, cp.lng, cp.lat,
      );
      checkpointIdByName.set(`${z.nameEn}::${cp.nameEn}`, inserted[0].id);
    }
  }
  console.log(`[geo] inserted ${checkpointIdByName.size} checkpoints`);

  // 4. Insert patrol routes + ordered route-checkpoint links
  let routeCount = 0;
  let linkCount = 0;
  for (const z of EL_GOUNA_ZONES) {
    const zone = await prisma.zone.findFirst({ where: { nameEn: z.nameEn }, select: { id: true } });
    if (!zone) continue;

    const route = await prisma.patrolRoute.create({
      data: {
        name: z.route.name,
        zoneId: zone.id,
        estimatedDurationMin: z.route.estimatedMin,
      },
    });
    routeCount++;

    for (let i = 0; i < z.route.checkpointOrder.length; i++) {
      const cpName = z.route.checkpointOrder[i];
      const cpId = checkpointIdByName.get(`${z.nameEn}::${cpName}`);
      if (!cpId) {
        console.warn(`[geo] route "${z.route.name}" references missing checkpoint "${cpName}"`);
        continue;
      }
      await prisma.patrolRouteCheckpoint.create({
        data: {
          routeId: route.id,
          checkpointId: cpId,
          sequenceOrder: i + 1,
          expectedDwellMin: 3,
        },
      });
      linkCount++;
    }
  }
  console.log(`[geo] inserted ${routeCount} patrol routes with ${linkCount} stops`);

  await prisma.$disconnect();
  console.log('[geo] done');
}

main().catch(async (e) => {
  console.error('[geo] failed:', e);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
