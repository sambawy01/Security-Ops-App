import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { zoneParamsSchema } from '../schemas/zones.schema.js';
import { ForbiddenError, NotFoundError } from '../lib/errors.js';

const zonesRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/v1/zones — List all zones with checkpoint count and officer count
  app.get('/api/v1/zones', async (request) => {
    const user = request.user;

    const where = user.role === 'supervisor' && user.zoneId
      ? { id: user.zoneId }
      : {};

    const zones = await prisma.zone.findMany({
      where,
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        color: true,
        supervisorId: true,
        _count: {
          select: {
            checkpoints: true,
            officers: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return { data: zones };
  });

  // GET /api/v1/zones/:id — Zone detail with checkpoints list and stats
  app.get('/api/v1/zones/:id', async (request) => {
    const { id } = zoneParamsSchema.parse((request as any).params);
    const user = request.user;

    // Supervisor scoping
    if (user.role === 'supervisor' && user.zoneId !== id) {
      throw new ForbiddenError('Access denied to this zone');
    }

    const zone = await prisma.zone.findUnique({
      where: { id },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        color: true,
        supervisorId: true,
        _count: {
          select: {
            officers: true,
            incidents: true,
          },
        },
      },
    });

    if (!zone) {
      throw new NotFoundError('Zone not found');
    }

    // Fetch checkpoints with lat/lng from PostGIS
    const checkpoints = await prisma.$queryRaw<
      { id: string; name_ar: string; name_en: string; type: string; status: string; lat: number; lng: number }[]
    >`SELECT id, name_ar, name_en, type, status, ST_Y(location) as lat, ST_X(location) as lng FROM checkpoints WHERE zone_id = ${id}::uuid`;

    return {
      data: {
        id: zone.id,
        nameAr: zone.nameAr,
        nameEn: zone.nameEn,
        color: zone.color,
        supervisorId: zone.supervisorId,
        stats: {
          officerCount: zone._count.officers,
          incidentCount: zone._count.incidents,
        },
        checkpoints: checkpoints.map((cp) => ({
          id: cp.id,
          nameAr: cp.name_ar,
          nameEn: cp.name_en,
          type: cp.type,
          status: cp.status,
          lat: cp.lat,
          lng: cp.lng,
        })),
      },
    };
  });

  // GET /api/v1/zones/geojson — Zones as GeoJSON FeatureCollection
  app.get('/api/v1/zones/geojson', async (request) => {
    const zones = await prisma.$queryRaw`
      SELECT id, name_en, name_ar, color,
        ST_AsGeoJSON(boundary)::json as geometry
      FROM zones WHERE boundary IS NOT NULL
    `;
    return {
      type: 'FeatureCollection',
      features: (zones as any[]).map(z => ({
        type: 'Feature',
        properties: { id: z.id, nameEn: z.name_en, nameAr: z.name_ar, color: z.color },
        geometry: z.geometry,
      })),
    };
  });

  // GET /api/v1/checkpoints/geojson — Checkpoints as GeoJSON FeatureCollection
  app.get('/api/v1/checkpoints/geojson', async (request) => {
    const checkpoints = await prisma.$queryRaw`
      SELECT id, name_en, name_ar, zone_id, type, status,
        ST_AsGeoJSON(location)::json as geometry
      FROM checkpoints
    `;
    return {
      type: 'FeatureCollection',
      features: (checkpoints as any[]).map(c => ({
        type: 'Feature',
        properties: { id: c.id, nameEn: c.name_en, nameAr: c.name_ar, zoneId: c.zone_id, type: c.type, status: c.status },
        geometry: c.geometry,
      })),
    };
  });

  // GET /api/v1/zones/:id/checkpoints — List checkpoints in a zone with lat/lng
  app.get('/api/v1/zones/:id/checkpoints', async (request) => {
    const { id } = zoneParamsSchema.parse((request as any).params);
    const user = request.user;

    // Supervisor scoping
    if (user.role === 'supervisor' && user.zoneId !== id) {
      throw new ForbiddenError('Access denied to this zone');
    }

    // Verify zone exists
    const zone = await prisma.zone.findUnique({ where: { id }, select: { id: true } });
    if (!zone) {
      throw new NotFoundError('Zone not found');
    }

    const checkpoints = await prisma.$queryRaw<
      { id: string; name_ar: string; name_en: string; type: string; status: string; lat: number; lng: number }[]
    >`SELECT id, name_ar, name_en, type, status, ST_Y(location) as lat, ST_X(location) as lng FROM checkpoints WHERE zone_id = ${id}::uuid`;

    return {
      data: checkpoints.map((cp) => ({
        id: cp.id,
        nameAr: cp.name_ar,
        nameEn: cp.name_en,
        type: cp.type,
        status: cp.status,
        lat: cp.lat,
        lng: cp.lng,
      })),
    };
  });
};

export default zonesRoutes;
