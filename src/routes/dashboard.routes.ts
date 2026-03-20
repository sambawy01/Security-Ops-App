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

  // POST /api/v1/dashboard/relocate — Spread personnel around a GPS position (demo tool)
  app.post('/api/v1/dashboard/relocate', async (request) => {
    const { lat, lng } = request.body as { lat: number; lng: number };
    if (!lat || !lng) return { error: 'lat and lng required' };

    function jitter(center: number, spread: number): number {
      return center + (Math.random() - 0.5) * 2 * spread;
    }

    // Get active officers
    const activeOfficers = await prisma.officer.findMany({
      where: { status: 'active' },
      select: { id: true },
    });

    if (activeOfficers.length === 0) return { relocated: 0 };

    // Clear today's locations
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await prisma.$executeRaw`DELETE FROM officer_locations WHERE timestamp >= ${today}`;

    const now = new Date();
    let count = 0;

    for (let i = 0; i < activeOfficers.length; i++) {
      const officer = activeOfficers[i];

      // Spread pattern: 40% near (~200m), 35% mid (~400m), 25% far (~800m)
      let posLat: number, posLng: number;
      const ratio = i / activeOfficers.length;
      if (ratio < 0.4) {
        posLat = jitter(lat, 0.002);
        posLng = jitter(lng, 0.002);
      } else if (ratio < 0.75) {
        const angle = (i / activeOfficers.length) * Math.PI * 2;
        const dist = 0.003 + Math.random() * 0.002;
        posLat = lat + Math.sin(angle) * dist;
        posLng = lng + Math.cos(angle) * dist;
      } else {
        const angle = (i / activeOfficers.length) * Math.PI * 2;
        const dist = 0.005 + Math.random() * 0.003;
        posLat = lat + Math.sin(angle) * dist;
        posLng = lng + Math.cos(angle) * dist;
      }

      // Insert 5 recent location points (trail)
      for (let t = 0; t < 5; t++) {
        const ts = new Date(now.getTime() - (4 - t) * 60000);
        const trailLat = posLat + jitter(0, 0.0002) * (t / 5);
        const trailLng = posLng + jitter(0, 0.0002) * (t / 5);
        await prisma.$executeRaw`
          INSERT INTO officer_locations (id, officer_id, location, timestamp, accuracy_meters)
          VALUES (gen_random_uuid(), ${officer.id}::uuid,
            ST_SetSRID(ST_MakePoint(${trailLng}, ${trailLat}), 4326), ${ts}, ${5 + Math.random() * 10})
        `;
        count++;
      }
    }

    // Reposition open incidents around center too
    const openIncidents = await prisma.incident.findMany({
      where: { status: { in: ['open', 'assigned', 'in_progress', 'escalated'] } },
      select: { id: true },
    });
    for (const inc of openIncidents) {
      await prisma.$executeRaw`
        UPDATE incidents SET location = ST_SetSRID(ST_MakePoint(${jitter(lng, 0.003)}, ${jitter(lat, 0.003)}), 4326)
        WHERE id = ${inc.id}::uuid
      `;
    }

    return { relocated: activeOfficers.length, locations: count, incidents: openIncidents.length, center: { lat, lng } };
  });
};

export default dashboardRoutes;
