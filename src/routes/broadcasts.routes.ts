import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { ForbiddenError, NotFoundError } from '../lib/errors.js';
import {
  broadcastParamsSchema,
  createBroadcastSchema,
  listBroadcastsQuerySchema,
} from '../schemas/broadcasts.schema.js';

const SEND_ROLES = ['manager', 'assistant_manager'];
// Anyone authenticated can read broadcasts targeted to them — server filters
// by role/zone to prevent leakage. No role allowlist on read.

const broadcastsRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/v1/broadcasts — manager + assistant_manager send a new broadcast
  app.post('/api/v1/broadcasts', {
    config: { allowedRoles: SEND_ROLES },
  }, async (request, reply) => {
    const body = createBroadcastSchema.parse(request.body);
    const user = request.user;

    if (body.audience === 'zone' && !body.zoneId) {
      throw new ForbiddenError('zoneId is required when audience is "zone"');
    }

    const broadcast = await prisma.broadcast.create({
      data: {
        message: body.message,
        priority: body.priority,
        audience: body.audience,
        zoneId: body.zoneId ?? null,
        senderId: user.officerId,
      },
    });

    return reply.status(201).send({ data: broadcast });
  });

  // GET /api/v1/broadcasts — broadcasts targeted to caller, optionally
  // filtered to those created after `since`. Used by mobile + dashboard
  // listeners polling for new emergency instructions.
  app.get('/api/v1/broadcasts', async (request) => {
    const query = listBroadcastsQuerySchema.parse(request.query);
    const user = request.user;

    // Build the audience predicate. A broadcast reaches this caller if any of:
    //   - audience = 'all'
    //   - audience = caller's role
    //   - audience = 'zone' AND zoneId = caller's zoneId
    const audienceClauses: any[] = [
      { audience: 'all' },
      { audience: user.role },
    ];
    if (user.zoneId) {
      audienceClauses.push({ AND: [{ audience: 'zone' }, { zoneId: user.zoneId }] });
    }

    const where: any = { OR: audienceClauses };
    if (query.since) where.createdAt = { gt: new Date(query.since) };

    const broadcasts = await prisma.broadcast.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query.take,
      select: {
        id: true,
        message: true,
        priority: true,
        audience: true,
        zoneId: true,
        senderId: true,
        createdAt: true,
        acks: {
          where: { officerId: user.officerId },
          select: { ackedAt: true },
        },
      },
    });

    // Resolve sender names + flatten ack
    const senderIds = [...new Set(broadcasts.map((b) => b.senderId))];
    const senders = await prisma.officer.findMany({
      where: { id: { in: senderIds } },
      select: { id: true, nameEn: true, nameAr: true, badgeNumber: true, role: true },
    });
    const senderById = new Map(senders.map((s) => [s.id, s]));

    return {
      data: broadcasts.map((b) => ({
        id: b.id,
        message: b.message,
        priority: b.priority,
        audience: b.audience,
        zoneId: b.zoneId,
        createdAt: b.createdAt,
        sender: senderById.get(b.senderId) ?? null,
        ackedAt: b.acks[0]?.ackedAt ?? null,
      })),
    };
  });

  // POST /api/v1/broadcasts/:id/ack — caller marks a broadcast as seen
  app.post('/api/v1/broadcasts/:id/ack', async (request, reply) => {
    const { id } = broadcastParamsSchema.parse((request as any).params);
    const user = request.user;

    const broadcast = await prisma.broadcast.findUnique({ where: { id }, select: { id: true } });
    if (!broadcast) throw new NotFoundError('Broadcast not found');

    // Idempotent — unique constraint on (broadcastId, officerId) means a
    // second ack from the same caller is a no-op. upsert avoids the
    // duplicate-key error path.
    await prisma.broadcastAck.upsert({
      where: { broadcastId_officerId: { broadcastId: id, officerId: user.officerId } },
      create: { broadcastId: id, officerId: user.officerId },
      update: {},
    });

    return reply.status(200).send({ ok: true });
  });
};

export default broadcastsRoutes;
