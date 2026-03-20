import { Worker, type Job } from 'bullmq';
import { prisma } from '../lib/prisma.js';
import { detectPatterns } from '../ai/service.js';
import { connection } from './setup.js';

// ─── Pattern Detection Worker ───────────────────────────────────────────────
// Runs every hour. SQL aggregations fed to AI for insight generation.
// ─────────────────────────────────────────────────────────────────────────────

async function processPatternDetection(_job: Job): Promise<void> {
  // 1. Incidents by hour-of-day for last 28 days
  const byHour = await prisma.$queryRaw<{ hour: string; count: number }[]>`
    SELECT EXTRACT(HOUR FROM created_at)::text AS hour, COUNT(*)::int AS count
    FROM incidents
    WHERE created_at > NOW() - INTERVAL '28 days'
    GROUP BY hour ORDER BY hour
  `;
  const incidentsByHour: Record<string, number> = {};
  for (const row of byHour) {
    incidentsByHour[row.hour] = row.count;
  }

  // 2. Incidents by day for last 7 days
  const byDay = await prisma.$queryRaw<{ day: string; count: number }[]>`
    SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
    FROM incidents
    WHERE created_at > NOW() - INTERVAL '7 days'
    GROUP BY day ORDER BY day
  `;
  const incidentsByDay: Record<string, number> = {};
  for (const row of byDay) {
    incidentsByDay[row.day] = row.count;
  }

  // 3. Category trends: this week vs last week
  const categoryTrends = await prisma.$queryRaw<
    { category: string; this_week: number; last_week: number }[]
  >`
    SELECT
      COALESCE(c.name_en, 'Uncategorized') AS category,
      COUNT(*) FILTER (WHERE i.created_at > NOW() - INTERVAL '7 days')::int AS this_week,
      COUNT(*) FILTER (WHERE i.created_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days')::int AS last_week
    FROM incidents i
    LEFT JOIN categories c ON c.id = i.category_id
    WHERE i.created_at > NOW() - INTERVAL '14 days'
    GROUP BY c.name_en
    ORDER BY this_week DESC
  `;

  // 4. Zone hotspots: current week count vs 28-day daily average
  const zoneHotspots = await prisma.$queryRaw<
    { zone: string; count: number; avg_count: number }[]
  >`
    SELECT
      z.name_en AS zone,
      COUNT(*) FILTER (WHERE i.created_at > NOW() - INTERVAL '7 days')::int AS count,
      (COUNT(*) FILTER (WHERE i.created_at > NOW() - INTERVAL '28 days')::float / 4.0)::float AS avg_count
    FROM incidents i
    JOIN zones z ON z.id = i.zone_id
    WHERE i.created_at > NOW() - INTERVAL '28 days'
      AND i.zone_id IS NOT NULL
    GROUP BY z.name_en
    ORDER BY count DESC
  `;

  // 5. Response time trend over last 7 days
  const responseTimeTrend = await prisma.$queryRaw<
    { date: string; avg_minutes: number }[]
  >`
    SELECT
      TO_CHAR(created_at, 'YYYY-MM-DD') AS date,
      ROUND(AVG(EXTRACT(EPOCH FROM (assigned_at - created_at)) / 60.0)::numeric, 1)::float AS avg_minutes
    FROM incidents
    WHERE created_at > NOW() - INTERVAL '7 days'
      AND assigned_at IS NOT NULL
    GROUP BY date
    ORDER BY date
  `;

  // Feed aggregated stats to AI
  await detectPatterns({
    incidentsByHour,
    incidentsByDay,
    categoryTrends: categoryTrends.map((r) => ({
      category: r.category,
      thisWeek: r.this_week,
      lastWeek: r.last_week,
    })),
    zoneHotspots: zoneHotspots.map((r) => ({
      zone: r.zone,
      count: r.count,
      avgCount: Math.round(r.avg_count * 10) / 10,
    })),
    responseTimeTrend: responseTimeTrend.map((r) => ({
      date: r.date,
      avgMinutes: r.avg_minutes,
    })),
  });

  console.log('[pattern] Pattern detection completed');
}

export const patternWorker = new Worker('pattern-detection', processPatternDetection, {
  connection,
  concurrency: 1,
});

patternWorker.on('failed', (job, err) => {
  console.error(`[pattern] Job ${job?.id} failed:`, err.message);
});
