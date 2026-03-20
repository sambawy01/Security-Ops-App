import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { AppError, ForbiddenError, NotFoundError } from '../lib/errors.js';
import {
  shiftParamsSchema,
  listShiftsQuerySchema,
  createShiftSchema,
  checkInSchema,
  checkOutSchema,
  changeShiftStatusSchema,
} from '../schemas/shifts.schema.js';

const CREATE_ROLES = ['hr_admin', 'manager', 'assistant_manager'];
const STATUS_CHANGE_ROLES = ['supervisor', 'manager', 'assistant_manager', 'hr_admin'];
const LIST_ROLES = ['officer', 'supervisor', 'hr_admin', 'manager', 'assistant_manager', 'operator'];

const shiftsRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/v1/shifts — List shifts
  app.get('/api/v1/shifts', {
    config: { allowedRoles: LIST_ROLES },
  }, async (request) => {
    const user = request.user;
    const query = listShiftsQuerySchema.parse(request.query);

    const where: Record<string, any> = {};

    // Role-based scoping
    if (user.role === 'supervisor' && user.zoneId) {
      where.zoneId = user.zoneId;
    } else if (user.role === 'officer') {
      where.officerId = user.officerId;
    }

    // Query filters
    if (query.zoneId) where.zoneId = query.zoneId;
    if (query.officerId) where.officerId = query.officerId;
    if (query.status) where.status = query.status;

    // Date range filters
    if (query.from || query.to) {
      where.scheduledStart = {};
      if (query.from) where.scheduledStart.gte = query.from;
      if (query.to) where.scheduledStart.lte = query.to;
    }

    const shifts = await prisma.shift.findMany({
      where,
      select: {
        id: true,
        officerId: true,
        zoneId: true,
        status: true,
        scheduledStart: true,
        scheduledEnd: true,
        actualCheckIn: true,
        actualCheckOut: true,
        handoverNotes: true,
        isOvertime: true,
        parentShiftId: true,
        createdAt: true,
        officer: { select: { nameEn: true, nameAr: true, badgeNumber: true } },
        zone: { select: { nameEn: true, nameAr: true } },
      },
      orderBy: { scheduledStart: 'desc' },
      skip: query.skip,
      take: query.take,
    });

    return { data: shifts };
  });

  // GET /api/v1/shifts/:id — Shift detail
  app.get('/api/v1/shifts/:id', {
    config: { allowedRoles: LIST_ROLES },
  }, async (request) => {
    const { id } = shiftParamsSchema.parse((request as any).params);

    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        officer: { select: { nameEn: true, nameAr: true, badgeNumber: true } },
        zone: { select: { nameEn: true, nameAr: true } },
        patrolLogs: true,
      },
    });

    if (!shift) throw new NotFoundError('Shift not found');

    return { data: shift };
  });

  // POST /api/v1/shifts — Create shift
  app.post('/api/v1/shifts', {
    config: { allowedRoles: CREATE_ROLES },
  }, async (request, reply) => {
    const body = createShiftSchema.parse(request.body);

    const shift = await prisma.shift.create({
      data: {
        officerId: body.officerId,
        zoneId: body.zoneId,
        scheduledStart: body.scheduledStart,
        scheduledEnd: body.scheduledEnd,
        isOvertime: body.isOvertime ?? false,
        parentShiftId: body.parentShiftId ?? null,
        status: 'scheduled',
      },
    });

    return reply.status(201).send({ data: shift });
  });

  // POST /api/v1/shifts/:id/check-in — Officer check-in
  app.post('/api/v1/shifts/:id/check-in', {
    config: { allowedRoles: LIST_ROLES },
  }, async (request) => {
    const { id } = shiftParamsSchema.parse((request as any).params);
    const user = request.user;
    const body = checkInSchema.parse(request.body);

    const shift = await prisma.shift.findUnique({ where: { id } });
    if (!shift) throw new NotFoundError('Shift not found');

    // Officer can only check in to their own shift
    if (user.officerId !== shift.officerId) {
      throw new ForbiddenError('You can only check in to your own shift');
    }

    // Update shift with PostGIS location
    await prisma.$executeRaw`
      UPDATE shifts SET check_in_location = ST_SetSRID(ST_MakePoint(${body.lng}, ${body.lat}), 4326),
      actual_check_in = NOW(), status = 'active'
      WHERE id = ${id}::uuid
    `;

    // Set officer status to active
    await prisma.officer.update({
      where: { id: user.officerId! },
      data: { status: 'active' },
    });

    // Re-fetch the updated shift
    const updated = await prisma.shift.findUnique({ where: { id } });
    return { data: updated };
  });

  // POST /api/v1/shifts/:id/check-out — Officer check-out
  app.post('/api/v1/shifts/:id/check-out', {
    config: { allowedRoles: LIST_ROLES },
  }, async (request) => {
    const { id } = shiftParamsSchema.parse((request as any).params);
    const user = request.user;
    const body = checkOutSchema.parse(request.body);

    const shift = await prisma.shift.findUnique({ where: { id } });
    if (!shift) throw new NotFoundError('Shift not found');

    // Officer can only check out their own shift
    if (user.officerId !== shift.officerId) {
      throw new ForbiddenError('You can only check out of your own shift');
    }

    // Update shift with PostGIS location
    await prisma.$executeRaw`
      UPDATE shifts SET check_out_location = ST_SetSRID(ST_MakePoint(${body.lng}, ${body.lat}), 4326),
      actual_check_out = NOW(), status = 'completed',
      handover_notes = ${body.handoverNotes ?? null}
      WHERE id = ${id}::uuid
    `;

    // Set officer status to off_duty
    await prisma.officer.update({
      where: { id: user.officerId! },
      data: { status: 'off_duty' },
    });

    // Re-fetch the updated shift
    const updated = await prisma.shift.findUnique({ where: { id } });
    return { data: updated };
  });

  // PATCH /api/v1/shifts/:id/status — Change shift status
  app.patch('/api/v1/shifts/:id/status', {
    config: { allowedRoles: STATUS_CHANGE_ROLES },
  }, async (request) => {
    const { id } = shiftParamsSchema.parse((request as any).params);
    const user = request.user;
    const body = changeShiftStatusSchema.parse(request.body);

    const shift = await prisma.shift.findUnique({ where: { id } });
    if (!shift) throw new NotFoundError('Shift not found');

    // Supervisor zone scoping
    if (user.role === 'supervisor' && user.zoneId && shift.zoneId !== user.zoneId) {
      throw new ForbiddenError('Access denied to this shift');
    }

    // Validate status transitions
    const currentStatus = shift.status;
    const newStatus = body.status;

    if (newStatus === 'called_off') {
      // scheduled -> called_off OR active -> called_off (early departure)
      if (currentStatus !== 'scheduled' && currentStatus !== 'active') {
        throw new AppError(400, `Cannot transition from '${currentStatus}' to 'called_off'`);
      }
    } else if (newStatus === 'no_show') {
      // scheduled -> no_show (only if >30min past scheduledStart)
      if (currentStatus !== 'scheduled') {
        throw new AppError(400, `Cannot transition from '${currentStatus}' to 'no_show'`);
      }
      const now = new Date();
      const thirtyMinAfterStart = new Date(shift.scheduledStart.getTime() + 30 * 60 * 1000);
      if (now < thirtyMinAfterStart) {
        throw new AppError(400, 'Cannot mark as no_show until 30 minutes after scheduled start');
      }
    }

    const updated = await prisma.shift.update({
      where: { id },
      data: { status: newStatus as any },
    });

    return { data: updated };
  });
};

export default shiftsRoutes;
