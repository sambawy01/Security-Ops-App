/**
 * Seed script for El Gouna demo data.
 *
 * Run with: npx tsx prisma/seed.ts
 *
 * Idempotent — deletes existing seed data and recreates it.
 */

import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { prisma } from '../src/lib/prisma.js';
import { hashPin } from '../src/lib/auth.js';
import {
  insertZoneWithBoundary,
  insertCheckpointWithLocation,
} from '../src/lib/geo.js';

// ---------------------------------------------------------------------------
// 1. Categories
// ---------------------------------------------------------------------------

const CATEGORIES = [
  { nameAr: 'أمن', nameEn: 'Security Threat', defaultPriority: 'critical' as const, icon: 'shield-alert' },
  { nameAr: 'حريق/سلامة', nameEn: 'Fire/Safety', defaultPriority: 'critical' as const, icon: 'flame' },
  { nameAr: 'حوادث', nameEn: 'Accidents', defaultPriority: 'high' as const, icon: 'car' },
  { nameAr: 'تعدي', nameEn: 'Trespassing', defaultPriority: 'high' as const, icon: 'user-x' },
  { nameAr: 'بنية تحتية', nameEn: 'Infrastructure', defaultPriority: 'medium' as const, icon: 'wrench' },
  { nameAr: 'مرور/مواقف', nameEn: 'Traffic/Parking', defaultPriority: 'medium' as const, icon: 'traffic-cone' },
  { nameAr: 'ضوضاء', nameEn: 'Noise Complaint', defaultPriority: 'low' as const, icon: 'volume-2' },
  { nameAr: 'حيوانات', nameEn: 'Animal Control', defaultPriority: 'low' as const, icon: 'bug' },
  { nameAr: 'شكوى عامة', nameEn: 'General Complaint', defaultPriority: 'low' as const, icon: 'message-circle' },
];

// ---------------------------------------------------------------------------
// 2. SLA resolution times by priority (minutes)
// ---------------------------------------------------------------------------

const RESOLUTION_MINUTES: Record<string, number> = {
  critical: 60,
  high: 240,
  medium: 1440,
  low: 2880,
};

const PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;

// ---------------------------------------------------------------------------
// 3. Zones — El Gouna areas
// ---------------------------------------------------------------------------

interface ZoneDef {
  id: string;
  nameAr: string;
  nameEn: string;
  centerLat: number;
  centerLng: number;
  color: string;
}

const ZONES: ZoneDef[] = [
  { id: randomUUID(), nameAr: 'وسط البلد', nameEn: 'Downtown', centerLat: 27.1825, centerLng: 33.8580, color: '#ef4444' },
  { id: randomUUID(), nameAr: 'المارينا', nameEn: 'Marina', centerLat: 27.1780, centerLng: 33.8650, color: '#3b82f6' },
  { id: randomUUID(), nameAr: 'الكفر', nameEn: 'Kafr', centerLat: 27.1870, centerLng: 33.8520, color: '#22c55e' },
  { id: randomUUID(), nameAr: 'جولف غرب', nameEn: 'West Golf', centerLat: 27.1850, centerLng: 33.8450, color: '#f59e0b' },
  { id: randomUUID(), nameAr: 'جولف جنوب', nameEn: 'South Golf', centerLat: 27.1750, centerLng: 33.8500, color: '#8b5cf6' },
  { id: randomUUID(), nameAr: 'المنطقة الصناعية', nameEn: 'Industrial', centerLat: 27.1900, centerLng: 33.8400, color: '#64748b' },
];

/**
 * Create an approximate 500m x 500m rectangle around a center point.
 * At latitude ~27 deg N, 1 degree lat ≈ 110.9 km, 1 degree lng ≈ 98.6 km.
 * 250m offset: lat ≈ 0.00225, lng ≈ 0.00253
 */
function makeRect(lat: number, lng: number): [number, number][] {
  const dLat = 0.00225;
  const dLng = 0.00253;
  return [
    [lng - dLng, lat - dLat],
    [lng + dLng, lat - dLat],
    [lng + dLng, lat + dLat],
    [lng - dLng, lat + dLat],
    [lng - dLng, lat - dLat], // close the ring
  ];
}

