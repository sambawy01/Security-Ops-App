/**
 * Demo Data Simulation Script
 *
 * Generates realistic "live" activity data on top of the seed data so the
 * dashboard looks alive during the ODH demo.
 *
 * Creates:
 *   - Active shifts for ~30 officers
 *   - Simulated GPS locations (10-20 per officer over 2 hours)
 *   - 12-15 incidents with mixed statuses and priorities
 *   - Incident updates (assignments, status changes, notes)
 *   - Patrol logs for 2-3 officers currently on patrol
 *
 * Idempotent — cleans up previous demo data before inserting.
 *
 * Run with:  npm run demo:seed
 */

import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { prisma } from '../src/lib/prisma.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NOW = new Date();
const TODAY_6AM = new Date(NOW);
TODAY_6AM.setHours(6, 0, 0, 0);
const TODAY_6PM = new Date(NOW);
TODAY_6PM.setHours(18, 0, 0, 0);
const TWO_HOURS_AGO = new Date(NOW.getTime() - 2 * 60 * 60 * 1000);

/** Zone centers for El Gouna */
const ZONE_CENTERS: Record<string, { lat: number; lng: number }> = {
  Downtown: { lat: 27.1825, lng: 33.8580 },
  Marina: { lat: 27.1780, lng: 33.8650 },
  Kafr: { lat: 27.1870, lng: 33.8520 },
  'West Golf': { lat: 27.1850, lng: 33.8450 },
  'South Golf': { lat: 27.1750, lng: 33.8500 },
  Industrial: { lat: 27.1900, lng: 33.8400 },
};

