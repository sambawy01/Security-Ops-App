import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';

const dashboardRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/v1/dashboard/stats — Aggregate stats for the dashboard
  app.get('/api/v1/dashboard/stats', async () => {
    const [incidentsByPriority, officersByStatus, totalIncidents, recentUpdates] = await Promise.all([
      prisma.incident.groupBy({
        by: ['priority'],
        where: { status: { in: ['open', 'assigned', 'in_progress', 'escalated'] } },
        _count: true,
      }),
      prisma.officer.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.incident.count({
        where: { status: { in: ['open', 'assigned', 'in_progress', 'escalated'] } },
      }),
      prisma.incidentUpdate.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          incident: { select: { title: true, priority: true } },
          author: { select: { nameEn: true } },
        },
      }),
    ]);
    return { incidentsByPriority, officersByStatus, totalIncidents, recentUpdates };
  });
};

export default dashboardRoutes;
