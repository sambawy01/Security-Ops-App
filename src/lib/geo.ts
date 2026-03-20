import { prisma } from './prisma.js';

export interface LatLng {
  lat: number;
  lng: number;
}

export async function insertOfficerLocation(
  officerId: string,
  lat: number,
  lng: number,
  accuracy?: number,
) {
  await prisma.$executeRaw`
    INSERT INTO officer_locations (id, officer_id, location, timestamp, accuracy_meters)
    VALUES (gen_random_uuid(), ${officerId}::uuid, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326), NOW(), ${accuracy ?? null})
  `;
}

export async function getOfficerLatestLocation(
  officerId: string,
): Promise<LatLng | null> {
  const result = await prisma.$queryRaw<{ lat: number; lng: number }[]>`
    SELECT ST_Y(location) as lat, ST_X(location) as lng
    FROM officer_locations WHERE officer_id = ${officerId}::uuid
    ORDER BY timestamp DESC LIMIT 1
  `;
  return result[0] ?? null;
}

export async function getAllActiveOfficerLocations() {
  return prisma.$queryRaw<
    { officer_id: string; lat: number; lng: number; timestamp: Date }[]
  >`
    SELECT DISTINCT ON (ol.officer_id)
      ol.officer_id, ST_Y(ol.location) as lat, ST_X(ol.location) as lng, ol.timestamp
    FROM officer_locations ol
    JOIN officers o ON o.id = ol.officer_id
    WHERE o.status = 'active'
    ORDER BY ol.officer_id, ol.timestamp DESC
  `;
}

export async function distanceToOfficer(
  officerId: string,
  lat: number,
  lng: number,
): Promise<number | null> {
  const result = await prisma.$queryRaw<{ distance: number }[]>`
    SELECT ST_Distance(
      location::geography,
      ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
    ) as distance
    FROM officer_locations WHERE officer_id = ${officerId}::uuid
    ORDER BY timestamp DESC LIMIT 1
  `;
  return result[0]?.distance ?? null;
}

export async function insertCheckpointWithLocation(
  id: string,
  nameAr: string,
  nameEn: string,
  zoneId: string,
  type: string,
  lat: number,
  lng: number,
) {
  await prisma.$executeRaw`
    INSERT INTO checkpoints (id, name_ar, name_en, zone_id, type, status, location, created_at)
    VALUES (${id}::uuid, ${nameAr}, ${nameEn}, ${zoneId}::uuid, ${type}::"CheckpointType", 'active',
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326), NOW())
  `;
}

export async function insertZoneWithBoundary(
  id: string,
  nameAr: string,
  nameEn: string,
  color: string,
  boundaryCoords: [number, number][],
) {
  const coordsStr = boundaryCoords
    .map(([lng, lat]) => `${lng} ${lat}`)
    .join(',');
  const wkt = `POLYGON((${coordsStr}))`;
  await prisma.$executeRaw`
    INSERT INTO zones (id, name_ar, name_en, color, boundary, created_at)
    VALUES (${id}::uuid, ${nameAr}, ${nameEn}, ${color},
            ST_GeomFromText(${wkt}, 4326), NOW())
  `;
}
