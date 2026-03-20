import { Worker, type Job } from 'bullmq';
import { prisma } from '../lib/prisma.js';
import {
  generateDailyReport,
  generateWeeklyReport,
  generateMonthlyReport,
} from '../ai/service.js';
import { connection } from './setup.js';

// ─── Report Generation Worker ───────────────────────────────────────────────
// Handles daily, weekly, and monthly reports based on job name.
// ─────────────────────────────────────────────────────────────────────────────

// ── Daily Report (10 PM every day, Arabic) ─────────────────────────────────

async function buildDailyReport(): Promise<void> {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 86_400_000);

  // Total and resolved incidents today
  const [totalIncidents, resolvedIncidents] = await Promise.all([
    prisma.incident.count({
      where: { createdAt: { gte: startOfDay, lt: endOfDay } },
    }),
    prisma.incident.count({
      where: {
        resolvedAt: { gte: startOfDay, lt: endOfDay },
        status: { in: ['resolved', 'closed'] },
      },
    }),
  ]);

  // Average response time (minutes)
  const avgResponseResult = await prisma.$queryRaw<{ avg_minutes: number | null }[]>`
    SELECT ROUND(AVG(EXTRACT(EPOCH FROM (assigned_at - created_at)) / 60.0)::numeric, 1)::float AS avg_minutes
    FROM incidents
    WHERE created_at >= ${startOfDay} AND created_at < ${endOfDay}
      AND assigned_at IS NOT NULL
  `;
  const avgResponseMinutes = avgResponseResult[0]?.avg_minutes ?? 0;

  // Patrol completion
  const patrolStats = await prisma.$queryRaw<{ scheduled: number; completed: number }[]>`
    SELECT
      COUNT(*)::int AS scheduled,
      COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::int AS completed
    FROM patrol_logs
    WHERE started_at >= ${startOfDay} AND started_at < ${endOfDay}
  `;
  const patrolsScheduled = patrolStats[0]?.scheduled ?? 0;
  const patrolsCompleted = patrolStats[0]?.completed ?? 0;

  // Attendance
  const attendanceStats = await prisma.$queryRaw<
    { present: number; absent: number; late: number }[]
  >`
    SELECT
      COUNT(*) FILTER (WHERE status = 'active' OR status = 'completed')::int AS present,
      COUNT(*) FILTER (WHERE status = 'no_show')::int AS absent,
      COUNT(*) FILTER (WHERE actual_check_in > scheduled_start + INTERVAL '15 minutes')::int AS late
    FROM shifts
    WHERE scheduled_start >= ${startOfDay} AND scheduled_start < ${endOfDay}
  `;
  const attendance = attendanceStats[0] ?? { present: 0, absent: 0, late: 0 };

  // Top categories
  const topCategories = await prisma.$queryRaw<{ category: string; count: number }[]>`
    SELECT COALESCE(c.name_en, 'Uncategorized') AS category, COUNT(*)::int AS count
    FROM incidents i
    LEFT JOIN categories c ON c.id = i.category_id
    WHERE i.created_at >= ${startOfDay} AND i.created_at < ${endOfDay}
    GROUP BY c.name_en
    ORDER BY count DESC LIMIT 5
  `;

  // Zone breakdown
  const zoneBreakdown = await prisma.$queryRaw<{ zone: string; incidents: number }[]>`
    SELECT COALESCE(z.name_en, 'Unassigned') AS zone, COUNT(*)::int AS incidents
    FROM incidents i
    LEFT JOIN zones z ON z.id = i.zone_id
    WHERE i.created_at >= ${startOfDay} AND i.created_at < ${endOfDay}
    GROUP BY z.name_en
    ORDER BY incidents DESC
  `;

  const result = await generateDailyReport({
    date: startOfDay.toISOString().slice(0, 10),
    totalIncidents,
    resolvedIncidents,
    avgResponseMinutes,
    attendance,
    patrolsCompleted,
    patrolsScheduled,
    topCategories,
    zoneBreakdown,
  });

  await prisma.generatedReport.create({
    data: {
      type: 'daily',
      periodStart: startOfDay,
      periodEnd: endOfDay,
      content: {
        narrative: result.narrative,
        stats: {
          totalIncidents,
          resolvedIncidents,
          avgResponseMinutes,
          attendance,
          patrolsCompleted,
          patrolsScheduled,
        },
      },
    },
  });

  console.log('[report] Daily report generated');
}

