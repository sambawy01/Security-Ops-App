import 'dotenv/config';
import { prisma } from '../src/lib/prisma.js';

// Your actual location
const CENTER_LAT = 27.39747;
const CENTER_LNG = 33.67128;

// Key El Gouna residential areas — spread across the full community
const AREAS = [
  { lat: 27.4060, lng: 33.6750, name: 'North/Airport area' },
  { lat: 27.4020, lng: 33.6820, name: 'Abu Tig Marina' },
  { lat: 27.3975, lng: 33.6713, name: 'Downtown (your location)' },
  { lat: 27.3950, lng: 33.6630, name: 'West Golf Course' },
  { lat: 27.3890, lng: 33.6700, name: 'Kafr El Gouna' },
  { lat: 27.3830, lng: 33.6760, name: 'South Lagoons' },
  { lat: 27.3990, lng: 33.6870, name: 'East Beach/Hotels' },
  { lat: 27.4030, lng: 33.6580, name: 'Industrial Zone' },
  { lat: 27.3920, lng: 33.6800, name: 'South Marina' },
];

function jitter(center: number, spread: number): number {
  return center + (Math.random() - 0.5) * 2 * spread;
}

async function main() {
  console.log('\nSpreading personnel across all of El Gouna residential...\n');

  const officers = await prisma.officer.findMany({
    where: { status: 'active' },
    select: { id: true, nameEn: true },
  });

  if (officers.length === 0) {
    console.log('No active officers. Run demo:seed first.');
    await prisma.$disconnect();
    return;
  }

  // Clear today's locations
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.$executeRaw`DELETE FROM officer_locations WHERE timestamp >= ${today}`;

  const now = new Date();
  let locationCount = 0;

  for (let i = 0; i < officers.length; i++) {
    const officer = officers[i];
    const area = AREAS[i % AREAS.length];

    // Each officer gets 8 location points spread over 15 minutes (movement trail)
    for (let t = 0; t < 8; t++) {
      const timestamp = new Date(now.getTime() - (7 - t) * 2 * 60000);
      // Spread within ~300m of their assigned area
      const lat = jitter(area.lat, 0.003);
      const lng = jitter(area.lng, 0.003);
      const accuracy = 5 + Math.random() * 10;

      await prisma.$executeRaw`
        INSERT INTO officer_locations (id, officer_id, location, timestamp, accuracy_meters)
        VALUES (gen_random_uuid(), ${officer.id}::uuid,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326), ${timestamp}, ${accuracy})
      `;
      locationCount++;
    }
    console.log(`  ${officer.nameEn} → ${area.name}`);
  }

  // Spread incidents across El Gouna too
  const incidents = await prisma.incident.findMany({
    where: { status: { in: ['open', 'assigned', 'in_progress', 'escalated'] } },
    select: { id: true, title: true },
  });

  for (let i = 0; i < incidents.length; i++) {
    const area = AREAS[i % AREAS.length];
    const lat = jitter(area.lat, 0.004);
    const lng = jitter(area.lng, 0.004);
    await prisma.$executeRaw`
      UPDATE incidents SET location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
      WHERE id = ${incidents[i].id}::uuid
    `;
  }

  console.log(`\n✅ ${officers.length} officers spread across ${AREAS.length} areas`);
  console.log(`   ${locationCount} location records created`);
  console.log(`   ${incidents.length} incidents repositioned`);
  console.log('\nRefresh the dashboard to see the spread.\n');

  await prisma.$disconnect();
}

main().catch(console.error);
