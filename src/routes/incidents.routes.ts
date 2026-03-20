import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { AppError, ForbiddenError, NotFoundError } from '../lib/errors.js';
import {
  incidentParamsSchema,
  listIncidentsQuerySchema,
  createIncidentSchema,
  assignIncidentSchema,
  updateIncidentSchema,
  addUpdateSchema,
  cancelIncidentSchema,
} from '../schemas/incidents.schema.js';
import { categorizeIncident } from '../ai/service.js';
import { explainDispatch } from '../ai/service.js';
import { notifyWhatsAppStatusChange } from '../services/whatsapp.service.js';

const VALID_TRANSITIONS: Record<string, string[]> = {
  open: ['assigned', 'cancelled'],
  assigned: ['in_progress', 'cancelled'],
  in_progress: ['resolved', 'escalated', 'cancelled'],
  escalated: ['in_progress', 'cancelled'],
  resolved: ['closed', 'cancelled'],
};

const CREATE_ROLES = ['officer', 'supervisor', 'operator', 'manager', 'assistant_manager'];
const ASSIGN_ROLES = ['supervisor', 'operator', 'manager', 'assistant_manager'];
const CANCEL_ROLES = ['supervisor', 'manager', 'assistant_manager'];
const LIST_ROLES = ['officer', 'supervisor', 'operator', 'manager', 'assistant_manager', 'secretary'];
const UPDATE_ROLES = ['officer', 'supervisor', 'operator', 'manager', 'assistant_manager'];
const ADD_UPDATE_ROLES = ['officer', 'supervisor', 'operator', 'manager', 'assistant_manager'];

async function calculateSlaDeadlines(categoryId: string | undefined | null, priority: string) {
  if (!categoryId) return { slaResponseDeadline: null, slaResolutionDeadline: null };

  const slaRule = await prisma.slaRule.findUnique({
    where: { categoryId_priority: { categoryId, priority: priority as any } },
  });

  if (!slaRule) return { slaResponseDeadline: null, slaResolutionDeadline: null };

  const now = new Date();
  return {
    slaResponseDeadline: new Date(now.getTime() + slaRule.responseMinutes * 60000),
    slaResolutionDeadline: new Date(now.getTime() + slaRule.resolutionMinutes * 60000),
  };
}

const incidentsRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/v1/categories — List all incident categories (any authenticated role)
  app.get('/api/v1/categories', async () => {
    return prisma.category.findMany({ orderBy: { nameEn: 'asc' } });
  });

  // GET /api/v1/incidents/geojson — Open/active incidents as GeoJSON
  app.get('/api/v1/incidents/geojson', {
    config: { allowedRoles: LIST_ROLES },
  }, async (request) => {
    const incidents = await prisma.$queryRaw`
      SELECT i.id, i.title, i.priority, i.status, i.zone_id,
        i.sla_response_deadline, i.sla_resolution_deadline,
        c.name_en as category_name, ST_AsGeoJSON(i.location)::json as geometry
      FROM incidents i
      LEFT JOIN categories c ON c.id = i.category_id
      WHERE i.status IN ('open', 'assigned', 'in_progress', 'escalated')
      AND i.location IS NOT NULL
    `;
    return {
      type: 'FeatureCollection',
      features: (incidents as any[]).map(i => ({
        type: 'Feature',
        properties: {
          id: i.id, title: i.title, priority: i.priority, status: i.status,
          category: i.category_name, zoneId: i.zone_id,
          slaResponseDeadline: i.sla_response_deadline,
          slaResolutionDeadline: i.sla_resolution_deadline,
        },
        geometry: i.geometry,
      })),
    };
  });

  // GET /api/v1/incidents — List incidents
  app.get('/api/v1/incidents', {
    config: { allowedRoles: LIST_ROLES },
  }, async (request) => {
    const user = request.user;
    const query = listIncidentsQuerySchema.parse(request.query);

    const where: Record<string, any> = {};

    // Role-based scoping
    if (user.role === 'supervisor' && user.zoneId) {
      where.zoneId = user.zoneId;
    } else if (user.role === 'officer') {
      where.assignedOfficerId = user.officerId;
    }

    // Query filters
    if (query.status) where.status = query.status;
    if (query.zone) where.zoneId = query.zone;
    if (query.priority) where.priority = query.priority;
    if (query.assignedOfficerId) where.assignedOfficerId = query.assignedOfficerId;
    if (query.search) where.title = { contains: query.search, mode: 'insensitive' };
    if (query.categoryId) where.categoryId = query.categoryId;

    const incidents = await prisma.incident.findMany({
      where,
      select: {
        id: true,
        title: true,
        category: { select: { nameEn: true, nameAr: true } },
        priority: true,
        status: true,
        zoneId: true,
        assignedOfficerId: true,
        createdAt: true,
        slaResponseDeadline: true,
        slaResolutionDeadline: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: query.skip,
      take: query.take,
    });

    return { data: incidents };
  });

  // GET /api/v1/incidents/:id — Incident detail
  app.get('/api/v1/incidents/:id', {
    config: { allowedRoles: LIST_ROLES },
  }, async (request) => {
    const { id } = incidentParamsSchema.parse((request as any).params);
    const user = request.user;

    const incident = await prisma.incident.findUnique({
      where: { id },
      include: {
        updates: { orderBy: { createdAt: 'desc' } },
        media: true,
        category: { select: { nameEn: true, nameAr: true } },
        assignedOfficer: { select: { nameEn: true, nameAr: true } },
        zone: { select: { nameEn: true, nameAr: true } },
      },
    });

    if (!incident) throw new NotFoundError('Incident not found');

    // Supervisor zone scoping
    if (user.role === 'supervisor' && user.zoneId && incident.zoneId !== user.zoneId) {
      throw new ForbiddenError('Access denied to this incident');
    }

    return { data: incident };
  });

  // POST /api/v1/incidents — Create incident
  app.post('/api/v1/incidents', {
    config: { allowedRoles: CREATE_ROLES },
  }, async (request, reply) => {
    const user = request.user;
    const body = createIncidentSchema.parse(request.body);

    // Determine priority: explicit > category default > medium
    let priority = body.priority;
    if (!priority && body.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: body.categoryId },
        select: { defaultPriority: true },
      });
      if (category) priority = category.defaultPriority;
    }
    if (!priority) priority = 'medium';

    // Calculate SLA deadlines
    const sla = await calculateSlaDeadlines(body.categoryId, priority);

    // Build data object
    const data: Record<string, any> = {
      title: body.title,
      description: body.description ?? '',
      categoryId: body.categoryId ?? null,
      priority: priority as any,
      status: 'open' as any,
      zoneId: body.zoneId ?? null,
      reporterType: (body.reporterType as any) ?? 'officer',
      reporterPhone: body.reporterPhone ?? null,
      slaResponseDeadline: sla.slaResponseDeadline,
      slaResolutionDeadline: sla.slaResolutionDeadline,
    };

    // If officer creates, set createdByOfficerId
    if (user.role === 'officer') {
      data.createdByOfficerId = user.officerId;
    }

    // Create incident (without location first)
    const incident = await prisma.incident.create({
      data: data as any,
    });

    // If lat/lng provided, insert location via raw SQL
    if (body.lat !== undefined && body.lng !== undefined) {
      await prisma.$executeRaw`
        UPDATE incidents SET location = ST_SetSRID(ST_MakePoint(${body.lng}, ${body.lat}), 4326)
        WHERE id = ${incident.id}::uuid
      `;
    }

    // Re-fetch to return complete data
    const created = await prisma.incident.findUnique({
      where: { id: incident.id },
    });

    // Fire-and-forget AI categorization if no category was explicitly provided
    if (created && created.description && !body.categoryId) {
      categorizeIncident(created.description).then((suggestion) => {
        if (suggestion && suggestion.category && suggestion.category !== 'general') {
          prisma.incident.update({
            where: { id: created.id, categoryId: null },
            data: { categoryId: suggestion.category },
          }).catch(() => {}); // Ignore errors — best-effort AI suggestion
        }
      }).catch(() => {});
    }

    return reply.status(201).send({ data: created });
  });

  // POST /api/v1/incidents/:id/assign — Assign officer
  app.post('/api/v1/incidents/:id/assign', {
    config: { allowedRoles: ASSIGN_ROLES },
  }, async (request) => {
    const { id } = incidentParamsSchema.parse((request as any).params);
    const user = request.user;
    const body = assignIncidentSchema.parse(request.body);

    const incident = await prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundError('Incident not found');

    // Supervisor zone scoping
    if (user.role === 'supervisor' && user.zoneId && incident.zoneId !== user.zoneId) {
      throw new ForbiddenError('Access denied to this incident');
    }

    const now = new Date();

    // Build update data
    const updateData: Record<string, any> = {
      assignedOfficerId: body.officerId,
      assignedAt: now,
    };

    // Set status to assigned if currently open
    if (incident.status === 'open') {
      updateData.status = 'assigned';
    }

    // If SLA response deadline not set, calculate it now
    if (!incident.slaResponseDeadline && incident.categoryId) {
      const sla = await calculateSlaDeadlines(incident.categoryId, incident.priority);
      if (sla.slaResponseDeadline) {
        updateData.slaResponseDeadline = sla.slaResponseDeadline;
      }
      if (sla.slaResolutionDeadline && !incident.slaResolutionDeadline) {
        updateData.slaResolutionDeadline = sla.slaResolutionDeadline;
      }
    }

    const updated = await prisma.incident.update({
      where: { id },
      data: updateData as any,
    });

    // Create assignment update
    await prisma.incidentUpdate.create({
      data: {
        incidentId: id,
        authorId: user.officerId,
        type: 'assignment',
        content: '',
        metadata: { newOfficer: body.officerId },
      },
    });

    // Fire-and-forget: notify WhatsApp reporter of assignment
    if (incident.reporterType === 'whatsapp' && incident.reporterPhone && updateData.status === 'assigned') {
      notifyWhatsAppStatusChange(id, 'assigned', incident.reporterPhone).catch(() => {});
    }

    // Fire-and-forget AI dispatch explanation
    const assignedOfficer = await prisma.officer.findUnique({
      where: { id: body.officerId },
      select: { nameEn: true, badgeNumber: true },
    });
    if (assignedOfficer) {
      explainDispatch(
        [{ name: assignedOfficer.nameEn, badge: assignedOfficer.badgeNumber, score: 0, distance: 0, workload: 0 }],
        {
          title: incident.title,
          category: incident.categoryId ?? 'general',
          zone: incident.zoneId ?? 'unknown',
        },
        id,
      ).catch(() => {}); // Ignore errors — best-effort AI explanation
    }

    return { data: updated };
  });

  // PATCH /api/v1/incidents/:id — Update incident (status transitions)
  app.patch('/api/v1/incidents/:id', {
    config: { allowedRoles: UPDATE_ROLES },
  }, async (request) => {
    const { id } = incidentParamsSchema.parse((request as any).params);
    const body = updateIncidentSchema.parse(request.body);
    const user = request.user;

    const incident = await prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundError('Incident not found');

    const updateData: Record<string, any> = {};

    // Status transition validation
    if (body.status) {
      const allowed = VALID_TRANSITIONS[incident.status];
      if (!allowed || !allowed.includes(body.status)) {
        throw new AppError(400, `Invalid status transition from '${incident.status}' to '${body.status}'`);
      }
      updateData.status = body.status;

      if (body.status === 'resolved') {
        updateData.resolvedAt = new Date();
      } else if (body.status === 'closed') {
        updateData.closedAt = new Date();
      }
    }

    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.awaitingExternal !== undefined) updateData.awaitingExternal = body.awaitingExternal;

    const updated = await prisma.incident.update({
      where: { id },
      data: updateData as any,
    });

    // Create status_change update if status changed
    if (body.status) {
      await prisma.incidentUpdate.create({
        data: {
          incidentId: id,
          authorId: user.officerId,
          type: 'status_change',
          content: '',
          metadata: { old: incident.status, new: body.status },
        },
      });

      // Fire-and-forget: notify WhatsApp reporter of status change
      if (incident.reporterType === 'whatsapp' && incident.reporterPhone) {
        notifyWhatsAppStatusChange(id, body.status, incident.reporterPhone).catch(() => {});
      }
    }

    return { data: updated };
  });

  // POST /api/v1/incidents/:id/updates — Add update to incident
  app.post('/api/v1/incidents/:id/updates', {
    config: { allowedRoles: ADD_UPDATE_ROLES },
  }, async (request, reply) => {
    const { id } = incidentParamsSchema.parse((request as any).params);
    const user = request.user;
    const body = addUpdateSchema.parse(request.body);

    const incident = await prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundError('Incident not found');

    // Officer: must be assigned to this incident
    if (user.role === 'officer' && incident.assignedOfficerId !== user.officerId) {
      throw new ForbiddenError('You can only add updates to your assigned incidents');
    }

    // Supervisor: zone scoping
    if (user.role === 'supervisor' && user.zoneId && incident.zoneId !== user.zoneId) {
      throw new ForbiddenError('Access denied to this incident');
    }

    const update = await prisma.incidentUpdate.create({
      data: {
        incidentId: id,
        authorId: user.officerId,
        type: body.type as any,
        content: body.content,
        metadata: (body.metadata ?? undefined) as any,
      },
    });

    return reply.status(201).send({ data: update });
  });

  // POST /api/v1/incidents/:id/cancel — Cancel incident
  app.post('/api/v1/incidents/:id/cancel', {
    config: { allowedRoles: CANCEL_ROLES },
  }, async (request) => {
    const { id } = incidentParamsSchema.parse((request as any).params);
    const user = request.user;
    const body = cancelIncidentSchema.parse(request.body);

    const incident = await prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundError('Incident not found');

    // Cannot cancel already closed or cancelled incidents
    if (incident.status === 'closed' || incident.status === 'cancelled') {
      throw new AppError(400, `Cannot cancel incident with status '${incident.status}'`);
    }

    const updated = await prisma.incident.update({
      where: { id },
      data: {
        status: 'cancelled',
        cancelReason: body.reason,
      },
    });

    // Create status_change update
    await prisma.incidentUpdate.create({
      data: {
        incidentId: id,
        authorId: user.officerId,
        type: 'status_change',
        content: '',
        metadata: { old: incident.status, new: 'cancelled' },
      },
    });

    return { data: updated };
  });
};

export default incidentsRoutes;