// ── Weekly Report (Sunday 6 AM, Arabic) ────────────────────────────────────

async function buildWeeklyReport(): Promise<void> {
  const now = new Date();
  const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(weekEnd.getTime() - 7 * 86_400_000);
  const prevWeekStart = new Date(weekStart.getTime() - 7 * 86_400_000);

  const [totalIncidents, resolvedIncidents, previousWeekIncidents] = await Promise.all([
    prisma.incident.count({ where: { createdAt: { gte: weekStart, lt: weekEnd } } }),
    prisma.incident.count({
      where: { resolvedAt: { gte: weekStart, lt: weekEnd }, status: { in: ['resolved', 'closed'] } },
    }),
    prisma.incident.count({ where: { createdAt: { gte: prevWeekStart, lt: weekStart } } }),
  ]);

  const avgResponseResult = await prisma.$queryRaw<{ avg_minutes: number | null }[]>`
    SELECT ROUND(AVG(EXTRACT(EPOCH FROM (assigned_at - created_at)) / 60.0)::numeric, 1)::float AS avg_minutes
    FROM incidents WHERE created_at >= ${weekStart} AND created_at < ${weekEnd} AND assigned_at IS NOT NULL
  `;

  const patrolCompletion = await prisma.$queryRaw<{ rate: number }[]>`
    SELECT CASE WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND((COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::float / COUNT(*)::float * 100)::numeric, 1)::float
    END AS rate
    FROM patrol_logs WHERE started_at >= ${weekStart} AND started_at < ${weekEnd}
  `;

  const slaCompliance = await prisma.$queryRaw<{ rate: number }[]>`
    SELECT CASE WHEN COUNT(*) = 0 THEN 100
      ELSE ROUND((COUNT(*) FILTER (WHERE (sla_resolution_deadline IS NULL OR resolved_at <= sla_resolution_deadline))::float
        / COUNT(*)::float * 100)::numeric, 1)::float
    END AS rate
    FROM incidents
    WHERE created_at >= ${weekStart} AND created_at < ${weekEnd}
      AND status IN ('resolved', 'closed')
  `;

  const topCategories = await prisma.$queryRaw<{ category: string; count: number }[]>`
    SELECT COALESCE(c.name_en, 'Uncategorized') AS category, COUNT(*)::int AS count
    FROM incidents i LEFT JOIN categories c ON c.id = i.category_id
    WHERE i.created_at >= ${weekStart} AND i.created_at < ${weekEnd}
    GROUP BY c.name_en ORDER BY count DESC LIMIT 5
  `;

  const zoneBreakdown = await prisma.$queryRaw<{ zone: string; incidents: number }[]>`
    SELECT COALESCE(z.name_en, 'Unassigned') AS zone, COUNT(*)::int AS incidents
    FROM incidents i LEFT JOIN zones z ON z.id = i.zone_id
    WHERE i.created_at >= ${weekStart} AND i.created_at < ${weekEnd}
    GROUP BY z.name_en ORDER BY incidents DESC
  `;

  const notableIncidents = await prisma.$queryRaw<{ title: string; resolution: string }[]>`
    SELECT i.title, COALESCE(
      (SELECT iu.content FROM incident_updates iu WHERE iu.incident_id = i.id AND iu.type = 'status_change' ORDER BY iu.created_at DESC LIMIT 1),
      'Pending'
    ) AS resolution
    FROM incidents i
    WHERE i.created_at >= ${weekStart} AND i.created_at < ${weekEnd}
      AND i.priority IN ('critical', 'high')
    ORDER BY i.created_at DESC LIMIT 5
  `;

  const result = await generateWeeklyReport({
    weekStart: weekStart.toISOString().slice(0, 10),
    weekEnd: weekEnd.toISOString().slice(0, 10),
    totalIncidents,
    resolvedIncidents,
    avgResponseMinutes: avgResponseResult[0]?.avg_minutes ?? 0,
    previousWeekIncidents,
    patrolCompletionRate: patrolCompletion[0]?.rate ?? 0,
    slaComplianceRate: slaCompliance[0]?.rate ?? 100,
    topCategories,
    zoneBreakdown,
    notableIncidents,
  });

  await prisma.generatedReport.create({
    data: {
      type: 'weekly',
      periodStart: weekStart,
      periodEnd: weekEnd,
      content: { narrative: result.narrative, totalIncidents, resolvedIncidents },
    },
  });

  console.log('[report] Weekly report generated');
}

