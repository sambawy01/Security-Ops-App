/**
 * Apply the ODH 7-zone El Gouna geography to the database.
 *
 *   - For each zone in prisma/elgouna-geo.ts:
 *       - Look up an existing row by current nameEn, then by previousNameEn.
 *       - UPDATE in place (rename, recolor, reshape) — preserves zone UUID
 *         so officer.zoneId / incidents.zoneId / shifts.zoneId stay valid.
 *       - INSERT a fresh row if no match (e.g. Bostan in the v1 → v2 migration).
 *   - DELETE all checkpoints + patrol routes (in FK order)
 *   - INSERT fresh checkpoints + patrol routes from the geo file
 *
 * Idempotent — running it twice produces the same DB state. Safe to call from
 * bootstrap on every Railway restart so the live demo never drifts.
 *
 * Run manually:  railway run npx tsx scripts/apply-elgouna-geo.ts
 */

import 'dotenv/config';
import { prisma } from '../src/lib/prisma.js';
import { EL_GOUNA_ZONES, zoneRing } from '../prisma/elgouna-geo.js';

async function main() {
  const force = process.argv.includes('--force');

  // Idempotency guard — count checkpoints and verify they match the El Gouna
  // dataset. Spot-check the first expected name AND zone-count to catch v1→v2
  // migrations (same checkpoint count, different zone roster).
  if (!force) {
    const expectedCheckpoints = EL_GOUNA_ZONES.reduce((s, z) => s + z.checkpoints.length, 0);
    const actualCheckpoints = await prisma.checkpoint.count();
    const expectedZoneNames = new Set(EL_GOUNA_ZONES.map(z => z.nameEn));
    const actualZones = await prisma.zone.findMany({ select: { nameEn: true } });
    const actualZoneNames = new Set(actualZones.map(z => z.nameEn));
    const zonesMatch =
      actualZoneNames.size === expectedZoneNames.size &&
      [...expectedZoneNames].every(n => actualZoneNames.has(n));

    if (actualCheckpoints === expectedCheckpoints && zonesMatch) {
      const sample = EL_GOUNA_ZONES[0].checkpoints[0].nameEn;
      const found = await prisma.checkpoint.findFirst({ where: { nameEn: sample }, select: { id: true } });
      if (found) {
        console.log(`[geo] state matches ODH 7-zone dataset (${actualCheckpoints} checkpoints, ${actualZoneNames.size} zones) — skipping`);
        await prisma.$disconnect();
        return;
      }
    }
    console.log(`[geo] state drift detected — applying (have ${actualCheckpoints} checkpoints / ${actualZoneNames.size} zones; want ${expectedCheckpoints} / ${expectedZoneNames.size})`);
  } else {
    console.log('[geo] --force: applying unconditionally');
  }

  console.log('[geo] applying ODH 7-zone El Gouna geography…');

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Update/Insert zones — match by current nameEn OR previousNameEn so v1 → v2
  //    renames preserve UUIDs and every FK that points at them.
  // ───────────────────────────────────────────────────────────────────────────
  let renamed = 0;
  let inserted = 0;
  for (const z of EL_GOUNA_ZONES) {
    const ring = zoneRing(z);
    const wkt = `POLYGON((${ring.map(([x, y]) => `${x} ${y}`).join(', ')}))`;

    // Try current name first, then previous (rename target).
    let existing = await prisma.zone.findFirst({ where: { nameEn: z.nameEn }, select: { id: true } });
    if (!existing && z.previousNameEn) {
      existing = await prisma.zone.findFirst({ where: { nameEn: z.previousNameEn }, select: { id: true } });
    }

    if (existing) {
      await prisma.$executeRawUnsafe(
        `UPDATE zones SET name_ar=$1, name_en=$2, color=$3, boundary=ST_GeomFromText($4, 4326) WHERE id=$5::uuid`,
        z.nameAr, z.nameEn, z.color, wkt, existing.id,
      );
      renamed++;
    } else {
      await prisma.$executeRawUnsafe(
        `INSERT INTO zones (id, name_ar, name_en, color, boundary, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, ST_GeomFromText($4, 4326), now())`,
        z.nameAr, z.nameEn, z.color, wkt,
      );
      inserted++;
    }
  }
  console.log(`[geo] zones: ${renamed} updated/renamed, ${inserted} inserted`);

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Wipe checkpoint + patrol-route graph (FK order)
  // ───────────────────────────────────────────────────────────────────────────
  await prisma.patrolCheckpointLog.deleteMany();
  await prisma.patrolLog.deleteMany();
  await prisma.patrolRouteCheckpoint.deleteMany();
  await prisma.patrolRoute.deleteMany();
  await prisma.checkpoint.deleteMany();
  console.log('[geo] cleared old checkpoints + patrol routes');

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Insert checkpoints. Build a lookup so routes can wire by checkpoint name.
  // ───────────────────────────────────────────────────────────────────────────
  const checkpointIdByName = new Map<string, string>();
  for (const z of EL_GOUNA_ZONES) {
    const zone = await prisma.zone.findFirst({ where: { nameEn: z.nameEn }, select: { id: true } });
    if (!zone) {
      console.warn(`[geo] zone "${z.nameEn}" missing after upsert — skipping its checkpoints`);
      continue;
    }
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

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Insert patrol routes + ordered route-checkpoint links
  // ───────────────────────────────────────────────────────────────────────────
  let routeCount = 0;
  let linkCount = 0;
  for (const z of EL_GOUNA_ZONES) {
    const zone = await prisma.zone.findFirst({ where: { nameEn: z.nameEn }, select: { id: true } });
    if (!zone) continue;
    const route = await prisma.patrolRoute.create({
      data: { name: z.route.name, zoneId: zone.id, estimatedDurationMin: z.route.estimatedMin },
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
        data: { routeId: route.id, checkpointId: cpId, sequenceOrder: i + 1, expectedDwellMin: 3 },
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