// ---------------------------------------------------------------------------
// 4. Checkpoints — 30 per zone
// ---------------------------------------------------------------------------

interface CheckpointDef {
  id: string;
  nameAr: string;
  nameEn: string;
  zoneId: string;
  type: 'gate' | 'patrol' | 'fixed';
  lat: number;
  lng: number;
}

function generateCheckpoints(zone: ZoneDef): CheckpointDef[] {
  const cps: CheckpointDef[] = [];
  const dLat = 0.00225;
  const dLng = 0.00253;

  // 5 gates — positioned at edges
  const gatePositions = [
    { lat: zone.centerLat + dLat, lng: zone.centerLng, suffix: 'الشمالية', enSuffix: 'North' },
    { lat: zone.centerLat - dLat, lng: zone.centerLng, suffix: 'الجنوبية', enSuffix: 'South' },
    { lat: zone.centerLat, lng: zone.centerLng - dLng, suffix: 'الغربية', enSuffix: 'West' },
    { lat: zone.centerLat, lng: zone.centerLng + dLng, suffix: 'الشرقية', enSuffix: 'East' },
    { lat: zone.centerLat + dLat * 0.5, lng: zone.centerLng + dLng * 0.5, suffix: 'الرئيسية', enSuffix: 'Main' },
  ];

  for (const g of gatePositions) {
    cps.push({
      id: randomUUID(),
      nameAr: `بوابة ${zone.nameAr} ${g.suffix}`,
      nameEn: `${zone.nameEn} ${g.enSuffix} Gate`,
      zoneId: zone.id,
      type: 'gate',
      lat: g.lat,
      lng: g.lng,
    });
  }

  // 20 patrol points — distributed in a grid within the zone
  for (let i = 1; i <= 20; i++) {
    // Create a grid: 4 rows x 5 cols
    const row = Math.floor((i - 1) / 5);
    const col = (i - 1) % 5;
    const lat = zone.centerLat - dLat * 0.8 + (row / 3) * dLat * 1.6;
    const lng = zone.centerLng - dLng * 0.8 + (col / 4) * dLng * 1.6;
    cps.push({
      id: randomUUID(),
      nameAr: `نقطة دورية ${zone.nameAr} ${i}`,
      nameEn: `${zone.nameEn} Patrol Point ${i}`,
      zoneId: zone.id,
      type: 'patrol',
      lat,
      lng,
    });
  }

  // 5 fixed points — near the center
  for (let i = 1; i <= 5; i++) {
    const angle = (2 * Math.PI * i) / 5;
    const lat = zone.centerLat + dLat * 0.4 * Math.sin(angle);
    const lng = zone.centerLng + dLng * 0.4 * Math.cos(angle);
    cps.push({
      id: randomUUID(),
      nameAr: `نقطة ثابتة ${zone.nameAr} ${i}`,
      nameEn: `${zone.nameEn} Fixed Point ${i}`,
      zoneId: zone.id,
      type: 'fixed',
      lat,
      lng,
    });
  }

  return cps;
}

// ---------------------------------------------------------------------------
// 5. Officers
// ---------------------------------------------------------------------------

interface OfficerDef {
  id: string;
  nameAr: string;
  nameEn: string;
  badgeNumber: string;
  role: string;
  rank: string;
  zoneId: string | null;
  skills: string[];
}

