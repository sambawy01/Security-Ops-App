import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { AppError, ForbiddenError, NotFoundError } from '../lib/errors.js';
import {
  patrolRouteParamsSchema,
  patrolLogParamsSchema,
  checkpointParamsSchema,
  listPatrolRoutesQuerySchema,
  createPatrolRouteSchema,
  startPatrolSchema,
  confirmCheckpointSchema,
  listPatrolLogsQuerySchema,
} from '../schemas/patrols.schema.js';

const ROUTE_CREATE_ROLES = ['supervisor', 'manager', 'assistant_manager'];
const LIST_ROLES = ['officer', 'supervisor', 'hr_admin', 'manager', 'assistant_manager', 'operator'];

const patrolsRoutes: FastifyPluginAsync = async (app) => {
  // ─── Patrol Routes ──────────────────────────────────────────────────────────

  // GET /api/v1/patrols/routes — List patrol routes
  app.get('/api/v1/patrols/routes', {
    config: { allowedRoles: LIST_ROLES },
  }, async (request) => {
    const user = request.user;
    const query = listPatrolRoutesQuerySchema.parse(request.query);

    const where: Record<string, any> = {};

    // Supervisor zone scoping
    if (user.role === 'supervisor' && user.zoneId) {
      where.zoneId = user.zoneId;
    }

    if (query.zoneId) where.zoneId = query.zoneId;

    const routes = await prisma.patrolRoute.findMany({
      where,
      select: {
        id: true,
        name: true,
        zoneId: true,
        estimatedDurationMin: true,
        createdAt: true,
        zone: { select: { nameEn: true, nameAr: true } },
        _count: { select: { checkpoints: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: query.skip,
      take: query.take,
    });

    const data = routes.map((r) => ({
      id: r.id,
      name: r.name,
      zoneId: r.zoneId,
      estimatedDurationMin: r.estimatedDurationMin,
      createdAt: r.createdAt,
      zone: r.zone,
      checkpointCount: r._count.checkpoints,
    }));

    return { data };
  });

  // GET /api/v1/patrols/routes/:id — Route detail with ordered checkpoints
  app.get('/api/v1/patrols/routes/:id', {
    config: { allowedRoles: LIST_ROLES },
  }, async (request) => {
    const { id } = patrolRouteParamsSchema.parse((request as any).params);

    const route = await prisma.patrolRoute.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        zoneId: true,
        estimatedDurationMin: true,
        createdAt: true,
        zone: { select: { nameEn: true, nameAr: true } },
      },
    });

    if (!route) throw new NotFoundError('Patrol route not found');

    // Get checkpoints with lat/lng via raw SQL
    const checkpoints = await prisma.$queryRaw<any[]>`
      SELECT prc.id, prc.checkpoint_id as "checkpointId", prc.sequence_order as "sequenceOrder",
             prc.expected_dwell_min as "expectedDwellMin",
             ST_Y(c.location) as lat, ST_X(c.location) as lng,
             c.name_ar as "nameAr", c.name_en as "nameEn", c.type
      FROM patrol_route_checkpoints prc
      JOIN checkpoints c ON c.id = prc.checkpoint_id
      WHERE prc.route_id = ${id}::uuid
      ORDER BY prc.sequence_order
    `;

    return { data: { ...route, checkpoints } };
  });

  // POST /api/v1/patrols/routes — Create patrol route with checkpoints
  app.post('/api/v1/patrols/routes', {
    config: { allowedRoles: ROUTE_CREATE_ROLES },
  }, async (request, reply) => {
    const body = createPatrolRouteSchema.parse(request.body);

    const result = await prisma.$transaction(async (tx) => {
      const route = await tx.patrolRoute.create({
        data: {
          name: body.name,
          zoneId: body.zoneId,
          estimatedDurationMin: body.estimatedDurationMin,
        },
      });

      const checkpointData = body.checkpoints.map((cp) => ({
        routeId: route.id,
        checkpointId: cp.checkpointId,
        sequenceOrder: cp.sequenceOrder,
        expectedDwellMin: cp.expectedDwellMin,
      }));

      await tx.patrolRouteCheckpoint.createMany({ data: checkpointData });

      const checkpoints = await tx.patrolRouteCheckpoint.findMany({
        where: { routeId: route.id },
        orderBy: { sequenceOrder: 'asc' },
      });

      return { ...route, checkpoints };
    });

    return reply.status(201).send({ data: result });
  });

  // ─── Patrol Logs ────────────────────────────────────────────────────────────

  // POST /api/v1/patrols/logs — Start a patrol
  app.post('/api/v1/patrols/logs', {
    config: { allowedRoles: ['officer'] },
  }, async (request, reply) => {
    const user = request.user;
    const body = startPatrolSchema.parse(request.body);

    if (!user.officerId) {
      throw new ForbiddenError('Officer identity required');
    }

    // Validate officer has an active shift matching shiftId
    const shift = await prisma.shift.findUnique({ where: { id: body.shiftId } });
    if (!shift) throw new NotFoundError('Shift not found');
    if (shift.officerId !== user.officerId) {
      throw new ForbiddenError('Shift does not belong to you');
    }
    if (shift.status !== 'active') {
      throw new AppError(400, 'Shift must be active to start a patrol');
    }

    // Validate route exists
    const route = await prisma.patrolRoute.findUnique({ where: { id: body.routeId } });
    if (!route) throw new NotFoundError('Patrol route not found');

    const patrolLog = await prisma.patrolLog.create({
      data: {
        shiftId: body.shiftId,
        routeId: body.routeId,
        officerId: user.officerId,
        startedAt: new Date(),
      },
    });

    return reply.status(201).send({ data: patrolLog });
  });

  // POST /api/v1/patrols/logs/:id/checkpoints/:checkpointId — Confirm or skip checkpoint
  app.post('/api/v1/patrols/logs/:id/checkpoints/:checkpointId', {
    config: { allowedRoles: ['officer'] },
  }, async (request, reply) => {
    const user = request.user;
    const { id, checkpointId } = checkpointParamsSchema.parse((request as any).params);
    const body = confirmCheckpointSchema.parse(request.body);

    // Validate patrol log exists and officer owns it
    const patrolLog = await prisma.patrolLog.findUnique({ where: { id } });
    if (!patrolLog) throw new NotFoundError('Patrol log not found');
    if (patrolLog.officerId !== user.officerId) {
      throw new ForbiddenError('You do not own this patrol log');
    }

    // Check if a record already exists
    const existing = await prisma.$queryRaw<any[]>`
      SELECT id FROM patrol_checkpoints
      WHERE patrol_log_id = ${id}::uuid AND checkpoint_id = ${checkpointId}::uuid
    `;

    if (body.confirmed) {
      const lat = body.lat ?? 0;
      const lng = body.lng ?? 0;

      if (existing.length > 0) {
        await prisma.$executeRaw`
          UPDATE patrol_checkpoints
          SET arrived_at = NOW(), confirmed = true,
              gps_location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
          WHERE patrol_log_id = ${id}::uuid AND checkpoint_id = ${checkpointId}::uuid
        `;
      } else {
        await prisma.$executeRaw`
          INSERT INTO patrol_checkpoints (id, patrol_log_id, checkpoint_id, arrived_at, confirmed, gps_location)
          VALUES (gen_random_uuid(), ${id}::uuid, ${checkpointId}::uuid, NOW(), true,
                  ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))
        `;
      }
    } else {
      if (existing.length > 0) {
        await prisma.$executeRaw`
          UPDATE patrol_checkpoints
          SET confirmed = false, skip_reason = ${body.skipReason ?? null}
          WHERE patrol_log_id = ${id}::uuid AND checkpoint_id = ${checkpointId}::uuid
        `;
      } else {
        await prisma.$executeRaw`
          INSERT INTO patrol_checkpoints (id, patrol_log_id, checkpoint_id, confirmed, skip_reason)
          VALUES (gen_random_uuid(), ${id}::uuid, ${checkpointId}::uuid, false, ${body.skipReason ?? null})
        `;
      }
    }

    // Fetch the created/updated record
    const checkpointLog = await prisma.$queryRaw<any[]>`
      SELECT id, patrol_log_id as "patrolLogId", checkpoint_id as "checkpointId",
             arrived_at as "arrivedAt", confirmed, skip_reason as "skipReason",
             ST_Y(gps_location) as lat, ST_X(gps_location) as lng
      FROM patrol_checkpoints
      WHERE patrol_log_id = ${id}::uuid AND checkpoint_id = ${checkpointId}::uuid
    `;

    return reply.status(201).send({ data: checkpointLog[0] });
  });

  // GET /api/v1/patrols/logs — List patrol logs
  app.get('/api/v1/patrols/logs', {
    config: { allowedRoles: LIST_ROLES },
  }, async (request) => {
    const user = request.user;
    const query = listPatrolLogsQuerySchema.parse(request.query);

    const where: Record<string, any> = {};

    // Supervisor zone scoping via shift's zoneId
    if (user.role === 'supervisor' && user.zoneId) {
      where.shift = { zoneId: user.zoneId };
    }

    if (query.shiftId) where.shiftId = query.shiftId;
    if (query.officerId) where.officerId = query.officerId;

    // Date range filters on startedAt
    if (query.from || query.to) {
      where.startedAt = {};
      if (query.from) where.startedAt.gte = query.from;
      if (query.to) where.startedAt.lte = query.to;
    }

    const logs = await prisma.patrolLog.findMany({
      where,
      select: {
        id: true,
        shiftId: true,
        routeId: true,
        officerId: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        officer: { select: { nameEn: true } },
        route: { select: { name: true } },
        _count: { select: { checkpoints: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: query.skip,
      take: query.take,
    });

    const data = logs.map((l) => ({
      id: l.id,
      shiftId: l.shiftId,
      routeId: l.routeId,
      officerId: l.officerId,
      startedAt: l.startedAt,
      completedAt: l.completedAt,
      createdAt: l.createdAt,
      officer: l.officer,
      route: l.route,
      checkpointCount: l._count.checkpoints,
    }));

    return { data };
  });

  // GET /api/v1/patrols/logs/:id — Patrol log detail
  app.get('/api/v1/patrols/logs/:id', {
    config: { allowedRoles: LIST_ROLES },
  }, async (request) => {
    const { id } = patrolLogParamsSchema.parse((request as any).params);

    const log = await prisma.patrolLog.findUnique({
      where: { id },
      select: {
        id: true,
        shiftId: true,
        routeId: true,
        officerId: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        officer: { select: { nameEn: true } },
        route: { select: { name: true, estimatedDurationMin: true } },
      },
    });

    if (!log) throw new NotFoundError('Patrol log not found');

    // Get checkpoint logs with lat/lng via raw SQL
    const checkpoints = await prisma.$queryRaw<any[]>`
      SELECT pc.id, pc.patrol_log_id as "patrolLogId", pc.checkpoint_id as "checkpointId",
             pc.arrived_at as "arrivedAt", pc.confirmed, pc.skip_reason as "skipReason",
             ST_Y(pc.gps_location) as lat, ST_X(pc.gps_location) as lng
      FROM patrol_checkpoints pc
      WHERE pc.patrol_log_id = ${id}::uuid
    `;

    return { data: { ...log, checkpoints } };
  });
};

export default patrolsRoutes;