// ── Monthly Report (1st of month 6 AM, English) ───────────────────────────

async function buildMonthlyReport(): Promise<void> {
  const now = new Date();
  const monthEnd = new Date(now.getFullYear(), now.getMonth(), 1); // 1st of current month
  const monthStart = new Date(monthEnd.getFullYear(), monthEnd.getMonth() - 1, 1); // 1st of prev month
  const prevMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
  const monthName = monthStart.toLocaleString('en', { month: 'long' });

  const [totalIncidents, resolvedIncidents, previousMonthIncidents] = await Promise.all([
    prisma.incident.count({ where: { createdAt: { gte: monthStart, lt: monthEnd } } }),
    prisma.incident.count({
      where: { resolvedAt: { gte: monthStart, lt: monthEnd }, status: { in: ['resolved', 'closed'] } },
    }),
    prisma.incident.count({ where: { createdAt: { gte: prevMonthStart, lt: monthStart } } }),
  ]);

  const avgResponseResult = await prisma.$queryRaw<{ avg_minutes: number | null }[]>`
    SELECT ROUND(AVG(EXTRACT(EPOCH FROM (assigned_at - created_at)) / 60.0)::numeric, 1)::float AS avg_minutes
    FROM incidents WHERE created_at >= ${monthStart} AND created_at < ${monthEnd} AND assigned_at IS NOT NULL
  `;

  const patrolCompletion = await prisma.$queryRaw<{ rate: number }[]>`
    SELECT CASE WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND((COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::float / COUNT(*)::float * 100)::numeric, 1)::float
    END AS rate FROM patrol_logs WHERE started_at >= ${monthStart} AND started_at < ${monthEnd}
  `;

  const slaCompliance = await prisma.$queryRaw<{ rate: number }[]>`
    SELECT CASE WHEN COUNT(*) = 0 THEN 100
      ELSE ROUND((COUNT(*) FILTER (WHERE (sla_resolution_deadline IS NULL OR resolved_at <= sla_resolution_deadline))::float
        / COUNT(*)::float * 100)::numeric, 1)::float
    END AS rate FROM incidents
    WHERE created_at >= ${monthStart} AND created_at < ${monthEnd} AND status IN ('resolved', 'closed')
  `;

  const topCategories = await prisma.$queryRaw<{ category: string; count: number }[]>`
    SELECT COALESCE(c.name_en, 'Uncategorized') AS category, COUNT(*)::int AS count
    FROM incidents i LEFT JOIN categories c ON c.id = i.category_id
    WHERE i.created_at >= ${monthStart} AND i.created_at < ${monthEnd}
    GROUP BY c.name_en ORDER BY count DESC LIMIT 8
  `;

  const zoneBreakdown = await prisma.$queryRaw<
    { zone: string; incidents: number; resolved: number; avg_response: number }[]
  >`
    SELECT
      COALESCE(z.name_en, 'Unassigned') AS zone,
      COUNT(*)::int AS incidents,
      COUNT(*) FILTER (WHERE i.status IN ('resolved', 'closed'))::int AS resolved,
      COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (i.assigned_at - i.created_at)) / 60.0) FILTER (WHERE i.assigned_at IS NOT NULL)::numeric, 1)::float, 0) AS avg_response
    FROM incidents i LEFT JOIN zones z ON z.id = i.zone_id
    WHERE i.created_at >= ${monthStart} AND i.created_at < ${monthEnd}
    GROUP BY z.name_en ORDER BY incidents DESC
  `;

  // Staff utilization: % of scheduled shifts that were active/completed
  const staffUtil = await prisma.$queryRaw<{ utilization: number }[]>`
    SELECT CASE WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND((COUNT(*) FILTER (WHERE status IN ('active', 'completed'))::float / COUNT(*)::float * 100)::numeric, 1)::float
    END AS utilization FROM shifts WHERE scheduled_start >= ${monthStart} AND scheduled_start < ${monthEnd}
  `;

  // Overtime hours
  const overtimeResult = await prisma.$queryRaw<{ hours: number }[]>`
    SELECT COALESCE(ROUND(SUM(EXTRACT(EPOCH FROM (actual_check_out - scheduled_end)) / 3600.0)::numeric, 1)::float, 0) AS hours
    FROM shifts
    WHERE scheduled_start >= ${monthStart} AND scheduled_start < ${monthEnd}
      AND is_overtime = true AND actual_check_out IS NOT NULL
  `;

  const notableIncidents = await prisma.$queryRaw<
    { title: string; category: string; resolution: string }[]
  >`
    SELECT
      i.title,
      COALESCE(c.name_en, 'Uncategorized') AS category,
      COALESCE(
        (SELECT iu.content FROM incident_updates iu WHERE iu.incident_id = i.id AND iu.type = 'status_change' ORDER BY iu.created_at DESC LIMIT 1),
        'Pending'
      ) AS resolution
    FROM incidents i LEFT JOIN categories c ON c.id = i.category_id
    WHERE i.created_at >= ${monthStart} AND i.created_at < ${monthEnd}
      AND i.priority IN ('critical', 'high')
    ORDER BY i.created_at DESC LIMIT 10
  `;

  const result = await generateMonthlyReport({
    month: monthName,
    year: monthStart.getFullYear(),
    totalIncidents,
    resolvedIncidents,
    avgResponseMinutes: avgResponseResult[0]?.avg_minutes ?? 0,
    previousMonthIncidents,
    patrolCompletionRate: patrolCompletion[0]?.rate ?? 0,
    slaComplianceRate: slaCompliance[0]?.rate ?? 100,
    topCategories,
    zoneBreakdown: zoneBreakdown.map((z) => ({
      zone: z.zone,
      incidents: z.incidents,
      resolved: z.resolved,
      avgResponse: z.avg_response,
    })),
    staffUtilization: staffUtil[0]?.utilization ?? 0,
    overtimeHours: overtimeResult[0]?.hours ?? 0,
    notableIncidents,
  });

  await prisma.generatedReport.create({
    data: {
      type: 'monthly',
      periodStart: monthStart,
      periodEnd: monthEnd,
      content: { narrative: result.narrative, totalIncidents, resolvedIncidents },
    },
  });

  console.log('[report] Monthly report generated');
}

// ─── Main Processor ─────────────────────────────────────────────────────────

async function processReport(job: Job): Promise<void> {
  switch (job.name) {
    case 'daily-report':
      await buildDailyReport();
      break;
    case 'weekly-report':
      await buildWeeklyReport();
      break;
    case 'monthly-report':
      await buildMonthlyReport();
      break;
    default:
      console.warn(`[report] Unknown report type: ${job.name}`);
  }
}

export const reportWorker = new Worker('report-generation', processReport, {
  connection,
  concurrency: 1,
});

reportWorker.on('failed', (job, err) => {
  console.error(`[report] Job ${job?.id} failed:`, err.message);
});