function buildOfficers(): OfficerDef[] {
  return [
    // Manager
    { id: randomUUID(), nameAr: 'أحمد السعيد', nameEn: 'Ahmed ElSaeed', badgeNumber: 'MGR-001', role: 'manager', rank: 'مدير', zoneId: null, skills: ['management', 'strategy'] },
    // Assistant managers
    { id: randomUUID(), nameAr: 'محمد فاروق', nameEn: 'Mohamed Farouk', badgeNumber: 'AMGR-001', role: 'assistant_manager', rank: 'مساعد مدير', zoneId: null, skills: ['management', 'operations'] },
    { id: randomUUID(), nameAr: 'خالد رشدي', nameEn: 'Khaled Roshdy', badgeNumber: 'AMGR-002', role: 'assistant_manager', rank: 'مساعد مدير', zoneId: null, skills: ['management', 'training'] },
    // Supervisors — assigned to Downtown, Marina, Kafr
    { id: randomUUID(), nameAr: 'عمر حسن', nameEn: 'Omar Hassan', badgeNumber: 'SUP-001', role: 'supervisor', rank: 'مشرف', zoneId: ZONES[0].id, skills: ['supervision', 'first-aid'] },
    { id: randomUUID(), nameAr: 'يوسف إبراهيم', nameEn: 'Youssef Ibrahim', badgeNumber: 'SUP-002', role: 'supervisor', rank: 'مشرف', zoneId: ZONES[1].id, skills: ['supervision', 'marine-safety'] },
    { id: randomUUID(), nameAr: 'حسام علي', nameEn: 'Hossam Ali', badgeNumber: 'SUP-003', role: 'supervisor', rank: 'مشرف', zoneId: ZONES[2].id, skills: ['supervision', 'crowd-control'] },
    // Operators
    { id: randomUUID(), nameAr: 'سارة أحمد', nameEn: 'Sara Ahmed', badgeNumber: 'OPS-001', role: 'operator', rank: 'عامل تشغيل', zoneId: null, skills: ['dispatch', 'comms'] },
    { id: randomUUID(), nameAr: 'نورا محمد', nameEn: 'Noura Mohamed', badgeNumber: 'OPS-002', role: 'operator', rank: 'عامل تشغيل', zoneId: null, skills: ['dispatch', 'reporting'] },
    // HR Admin
    { id: randomUUID(), nameAr: 'فاطمة عبدالله', nameEn: 'Fatma Abdullah', badgeNumber: 'HR-001', role: 'hr_admin', rank: 'مسؤول موارد بشرية', zoneId: null, skills: ['hr', 'payroll'] },
    // Secretary
    { id: randomUUID(), nameAr: 'منى سعيد', nameEn: 'Mona Saeed', badgeNumber: 'SEC-001', role: 'secretary', rank: 'سكرتير', zoneId: null, skills: ['admin', 'documentation'] },
    // Officers — distributed across zones
    { id: randomUUID(), nameAr: 'علي محمود', nameEn: 'Ali Mahmoud', badgeNumber: 'OFF-001', role: 'officer', rank: 'ضابط', zoneId: ZONES[0].id, skills: ['patrol', 'first-aid'] },
    { id: randomUUID(), nameAr: 'مصطفى كمال', nameEn: 'Mostafa Kamal', badgeNumber: 'OFF-002', role: 'officer', rank: 'ضابط', zoneId: ZONES[0].id, skills: ['patrol', 'traffic'] },
    { id: randomUUID(), nameAr: 'أيمن طارق', nameEn: 'Ayman Tarek', badgeNumber: 'OFF-003', role: 'officer', rank: 'ضابط', zoneId: ZONES[1].id, skills: ['patrol', 'marine-safety'] },
    { id: randomUUID(), nameAr: 'تامر حسين', nameEn: 'Tamer Hussein', badgeNumber: 'OFF-004', role: 'officer', rank: 'ضابط', zoneId: ZONES[1].id, skills: ['patrol', 'crowd-control'] },
    { id: randomUUID(), nameAr: 'هشام سامي', nameEn: 'Hesham Samy', badgeNumber: 'OFF-005', role: 'officer', rank: 'ضابط', zoneId: ZONES[2].id, skills: ['patrol', 'investigation'] },
    { id: randomUUID(), nameAr: 'وائل جمال', nameEn: 'Wael Gamal', badgeNumber: 'OFF-006', role: 'officer', rank: 'ضابط', zoneId: ZONES[2].id, skills: ['patrol', 'first-aid'] },
    { id: randomUUID(), nameAr: 'كريم رضا', nameEn: 'Karim Reda', badgeNumber: 'OFF-007', role: 'officer', rank: 'ضابط', zoneId: ZONES[3].id, skills: ['patrol', 'k9'] },
    { id: randomUUID(), nameAr: 'طارق نبيل', nameEn: 'Tarek Nabil', badgeNumber: 'OFF-008', role: 'officer', rank: 'ضابط', zoneId: ZONES[4].id, skills: ['patrol', 'traffic'] },
    { id: randomUUID(), nameAr: 'حازم عادل', nameEn: 'Hazem Adel', badgeNumber: 'OFF-009', role: 'officer', rank: 'ضابط', zoneId: ZONES[4].id, skills: ['patrol', 'cctv'] },
    { id: randomUUID(), nameAr: 'سامح فتحي', nameEn: 'Sameh Fathy', badgeNumber: 'OFF-010', role: 'officer', rank: 'ضابط', zoneId: ZONES[5].id, skills: ['patrol', 'industrial-safety'] },
  ];
}

