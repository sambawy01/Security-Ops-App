/**
 * Relocate Personnel Script
 *
 * Takes a center lat/lng (your current location) and spreads all active
 * officers around it in realistic patrol positions. Also repositions
 * incident locations nearby.
 *
 * Usage:
 *   npx tsx scripts/relocate-personnel.ts [lat] [lng]
 *   npx tsx scripts/relocate-personnel.ts 27.1825 33.858     # El Gouna Downtown
 *   npx tsx scripts/relocate-personnel.ts                     # Uses default El Gouna Downtown
 */

import 'dotenv/config';
import { prisma } from '../src/lib/prisma.js';

const DEFAULT_LAT = 27.1825;
const DEFAULT_LNG = 33.858;

// Parse command line args
const centerLat = parseFloat(process.argv[2]) || DEFAULT_LAT;
const centerLng = parseFloat(process.argv[3]) || DEFAULT_LNG;

function jitter(center: number, spread: number): number {
  return center + (Math.random() - 0.5) * 2 * spread;
}

// Generate realistic officer positions in a spread pattern around center
function generatePositions(count: number, lat: number, lng: number): Array<{ lat: number; lng: number }> {
  const positions: Array<{ lat: number; lng: number }> = [];

  // Some officers clustered near center (on duty at checkpoints)
  const nearCount = Math.floor(count * 0.4);
  for (let i = 0; i < nearCount; i++) {
    positions.push({ lat: jitter(lat, 0.002), lng: jitter(lng, 0.002) }); // ~200m radius
  }

  // Some officers on patrol routes (medium distance)
  const midCount = Math.floor(count * 0.35);
  for (let i = 0; i < midCount; i++) {
    const angle = (i / midCount) * Math.PI * 2;
    const distance = 0.003 + Math.random() * 0.003; // 300-600m
    positions.push({
      lat: lat + Math.sin(angle) * distance + jitter(0, 0.0005),
      lng: lng + Math.cos(angle) * distance + jitter(0, 0.0005),
    });
  }

  // Some officers at outer positions (perimeter, other zones)
  const farCount = count - nearCount - midCount;
  for (let i = 0; i < farCount; i++) {
    const angle = (i / farCount) * Math.PI * 2;
    const distance = 0.005 + Math.random() * 0.005; // 500m-1km
    positions.push({
      lat: lat + Math.sin(angle) * distance + jitter(0, 0.001),
      lng: lng + Math.cos(angle) * distance + jitter(0, 0.001),
    });
  }

  return positions;
}

async function main() {
  console.log(`\nRelocating personnel around: ${centerLat.toFixed(4)}°N, ${centerLng.toFixed(4)}°E\n`);

  // Get all active officers
  const activeOfficers = await prisma.officer.findMany({
    where: { status: 'active' },
    select: { id: true, nameEn: true },
  });

  if (activeOfficers.length === 0) {
    console.log('No active officers found. Run demo:seed first.');
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${activeOfficers.length} active officers`);

  // Delete old location records from today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.$executeRaw`DELETE FROM officer_locations WHERE timestamp >= ${today}`;
  console.log('Cleared today\'s location records');

  // Generate spread positions
  const positions = generatePositions(activeOfficers.length, centerLat, centerLng);

  // Insert new locations — multiple points per officer for a trail effect
  let locationCount = 0;
  const now = new Date();

  for (let i = 0; i < activeOfficers.length; i++) {
    const officer = activeOfficers[i];
    const basePos = positions[i];

    // Create 10 location records over the past 30 minutes (trail)
    for (let t = 0; t < 10; t++) {
      const timestamp = new Date(now.getTime() - (9 - t) * 3 * 60000); // Every 3 min
      const trailLat = basePos.lat + jitter(0, 0.0003) * (t / 10); // Slight movement
      const trailLng = basePos.lng + jitter(0, 0.0003) * (t / 10);
      const accuracy = 5 + Math.random() * 15;

      await prisma.$executeRaw`
        INSERT INTO officer_locations (id, officer_id, location, timestamp, accuracy_meters)
        VALUES (
          gen_random_uuid(),
          ${officer.id}::uuid,
          ST_SetSRID(ST_MakePoint(${trailLng}, ${trailLat}), 4326),
          ${timestamp},
          ${accuracy}
        )
      `;
      locationCount++;
    }
  }

  console.log(`Inserted ${locationCount} location records`);

  // Also reposition open incidents around the center
  const openIncidents = await prisma.incident.findMany({
    where: { status: { in: ['open', 'assigned', 'in_progress', 'escalated'] } },
    select: { id: true },
  });

  for (const inc of openIncidents) {
    const incLat = jitter(centerLat, 0.004);
    const incLng = jitter(centerLng, 0.004);
    await prisma.$executeRaw`
      UPDATE incidents SET location = ST_SetSRID(ST_MakePoint(${incLng}, ${incLat}), 4326)
      WHERE id = ${inc.id}::uuid
    `;
  }
  console.log(`Repositioned ${openIncidents.length} incidents around center`);

  console.log(`\n✅ Done! ${activeOfficers.length} officers spread around ${centerLat.toFixed(4)}, ${centerLng.toFixed(4)}`);
  console.log('Refresh the dashboard to see updated positions.\n');

  await prisma.$disconnect();
}

main().catch(console.error);