/** Demo incident definitions */
const DEMO_INCIDENTS: {
  title: string;
  description: string;
  categoryEn: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'assigned' | 'in_progress' | 'escalated' | 'resolved';
  zoneName: string;
  minutesAgo: number;
}[] = [
  // Critical (3)
  {
    title: 'Suspicious vehicle near Downtown entrance',
    description: 'A black SUV with no plates has been circling the Downtown main gate for 20 minutes. Guard on duty flagged it.',
    categoryEn: 'Security Threat',
    priority: 'critical',
    status: 'open',
    zoneName: 'Downtown',
    minutesAgo: 12,
  },
  {
    title: 'Fire alarm triggered at Marina clubhouse',
    description: 'Automatic fire alarm activated in building B, second floor. No visible smoke yet. Officers dispatched.',
    categoryEn: 'Fire/Safety',
    priority: 'critical',
    status: 'assigned',
    zoneName: 'Marina',
    minutesAgo: 25,
  },
  {
    title: 'Unauthorized entry attempt at Industrial gate',
    description: 'Two individuals attempted to bypass the Industrial zone south fence. CCTV captured footage. Area being swept.',
    categoryEn: 'Trespassing',
    priority: 'critical',
    status: 'in_progress',
    zoneName: 'Industrial',
    minutesAgo: 45,
  },
  // High (4)
  {
    title: 'Traffic accident on Marina bridge',
    description: 'Minor two-car collision blocking one lane on the Marina bridge. No injuries reported, traffic backing up.',
    categoryEn: 'Accidents',
    priority: 'high',
    status: 'assigned',
    zoneName: 'Marina',
    minutesAgo: 35,
  },
  {
    title: 'Unauthorized contractor vehicle at Industrial gate',
    description: 'Unregistered delivery truck attempting entry without a valid pass. Driver claims appointment with maintenance.',
    categoryEn: 'Trespassing',
    priority: 'high',
    status: 'open',
    zoneName: 'Industrial',
    minutesAgo: 18,
  },
  {
    title: 'Broken gate motor at checkpoint 12',
    description: 'West Golf main gate motor is stuck in open position. Gate cannot close, security compromised.',
    categoryEn: 'Infrastructure',
    priority: 'high',
    status: 'in_progress',
    zoneName: 'West Golf',
    minutesAgo: 90,
  },
  {
    title: 'Trespasser spotted near Kafr wall',
    description: 'Resident reported someone climbing the perimeter wall near Kafr zone east side. Patrol sent to investigate.',
    categoryEn: 'Trespassing',
    priority: 'high',
    status: 'assigned',
    zoneName: 'Kafr',
    minutesAgo: 55,
  },
  // Medium (5)
  {
    title: 'Power outage at West Golf guardhouse',
    description: 'Guard station lost electricity. Running on backup battery. Maintenance team notified.',
    categoryEn: 'Infrastructure',
    priority: 'medium',
    status: 'assigned',
    zoneName: 'West Golf',
    minutesAgo: 70,
  },
  {
    title: 'Water leak near Marina walkway',
    description: 'Water pooling on the pedestrian walkway near Marina restaurants. Slipping hazard for visitors.',
    categoryEn: 'Infrastructure',
    priority: 'medium',
    status: 'open',
    zoneName: 'Marina',
    minutesAgo: 40,
  },
  {
    title: 'Illegal parking blocking South Golf entrance',
    description: 'Three vehicles parked in no-parking zone blocking the South Golf service road.',
    categoryEn: 'Traffic/Parking',
    priority: 'medium',
    status: 'in_progress',
    zoneName: 'South Golf',
    minutesAgo: 60,
  },
  {
    title: 'Streetlight out on Downtown main road',
    description: 'Section of Downtown main road between checkpoints 3 and 5 has no streetlights. Visibility concern.',
    categoryEn: 'Infrastructure',
    priority: 'medium',
    status: 'open',
    zoneName: 'Downtown',
    minutesAgo: 100,
  },
  {
    title: 'Delivery truck parked in fire lane at Kafr',
    description: 'Large delivery truck blocking fire access road behind Kafr residential block C. Driver not found.',
    categoryEn: 'Traffic/Parking',
    priority: 'medium',
    status: 'assigned',
    zoneName: 'Kafr',
    minutesAgo: 30,
  },
  // Low (3)
  {
    title: 'Noise complaint from Marina resident',
    description: 'Resident in building A, unit 403 reports loud music from neighboring restaurant past 11 PM curfew.',
    categoryEn: 'Noise Complaint',
    priority: 'low',
    status: 'open',
    zoneName: 'Marina',
    minutesAgo: 110,
  },
  {
    title: 'Stray dogs spotted near Kafr school area',
    description: 'Pack of 4-5 stray dogs seen near the school entrance in Kafr zone. Parents concerned.',
    categoryEn: 'Animal Control',
    priority: 'low',
    status: 'assigned',
    zoneName: 'Kafr',
    minutesAgo: 80,
  },
  {
    title: 'Graffiti on South Golf boundary wall',
    description: 'New graffiti spray-painted on the south-facing boundary wall near the golf course. Area photographed.',
    categoryEn: 'General Complaint',
    priority: 'low',
    status: 'resolved',
    zoneName: 'South Golf',
    minutesAgo: 150,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Random float between min and max */
function randBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Jitter a coordinate by up to ±offset degrees */
function jitter(center: number, offset: number): number {
  return center + (Math.random() - 0.5) * 2 * offset;
}

/** Return a Date that is `minutesAgo` minutes before NOW */
function minutesAgoDate(minutesAgo: number): Date {
  return new Date(NOW.getTime() - minutesAgo * 60 * 1000);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== Demo Data Simulation ===\n');

  // ------ Cleanup previous demo data --------------------------------------
  console.log('Cleaning previous demo data...');

  const demoTitles = DEMO_INCIDENTS.map((i) => i.title);

  // Delete incident updates & media for demo incidents
  const demoIncidents = await prisma.incident.findMany({
    where: { title: { in: demoTitles } },
    select: { id: true },
  });
  const demoIncidentIds = demoIncidents.map((i) => i.id);

  if (demoIncidentIds.length > 0) {
    await prisma.incidentUpdate.deleteMany({ where: { incidentId: { in: demoIncidentIds } } });
    await prisma.incidentMedia.deleteMany({ where: { incidentId: { in: demoIncidentIds } } });
    await prisma.aiSuggestion.deleteMany({ where: { incidentId: { in: demoIncidentIds } } });
    await prisma.incident.deleteMany({ where: { id: { in: demoIncidentIds } } });
  }

  // Delete today's location records
  const todayStart = new Date(NOW);
  todayStart.setHours(0, 0, 0, 0);
  await prisma.officerLocation.deleteMany({ where: { timestamp: { gte: todayStart } } });

  // Delete patrol checkpoint logs for today's patrol logs
  const todayPatrolLogs = await prisma.patrolLog.findMany({
    where: { startedAt: { gte: todayStart } },
    select: { id: true },
  });
  if (todayPatrolLogs.length > 0) {
    await prisma.patrolCheckpointLog.deleteMany({
      where: { patrolLogId: { in: todayPatrolLogs.map((p) => p.id) } },
    });
    await prisma.patrolLog.deleteMany({ where: { id: { in: todayPatrolLogs.map((p) => p.id) } } });
  }

  // Delete today's shifts
  await prisma.shift.deleteMany({ where: { scheduledStart: { gte: todayStart } } });

  // Reset all officer statuses to off_duty
  await prisma.officer.updateMany({ data: { status: 'off_duty' } });

  console.log('  Cleanup complete.\n');

  // ------ Load reference data from DB -------------------------------------
  const allZones = await prisma.zone.findMany();
  const allOfficers = await prisma.officer.findMany({ orderBy: { badgeNumber: 'asc' } });
  const allCategories = await prisma.category.findMany();
  const allSlaRules = await prisma.slaRule.findMany();
  const allPatrolRoutes = await prisma.patrolRoute.findMany({
    include: { checkpoints: { orderBy: { sequenceOrder: 'asc' } } },
  });

  // Map zone names to zone records
  const zoneByName: Record<string, typeof allZones[0]> = {};
  for (const z of allZones) {
    zoneByName[z.nameEn] = z;
  }

  // Map category English names to records
  const catByName: Record<string, typeof allCategories[0]> = {};
  for (const c of allCategories) {
    catByName[c.nameEn] = c;
  }

  // SLA lookup: categoryId + priority -> SlaRule
  const slaLookup: Record<string, typeof allSlaRules[0]> = {};
  for (const r of allSlaRules) {
    slaLookup[`${r.categoryId}:${r.priority}`] = r;
  }

  // ------ 1. Create active shifts for ~30 officers -------------------------
  console.log('Creating active shifts...');

  // Pick up to 5 officers per zone (prefer officers, then supervisors)
  const officersPerZone: Record<string, typeof allOfficers> = {};
  for (const zone of allZones) {
    const zoneOfficers = allOfficers.filter((o) => o.zoneId === zone.id);
    officersPerZone[zone.id] = zoneOfficers.slice(0, 5);
  }

  // Also add manager-level staff (no zone) — they work from HQ
  const hqStaff = allOfficers
    .filter((o) => !o.zoneId && ['manager', 'assistant_manager', 'operator', 'hr_admin', 'secretary'].includes(o.role))
    .slice(0, 5);

  const shiftOfficers: typeof allOfficers = [];
  let shiftCount = 0;

  for (const zone of allZones) {
    const officers = officersPerZone[zone.id] ?? [];
    for (const off of officers) {
      const checkInJitter = Math.floor(Math.random() * 15); // 0-15 min after TWO_HOURS_AGO
      const actualCheckIn = new Date(TWO_HOURS_AGO.getTime() + checkInJitter * 60 * 1000);
      const center = ZONE_CENTERS[zone.nameEn] ?? { lat: 27.1825, lng: 33.858 };

      await prisma.$executeRaw`
        INSERT INTO shifts (id, officer_id, zone_id, status, scheduled_start, scheduled_end, actual_check_in, check_in_location, created_at)
        VALUES (
          ${randomUUID()}::uuid,
          ${off.id}::uuid,
          ${zone.id}::uuid,
          'active'::"ShiftStatus",
          ${TODAY_6AM},
          ${TODAY_6PM},
          ${actualCheckIn},
          ST_SetSRID(ST_MakePoint(${jitter(center.lng, 0.001)}, ${jitter(center.lat, 0.001)}), 4326),
          NOW()
        )
      `;

      shiftOfficers.push(off);
      shiftCount++;
    }
  }

  // HQ shifts — use Downtown zone as fallback
  const downtownZone = zoneByName['Downtown'];
  for (const off of hqStaff) {
    const zoneId = downtownZone?.id ?? allZones[0].id;
    const actualCheckIn = new Date(TWO_HOURS_AGO.getTime() + Math.floor(Math.random() * 10) * 60 * 1000);
    await prisma.$executeRaw`
      INSERT INTO shifts (id, officer_id, zone_id, status, scheduled_start, scheduled_end, actual_check_in, created_at)
      VALUES (
        ${randomUUID()}::uuid,
        ${off.id}::uuid,
        ${zoneId}::uuid,
        'active'::"ShiftStatus",
        ${TODAY_6AM},
        ${TODAY_6PM},
        ${actualCheckIn},
        NOW()
      )
    `;
    shiftOfficers.push(off);
    shiftCount++;
  }

  // Set all shift officers to active status
  const shiftOfficerIds = shiftOfficers.map((o) => o.id);
  await prisma.officer.updateMany({
    where: { id: { in: shiftOfficerIds } },
    data: { status: 'active' },
  });

  console.log(`  Created ${shiftCount} active shifts.\n`);

  // ------ 2. Simulated GPS locations for active officers -------------------
  console.log('Inserting simulated GPS locations...');

  let locationCount = 0;

  for (const off of shiftOfficers) {
    // Determine the zone center for this officer
    const zone = allZones.find((z) => z.id === off.zoneId);
    const center = zone ? (ZONE_CENTERS[zone.nameEn] ?? { lat: 27.1825, lng: 33.858 }) : { lat: 27.1825, lng: 33.858 };

    // Generate 10-20 location records over the past 2 hours
    const numLocations = Math.floor(randBetween(10, 21));
    let currentLat = jitter(center.lat, 0.0015);
    let currentLng = jitter(center.lng, 0.0015);

    for (let i = 0; i < numLocations; i++) {
      // Spread timestamps evenly over the 2-hour window
      const fraction = i / (numLocations - 1);
      const timestamp = new Date(TWO_HOURS_AGO.getTime() + fraction * (NOW.getTime() - TWO_HOURS_AGO.getTime()));

      // Small random walk — officer on patrol
      currentLat += (Math.random() - 0.5) * 0.0004;
      currentLng += (Math.random() - 0.5) * 0.0004;

      // Clamp to stay within zone bounds (center ± 0.002)
      currentLat = Math.max(center.lat - 0.002, Math.min(center.lat + 0.002, currentLat));
      currentLng = Math.max(center.lng - 0.002, Math.min(center.lng + 0.002, currentLng));

      const accuracy = randBetween(3, 15);

      await prisma.$executeRaw`
        INSERT INTO officer_locations (id, officer_id, location, timestamp, accuracy_meters)
        VALUES (
          gen_random_uuid(),
          ${off.id}::uuid,
          ST_SetSRID(ST_MakePoint(${currentLng}, ${currentLat}), 4326),
          ${timestamp},
          ${accuracy}
        )
      `;
      locationCount++;
    }
  }

  console.log(`  Inserted ${locationCount} location records.\n`);

  // ------ 3. Create demo incidents -----------------------------------------
  console.log('Creating demo incidents...');

  // We need officers to assign incidents to
  const fieldOfficers = shiftOfficers.filter((o) => ['officer', 'supervisor'].includes(o.role));
  let assignableIdx = 0;
  const getNextAssignable = (zoneName: string) => {
    // Prefer an officer in the same zone
    const zone = zoneByName[zoneName];
    const zoneOfficer = fieldOfficers.find((o) => o.zoneId === zone?.id);
    if (zoneOfficer) return zoneOfficer;
    const off = fieldOfficers[assignableIdx % fieldOfficers.length];
    assignableIdx++;
    return off;
  };

  // Reporter — use the first operator
  const reporter = allOfficers.find((o) => o.role === 'operator') ?? allOfficers[0];

  const createdIncidentIds: string[] = [];
  let incidentCount = 0;

  for (const inc of DEMO_INCIDENTS) {
    const zone = zoneByName[inc.zoneName];
    if (!zone) {
      console.warn(`  Zone "${inc.zoneName}" not found, skipping incident "${inc.title}"`);
      continue;
    }

    const category = catByName[inc.categoryEn];
    if (!category) {
      console.warn(`  Category "${inc.categoryEn}" not found, skipping incident "${inc.title}"`);
      continue;
    }

    const center = ZONE_CENTERS[inc.zoneName] ?? { lat: 27.1825, lng: 33.858 };
    const incLat = jitter(center.lat, 0.002);
    const incLng = jitter(center.lng, 0.002);

    const createdAt = minutesAgoDate(inc.minutesAgo);

    // SLA deadlines
    const sla = slaLookup[`${category.id}:${inc.priority}`];
    const slaResponseDeadline = sla
      ? new Date(createdAt.getTime() + sla.responseMinutes * 60 * 1000)
      : null;
    const slaResolutionDeadline = sla
      ? new Date(createdAt.getTime() + sla.resolutionMinutes * 60 * 1000)
      : null;

    // Determine assignment
    const needsAssignment = ['assigned', 'in_progress', 'resolved'].includes(inc.status);
    const assignedOfficer = needsAssignment ? getNextAssignable(inc.zoneName) : null;
    const assignedAt = needsAssignment ? new Date(createdAt.getTime() + 3 * 60 * 1000) : null;
    const resolvedAt = inc.status === 'resolved' ? new Date(createdAt.getTime() + 60 * 60 * 1000) : null;

    const incidentId = randomUUID();

    await prisma.$executeRaw`
      INSERT INTO incidents (
        id, title, description, category_id, priority, status, zone_id,
        location, reporter_type, created_by_officer_id,
        assigned_officer_id, assigned_at,
        sla_response_deadline, sla_resolution_deadline,
        resolved_at, created_at
      ) VALUES (
        ${incidentId}::uuid,
        ${inc.title},
        ${inc.description},
        ${category.id}::uuid,
        ${inc.priority}::"Priority",
        ${inc.status}::"IncidentStatus",
        ${zone.id}::uuid,
        ST_SetSRID(ST_MakePoint(${incLng}, ${incLat}), 4326),
        'officer'::"ReporterType",
        ${reporter.id}::uuid,
        ${assignedOfficer?.id ?? null}::uuid,
        ${assignedAt},
        ${slaResponseDeadline},
        ${slaResolutionDeadline},
        ${resolvedAt},
        ${createdAt}
      )
    `;

    createdIncidentIds.push(incidentId);
    incidentCount++;
  }

  console.log(`  Created ${incidentCount} incidents.\n`);

  // ------ 4. Incident updates for assigned/in_progress incidents -----------
  console.log('Creating incident updates...');

  let updateCount = 0;

  for (let idx = 0; idx < DEMO_INCIDENTS.length; idx++) {
    const inc = DEMO_INCIDENTS[idx];
    const incidentId = createdIncidentIds[idx];
    if (!incidentId) continue;

    const createdAt = minutesAgoDate(inc.minutesAgo);

    if (['assigned', 'in_progress', 'resolved'].includes(inc.status)) {
      const zone = zoneByName[inc.zoneName];
      const assignedOfficer = fieldOfficers.find((o) => o.zoneId === zone?.id) ?? fieldOfficers[0];

      // Assignment update
      await prisma.incidentUpdate.create({
        data: {
          incidentId,
          authorId: reporter.id,
          type: 'assignment',
          content: `Assigned to ${assignedOfficer.nameEn}`,
          createdAt: new Date(createdAt.getTime() + 3 * 60 * 1000),
        },
      });
      updateCount++;

      // Status change to assigned
      await prisma.incidentUpdate.create({
        data: {
          incidentId,
          authorId: reporter.id,
          type: 'status_change',
          content: 'Status changed from open to assigned',
          metadata: { from: 'open', to: 'assigned' },
          createdAt: new Date(createdAt.getTime() + 3 * 60 * 1000 + 1000),
        },
      });
      updateCount++;
    }

    if (['in_progress', 'resolved'].includes(inc.status)) {
      const zone = zoneByName[inc.zoneName];
      const assignedOfficer = fieldOfficers.find((o) => o.zoneId === zone?.id) ?? fieldOfficers[0];

      // Status change to in_progress
      await prisma.incidentUpdate.create({
        data: {
          incidentId,
          authorId: assignedOfficer.id,
          type: 'status_change',
          content: 'Status changed from assigned to in_progress',
          metadata: { from: 'assigned', to: 'in_progress' },
          createdAt: new Date(createdAt.getTime() + 8 * 60 * 1000),
        },
      });
      updateCount++;

      // Officer note
      const notes = [
        'Arrived on scene, assessing situation',
        'Area secured, investigating further',
        'Witness statement being taken',
        'Coordinating with maintenance team',
        'Perimeter check in progress',
      ];
      await prisma.incidentUpdate.create({
        data: {
          incidentId,
          authorId: assignedOfficer.id,
          type: 'note',
          content: notes[idx % notes.length],
          createdAt: new Date(createdAt.getTime() + 12 * 60 * 1000),
        },
      });
      updateCount++;
    }

    if (inc.status === 'resolved') {
      const zone = zoneByName[inc.zoneName];
      const assignedOfficer = fieldOfficers.find((o) => o.zoneId === zone?.id) ?? fieldOfficers[0];

      await prisma.incidentUpdate.create({
        data: {
          incidentId,
          authorId: assignedOfficer.id,
          type: 'status_change',
          content: 'Status changed from in_progress to resolved',
          metadata: { from: 'in_progress', to: 'resolved' },
          createdAt: new Date(createdAt.getTime() + 60 * 60 * 1000),
        },
      });
      updateCount++;

      await prisma.incidentUpdate.create({
        data: {
          incidentId,
          authorId: assignedOfficer.id,
          type: 'note',
          content: 'Issue resolved. Area cleaned and photos taken for report.',
          createdAt: new Date(createdAt.getTime() + 61 * 60 * 1000),
        },
      });
      updateCount++;
    }
  }

  console.log(`  Created ${updateCount} incident updates.\n`);

  // ------ 5. Patrol logs for 2-3 officers on patrol -----------------------
  console.log('Creating patrol logs...');

  // Pick 3 zone officers who have shifts and routes in their zone
  const patrolCandidates = shiftOfficers.filter((o) => o.zoneId && o.role === 'officer');
  const patrolOfficers = patrolCandidates.slice(0, 3);
  let patrolLogCount = 0;
  let checkpointLogCount = 0;

  for (const off of patrolOfficers) {
    // Find a route in their zone
    const route = allPatrolRoutes.find((r) => r.zoneId === off.zoneId);
    if (!route || route.checkpoints.length === 0) continue;

    // Find their shift
    const shift = await prisma.shift.findFirst({
      where: { officerId: off.id, status: 'active' },
    });
    if (!shift) continue;

    const patrolId = randomUUID();
    const patrolStartedAt = new Date(NOW.getTime() - 40 * 60 * 1000); // started 40 min ago

    await prisma.patrolLog.create({
      data: {
        id: patrolId,
        shiftId: shift.id,
        routeId: route.id,
        officerId: off.id,
        startedAt: patrolStartedAt,
        completedAt: null,
      },
    });
    patrolLogCount++;

    // Create checkpoint logs — some confirmed, some pending
    const totalCps = route.checkpoints.length;
    const confirmedCount = Math.floor(totalCps * 0.6); // 60% done

    for (let i = 0; i < totalCps; i++) {
      const rcp = route.checkpoints[i];
      const confirmed = i < confirmedCount;
      const arrivedAt = confirmed
        ? new Date(patrolStartedAt.getTime() + (i + 1) * 8 * 60 * 1000) // ~8 min apart
        : null;

      // For confirmed checkpoints, get the checkpoint location from the zone center
      const zone = allZones.find((z) => z.id === off.zoneId);
      const center = zone ? (ZONE_CENTERS[zone.nameEn] ?? { lat: 27.1825, lng: 33.858 }) : { lat: 27.1825, lng: 33.858 };

      if (confirmed) {
        await prisma.$executeRaw`
          INSERT INTO patrol_checkpoints (id, patrol_log_id, checkpoint_id, arrived_at, gps_location, confirmed, skip_reason)
          VALUES (
            gen_random_uuid(),
            ${patrolId}::uuid,
            ${rcp.checkpointId}::uuid,
            ${arrivedAt},
            ST_SetSRID(ST_MakePoint(${jitter(center.lng, 0.001)}, ${jitter(center.lat, 0.001)}), 4326),
            true,
            NULL
          )
        `;
      } else {
        await prisma.patrolCheckpointLog.create({
          data: {
            patrolLogId: patrolId,
            checkpointId: rcp.checkpointId,
            arrivedAt: null,
            confirmed: false,
            skipReason: null,
          },
        });
      }
      checkpointLogCount++;
    }
  }

  console.log(`  Created ${patrolLogCount} patrol logs with ${checkpointLogCount} checkpoint entries.\n`);

  // ------ Summary ---------------------------------------------------------
  console.log('=== Demo Simulation Summary ===');
  console.log(`  Active shifts:       ${shiftCount}`);
  console.log(`  GPS locations:       ${locationCount}`);
  console.log(`  Incidents:           ${incidentCount}`);
  console.log(`  Incident updates:    ${updateCount}`);
  console.log(`  Patrol logs:         ${patrolLogCount}`);
  console.log(`  Checkpoint entries:  ${checkpointLogCount}`);
  console.log('\nDemo data ready! Dashboard should now look alive.');
}

main()
  .catch((e) => {
    console.error('Demo simulation failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
