import { Worker, type Job } from 'bullmq';
import { prisma } from '../lib/prisma.js';
import { recommendStaffing } from '../ai/service.js';
import { connection } from './setup.js';

// ─── Staffing Recommendation Worker ─────────────────────────────────────────
// Runs weekly (Sunday 6 AM). Aggregates zone data, feeds to AI.
// ─────────────────────────────────────────────────────────────────────────────

async function processStaffingRecommendation(_job: Job): Promise<void> {
  // 1. Incident count by zone by time-of-day (last 28 days) + peak hours
  const zoneIncidentData = await prisma.$queryRaw<
    {
      zone_id: string;
      zone_name: string;
      total_incidents: number;
      peak_hours: string[];
    }[]
  >`
    WITH hourly AS (
      SELECT
        i.zone_id,
        z.name_en AS zone_name,
        EXTRACT(HOUR FROM i.created_at)::int AS hr,
        COUNT(*)::int AS cnt
      FROM incidents i
      JOIN zones z ON z.id = i.zone_id
      WHERE i.created_at > NOW() - INTERVAL '28 days'
        AND i.zone_id IS NOT NULL
      GROUP BY i.zone_id, z.name_en, hr
    ),
    peak AS (
      SELECT
        zone_id,
        zone_name,
        SUM(cnt)::int AS total_incidents,
        ARRAY_AGG(hr::text ORDER BY cnt DESC)
          FILTER (WHERE cnt >= (SELECT AVG(h2.cnt) * 1.5 FROM hourly h2 WHERE h2.zone_id = hourly.zone_id))
          AS peak_hours
      FROM hourly
      GROUP BY zone_id, zone_name
    )
    SELECT zone_id, zone_name, total_incidents, COALESCE(peak_hours, ARRAY[]::text[]) AS peak_hours
    FROM peak
    ORDER BY total_incidents DESC
  `;

  // 2. Current shift officer count by zone
  const zoneOfficerCounts = await prisma.$queryRaw<
    { zone_id: string; officer_count: number }[]
  >`
    SELECT s.zone_id, COUNT(DISTINCT s.officer_id)::int AS officer_count
    FROM shifts s
    WHERE s.status = 'active'
    GROUP BY s.zone_id
  `;
  const officerCountMap = new Map(zoneOfficerCounts.map((r) => [r.zone_id, r.officer_count]));

  // 3. Average response time per zone
  const zoneResponseTimes = await prisma.$queryRaw<
    { zone_id: string; avg_response: number }[]
  >`
    SELECT
      zone_id,
      ROUND(AVG(EXTRACT(EPOCH FROM (assigned_at - created_at)) / 60.0)::numeric, 1)::float AS avg_response
    FROM incidents
    WHERE created_at > NOW() - INTERVAL '28 days'
      AND assigned_at IS NOT NULL
      AND zone_id IS NOT NULL
    GROUP BY zone_id
  `;
  const responseMap = new Map(zoneResponseTimes.map((r) => [r.zone_id, r.avg_response]));

  // 4. Patrol coverage per zone (completed / total patrols)
  const patrolCoverage = await prisma.$queryRaw<
    { zone_id: string; coverage: number }[]
  >`
    SELECT
      s.zone_id,
      CASE
        WHEN COUNT(*) = 0 THEN 0
        ELSE ROUND((COUNT(*) FILTER (WHERE pl.completed_at IS NOT NULL)::float / COUNT(*)::float * 100)::numeric, 1)::float
      END AS coverage
    FROM patrol_logs pl
    JOIN shifts s ON s.id = pl.shift_id
    WHERE pl.started_at > NOW() - INTERVAL '28 days'
    GROUP BY s.zone_id
  `;
  const coverageMap = new Map(patrolCoverage.map((r) => [r.zone_id, r.coverage]));

  // Build zone data for AI
  const zoneData = zoneIncidentData.map((z) => ({
    zone: z.zone_name,
    currentOfficers: officerCountMap.get(z.zone_id) ?? 0,
    incidentsPerDay: Math.round((z.total_incidents / 28) * 10) / 10,
    peakHours: z.peak_hours ?? [],
    avgResponseMinutes: responseMap.get(z.zone_id) ?? 0,
    patrolCoverage: coverageMap.get(z.zone_id) ?? 0,
  }));

  if (zoneData.length === 0) {
    console.log('[staffing] No zone data available — skipping recommendation');
    return;
  }

  await recommendStaffing(zoneData);
  console.log('[staffing] Staffing recommendation completed');
}

export const staffingWorker = new Worker('staffing-recommendation', processStaffingRecommendation, {
  connection,
  concurrency: 1,
});

staffingWorker.on('failed', (job, err) => {
  console.error(`[staffing] Job ${job?.id} failed:`, err.message);
});