// ---------------------------------------------------------------------------
// 6. Patrol Routes — 2 per zone
// ---------------------------------------------------------------------------

interface PatrolRouteDef {
  id: string;
  name: string;
  zoneId: string;
  estimatedDurationMin: number;
  checkpointIds: string[]; // 5 checkpoint ids from the zone
}

function buildPatrolRoutes(zone: ZoneDef, checkpoints: CheckpointDef[]): PatrolRouteDef[] {
  // Pick patrol-type checkpoints for routes
  const patrols = checkpoints.filter((c) => c.type === 'patrol');

  return [
    {
      id: randomUUID(),
      name: `${zone.nameEn} Route A`,
      zoneId: zone.id,
      estimatedDurationMin: 30,
      checkpointIds: patrols.slice(0, 5).map((c) => c.id),
    },
    {
      id: randomUUID(),
      name: `${zone.nameEn} Route B`,
      zoneId: zone.id,
      estimatedDurationMin: 45,
      checkpointIds: patrols.slice(5, 10).map((c) => c.id),
    },
  ];
}

// ===========================================================================
// MAIN SEED FUNCTION
// ===========================================================================

async function main() {
  console.log('Seeding El Gouna demo data...\n');

  // ---- Cleanup (reverse dependency order) --------------------------------
  console.log('Cleaning existing data...');
  await prisma.patrolRouteCheckpoint.deleteMany();
  await prisma.patrolCheckpointLog.deleteMany();
  await prisma.patrolLog.deleteMany();
  await prisma.patrolRoute.deleteMany();
  await prisma.slaRule.deleteMany();
  await prisma.incidentUpdate.deleteMany();
  await prisma.incidentMedia.deleteMany();
  await prisma.aiSuggestion.deleteMany();
  await prisma.whatsappMessage.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.category.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.officerLocation.deleteMany();
  // Clear zone supervisor references before deleting officers/zones
  await prisma.$executeRaw`UPDATE zones SET supervisor_id = NULL`;
  await prisma.officer.deleteMany();
  // Delete checkpoints and zones via raw SQL (geometry columns)
  await prisma.$executeRaw`DELETE FROM checkpoints`;
  await prisma.$executeRaw`DELETE FROM zones`;

  // ---- Categories --------------------------------------------------------
  console.log('Creating 9 incident categories...');
  const categoryRecords = await Promise.all(
    CATEGORIES.map((cat) =>
      prisma.category.create({
        data: {
          nameAr: cat.nameAr,
          nameEn: cat.nameEn,
          defaultPriority: cat.defaultPriority,
          icon: cat.icon,
        },
      }),
    ),
  );
  console.log(`  Created ${categoryRecords.length} categories`);

  // ---- SLA Rules — 9 categories x 4 priorities = 36 rules ---------------
  console.log('Creating SLA rules (9 categories x 4 priorities = 36)...');
  let slaCount = 0;
  for (const cat of categoryRecords) {
    for (const priority of PRIORITIES) {
      await prisma.slaRule.create({
        data: {
          categoryId: cat.id,
          priority,
          responseMinutes: 5,
          resolutionMinutes: RESOLUTION_MINUTES[priority],
          escalationChain: [],
        },
      });
      slaCount++;
    }
  }
  console.log(`  Created ${slaCount} SLA rules`);

  // ---- Zones -------------------------------------------------------------
  console.log('Creating 6 zones with PostGIS boundaries...');
  for (const zone of ZONES) {
    const boundary = makeRect(zone.centerLat, zone.centerLng);
    await insertZoneWithBoundary(zone.id, zone.nameAr, zone.nameEn, zone.color, boundary);
  }
  console.log(`  Created ${ZONES.length} zones`);

  // ---- Checkpoints -------------------------------------------------------
  console.log('Creating 180 checkpoints (30 per zone) with PostGIS points...');
  const allCheckpoints: CheckpointDef[] = [];
  for (const zone of ZONES) {
    const cps = generateCheckpoints(zone);
    allCheckpoints.push(...cps);
    for (const cp of cps) {
      await insertCheckpointWithLocation(cp.id, cp.nameAr, cp.nameEn, cp.zoneId, cp.type, cp.lat, cp.lng);
    }
  }
  console.log(`  Created ${allCheckpoints.length} checkpoints`);

  // ---- Officers ----------------------------------------------------------
  console.log('Creating 20 officers...');
  const pin = '1234';
  const pinHash = await hashPin(pin);
  const officerDefs = buildOfficers();

  for (const off of officerDefs) {
    await prisma.officer.create({
      data: {
        id: off.id,
        nameAr: off.nameAr,
        nameEn: off.nameEn,
        badgeNumber: off.badgeNumber,
        role: off.role as any,
        rank: off.rank,
        zoneId: off.zoneId,
        pinHash,
        skills: off.skills,
        status: 'active',
      },
    });
  }
  console.log(`  Created ${officerDefs.length} officers`);

  // ---- Assign supervisors to zones ---------------------------------------
  console.log('Assigning supervisors to zones...');
  const supervisors = officerDefs.filter((o) => o.role === 'supervisor');
  for (const sup of supervisors) {
    if (sup.zoneId) {
      await prisma.zone.update({
        where: { id: sup.zoneId },
        data: { supervisorId: sup.id },
      });
    }
  }
  console.log(`  Assigned ${supervisors.length} supervisors`);

  // ---- Patrol Routes -----------------------------------------------------
  console.log('Creating 12 patrol routes (2 per zone)...');
  let routeCount = 0;
  for (const zone of ZONES) {
    const zoneCps = allCheckpoints.filter((c) => c.zoneId === zone.id);
    const routes = buildPatrolRoutes(zone, zoneCps);

    for (const route of routes) {
      await prisma.patrolRoute.create({
        data: {
          id: route.id,
          name: route.name,
          zoneId: route.zoneId,
          estimatedDurationMin: route.estimatedDurationMin,
        },
      });

      // Create PatrolRouteCheckpoint records
      for (let i = 0; i < route.checkpointIds.length; i++) {
        await prisma.patrolRouteCheckpoint.create({
          data: {
            routeId: route.id,
            checkpointId: route.checkpointIds[i],
            sequenceOrder: i + 1,
            expectedDwellMin: 2,
          },
        });
      }
      routeCount++;
    }
  }
  console.log(`  Created ${routeCount} patrol routes`);

  // ---- Summary -----------------------------------------------------------
  console.log('\n--- Seed Summary ---');
  console.log(`Categories:   ${categoryRecords.length}`);
  console.log(`SLA Rules:    ${slaCount}`);
  console.log(`Zones:        ${ZONES.length}`);
  console.log(`Checkpoints:  ${allCheckpoints.length}`);
  console.log(`Officers:     ${officerDefs.length}`);
  console.log(`Patrol Routes:${routeCount}`);
  console.log('\nSeed complete!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
