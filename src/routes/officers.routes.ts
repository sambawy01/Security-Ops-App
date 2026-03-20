import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { hashPin } from '../lib/auth.js';
import { insertOfficerLocation } from '../lib/geo.js';
import { ForbiddenError, NotFoundError } from '../lib/errors.js';
import {
  officerParamsSchema,
  createOfficerSchema,
  updateOfficerSchema,
  locationBodySchema,
  statusBodySchema,
  locationHistoryQuerySchema,
} from '../schemas/officers.schema.js';

const ADMIN_ROLES = ['manager', 'assistant_manager', 'hr_admin'];
const SUPERVISOR_PLUS = ['manager', 'assistant_manager', 'supervisor'];
const LIST_ROLES = ['manager', 'assistant_manager', 'hr_admin', 'supervisor', 'operator'];
const LOCATION_HISTORY_ROLES = ['manager', 'assistant_manager', 'supervisor', 'operator'];

const officersRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/v1/officers — List officers
  app.get('/api/v1/officers', {
    config: { allowedRoles: LIST_ROLES },
  }, async (request) => {
    const user = request.user;

    const where = user.role === 'supervisor' && user.zoneId
      ? { zoneId: user.zoneId }
      : {};

    const officers = await prisma.officer.findMany({
      where,
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        badgeNumber: true,
        rank: true,
        role: true,
        zoneId: true,
        status: true,
        phone: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return { data: officers };
  });

  // GET /api/v1/officers/:id — Officer detail
  app.get('/api/v1/officers/:id', {
    config: { allowedRoles: LIST_ROLES },
  }, async (request) => {
    const { id } = officerParamsSchema.parse((request as any).params);
    const user = request.user;

    const officer = await prisma.officer.findUnique({
      where: { id },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        badgeNumber: true,
        rank: true,
        role: true,
        zoneId: true,
        status: true,
        phone: true,
        skills: true,
        deviceId: true,
        photoPath: true,
        createdAt: true,
        updatedAt: true,
        zone: { select: { nameEn: true, nameAr: true } },
      },
    });

    if (!officer) {
      throw new NotFoundError('Officer not found');
    }

    // Supervisor scoping: can only see officers in their zone
    if (user.role === 'supervisor' && user.zoneId !== officer.zoneId) {
      throw new ForbiddenError('Access denied to this officer');
    }

    return { data: officer };
  });

  // POST /api/v1/officers — Create officer
  app.post('/api/v1/officers', {
    config: { allowedRoles: ADMIN_ROLES },
  }, async (request, reply) => {
    const body = createOfficerSchema.parse(request.body);

    const pinHash = await hashPin(body.pin);

    const officer = await prisma.officer.create({
      data: {
        nameAr: body.nameAr,
        nameEn: body.nameEn,
        badgeNumber: body.badgeNumber,
        rank: body.rank,
        role: body.role as any,
        zoneId: body.zoneId ?? null,
        phone: body.phone,
        pinHash,
        skills: body.skills,
      },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        badgeNumber: true,
        rank: true,
        role: true,
        zoneId: true,
        status: true,
        phone: true,
        skills: true,
        createdAt: true,
      },
    });

    return reply.status(201).send({ data: officer });
  });

  // PATCH /api/v1/officers/:id — Update officer
  app.patch('/api/v1/officers/:id', {
    config: { allowedRoles: ADMIN_ROLES },
  }, async (request) => {
    const { id } = officerParamsSchema.parse((request as any).params);
    const body = updateOfficerSchema.parse(request.body);

    // Verify officer exists
    const existing = await prisma.officer.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      throw new NotFoundError('Officer not found');
    }

    const officer = await prisma.officer.update({
      where: { id },
      data: {
        ...(body.nameAr !== undefined && { nameAr: body.nameAr }),
        ...(body.nameEn !== undefined && { nameEn: body.nameEn }),
        ...(body.rank !== undefined && { rank: body.rank }),
        ...(body.role !== undefined && { role: body.role as any }),
        ...(body.zoneId !== undefined && { zoneId: body.zoneId }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.skills !== undefined && { skills: body.skills }),
      },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        badgeNumber: true,
        rank: true,
        role: true,
        zoneId: true,
        status: true,
        phone: true,
        skills: true,
        updatedAt: true,
      },
    });

    return { data: officer };
  });

  // POST /api/v1/officers/:id/location — GPS location update
  app.post('/api/v1/officers/:id/location', async (request) => {
    const { id } = officerParamsSchema.parse((request as any).params);
    const user = request.user;

    // Officer can only update their own location
    if (user.officerId !== id) {
      throw new ForbiddenError('You can only update your own location');
    }

    const body = locationBodySchema.parse(request.body);

    await insertOfficerLocation(id, body.lat, body.lng, body.accuracy);

    return { success: true };
  });

  // PATCH /api/v1/officers/:id/status — Change officer status
  app.patch('/api/v1/officers/:id/status', {
    config: { allowedRoles: SUPERVISOR_PLUS },
  }, async (request) => {
    const { id } = officerParamsSchema.parse((request as any).params);
    const user = request.user;
    const body = statusBodySchema.parse(request.body);

    const officer = await prisma.officer.findUnique({
      where: { id },
      select: { id: true, zoneId: true },
    });

    if (!officer) {
      throw new NotFoundError('Officer not found');
    }

    // Supervisor can only change status for officers in their zone
    if (user.role === 'supervisor' && user.zoneId !== officer.zoneId) {
      throw new ForbiddenError('Access denied to this officer');
    }

    const updated = await prisma.officer.update({
      where: { id },
      data: { status: body.status as any },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    });

    return { data: updated };
  });

  // GET /api/v1/officers/:id/locations — Location history
  app.get('/api/v1/officers/:id/locations', {
    config: { allowedRoles: LOCATION_HISTORY_ROLES },
  }, async (request) => {
    const { id } = officerParamsSchema.parse((request as any).params);
    const user = request.user;
    const query = locationHistoryQuerySchema.parse(request.query);

    // Supervisor scoping
    if (user.role === 'supervisor') {
      const officer = await prisma.officer.findUnique({
        where: { id },
        select: { zoneId: true },
      });
      if (!officer) throw new NotFoundError('Officer not found');
      if (user.zoneId !== officer.zoneId) {
        throw new ForbiddenError('Access denied to this officer');
      }
    }

    let whereClause = `WHERE officer_id = '${id}'::uuid`;
    if (query.from) {
      whereClause += ` AND timestamp >= '${query.from}'::timestamptz`;
    }
    if (query.to) {
      whereClause += ` AND timestamp <= '${query.to}'::timestamptz`;
    }

    const locations = await prisma.$queryRawUnsafe<
      { lat: number; lng: number; timestamp: Date; accuracy_meters: number | null }[]
    >(
      `SELECT ST_Y(location) as lat, ST_X(location) as lng, timestamp, accuracy_meters
       FROM officer_locations ${whereClause}
       ORDER BY timestamp DESC LIMIT ${query.limit}`,
    );

    return {
      data: locations.map((loc) => ({
        lat: loc.lat,
        lng: loc.lng,
        timestamp: loc.timestamp,
        accuracyMeters: loc.accuracy_meters,
      })),
    };
  });
};

export default officersRoutes;
