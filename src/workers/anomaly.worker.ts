import { Worker, type Job } from 'bullmq';
import { prisma } from '../lib/prisma.js';
import { generateAnomalyAlert } from '../ai/service.js';
import { connection } from './setup.js';

// ─── Anomaly Detection Worker ───────────────────────────────────────────────
// Runs every 5 minutes. Four deterministic checks, AI generates alert text.
// ─────────────────────────────────────────────────────────────────────────────

// ── Check 1: Officer stationary > 20 minutes ──────────────────────────────

async function checkStationaryOfficers(): Promise<void> {
  // Find active officers on active shifts whose location has barely moved
  // in the last 20 minutes (movement < 10 meters across all pings).
  const stationaryOfficers = await prisma.$queryRaw<
    { officer_id: string; name_en: string; zone_id: string | null; max_distance: number }[]
  >`
    WITH active_officers AS (
      SELECT o.id AS officer_id, o.name_en, o.zone_id
      FROM officers o
      JOIN shifts s ON s.officer_id = o.id
      WHERE o.status = 'active'
        AND s.status = 'active'
    ),
    recent_locations AS (
      SELECT
        ol.officer_id,
        ol.location,
        ol.timestamp
      FROM officer_locations ol
      WHERE ol.timestamp > NOW() - INTERVAL '20 minutes'
    ),
    movement AS (
      SELECT
        rl.officer_id,
        MAX(ST_Distance(
          rl.location::geography,
          first_loc.location::geography
        )) AS max_distance
      FROM recent_locations rl
      JOIN LATERAL (
        SELECT location FROM recent_locations rl2
        WHERE rl2.officer_id = rl.officer_id
        ORDER BY rl2.timestamp ASC LIMIT 1
      ) first_loc ON true
      GROUP BY rl.officer_id
      HAVING COUNT(*) >= 2
    )
    SELECT ao.officer_id, ao.name_en, ao.zone_id, m.max_distance
    FROM active_officers ao
    JOIN movement m ON m.officer_id = ao.officer_id
    WHERE m.max_distance < 10
  `;

  for (const officer of stationaryOfficers) {
    await generateAnomalyAlert(
      'offline',
      {
        officerId: officer.officer_id,
        officerName: officer.name_en,
        durationMinutes: 20,
        maxMovementMeters: officer.max_distance,
      },
      officer.zone_id ?? undefined,
    );
  }

  if (stationaryOfficers.length > 0) {
    console.log(`[anomaly] Detected ${stationaryOfficers.length} stationary officer(s)`);
  }
}

// ── Check 2: Officer outside assigned zone ─────────────────────────────────

async function checkOfficersOutsideZone(): Promise<void> {
  const outsideOfficers = await prisma.$queryRaw<
    { officer_id: string; name_en: string; zone_id: string; zone_name: string }[]
  >`
    SELECT DISTINCT o.id AS officer_id, o.name_en, z.id AS zone_id, z.name_en AS zone_name
    FROM officers o
    JOIN zones z ON z.id = o.zone_id
    JOIN LATERAL (
      SELECT location FROM officer_locations ol
      WHERE ol.officer_id = o.id
      ORDER BY ol.timestamp DESC LIMIT 1
    ) latest ON true
    WHERE o.status = 'active'
      AND z.boundary IS NOT NULL
      AND NOT ST_Contains(z.boundary, latest.location)
  `;

  for (const officer of outsideOfficers) {
    await generateAnomalyAlert(
      'zone_overload',
      {
        officerId: officer.officer_id,
        officerName: officer.name_en,
        assignedZone: officer.zone_name,
        detail: 'Officer detected outside assigned zone boundary',
      },
      officer.zone_id,
    );
  }

  if (outsideOfficers.length > 0) {
    console.log(`[anomaly] Detected ${outsideOfficers.length} officer(s) outside zone`);
  }
}

// ── Check 3: Incident volume spike (> 2x 28-day average for same hour) ────

async function checkIncidentVolumeSpike(): Promise<void> {
  const spikes = await prisma.$queryRaw<
    { zone_id: string; zone_name: string; current_count: number; avg_count: number }[]
  >`
    WITH current_hour AS (
      SELECT
        i.zone_id,
        z.name_en AS zone_name,
        COUNT(*) AS current_count
      FROM incidents i
      JOIN zones z ON z.id = i.zone_id
      WHERE i.created_at > NOW() - INTERVAL '1 hour'
        AND i.zone_id IS NOT NULL
      GROUP BY i.zone_id, z.name_en
    ),
    historical_avg AS (
      SELECT
        i.zone_id,
        COUNT(*)::float / 28.0 AS avg_count
      FROM incidents i
      WHERE i.created_at > NOW() - INTERVAL '28 days'
        AND i.created_at <= NOW() - INTERVAL '1 hour'
        AND EXTRACT(HOUR FROM i.created_at) = EXTRACT(HOUR FROM NOW())
        AND i.zone_id IS NOT NULL
      GROUP BY i.zone_id
    )
    SELECT ch.zone_id, ch.zone_name, ch.current_count::int, COALESCE(ha.avg_count, 0)::float AS avg_count
    FROM current_hour ch
    LEFT JOIN historical_avg ha ON ha.zone_id = ch.zone_id
    WHERE ch.current_count > GREATEST(COALESCE(ha.avg_count, 0) * 2, 1)
  `;

  for (const spike of spikes) {
    await generateAnomalyAlert(
      'spike',
      {
        zoneName: spike.zone_name,
        currentCount: spike.current_count,
        averageCount: Math.round(spike.avg_count * 10) / 10,
        multiplier: spike.avg_count > 0
          ? Math.round((spike.current_count / spike.avg_count) * 10) / 10
          : 'N/A (no history)',
      },
      spike.zone_id,
    );
  }

  if (spikes.length > 0) {
    console.log(`[anomaly] Detected ${spikes.length} zone(s) with incident volume spike`);
  }
}

// ── Check 4: Missed checkpoints (patrol > 60min, incomplete) ──────────────

async function checkMissedCheckpoints(): Promise<void> {
  const missedPatrols = await prisma.$queryRaw<
    {
      patrol_log_id: string;
      officer_id: string;
      officer_name: string;
      zone_id: string;
      confirmed_count: number;
      total_checkpoints: number;
    }[]
  >`
    SELECT
      pl.id AS patrol_log_id,
      pl.officer_id,
      o.name_en AS officer_name,
      s.zone_id,
      COALESCE(confirmed.cnt, 0)::int AS confirmed_count,
      route_cp.total::int AS total_checkpoints
    FROM patrol_logs pl
    JOIN officers o ON o.id = pl.officer_id
    JOIN shifts s ON s.id = pl.shift_id
    JOIN LATERAL (
      SELECT COUNT(*) AS total
      FROM patrol_route_checkpoints prc
      WHERE prc.route_id = pl.route_id
    ) route_cp ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS cnt
      FROM patrol_checkpoints pc
      WHERE pc.patrol_log_id = pl.id AND pc.confirmed = true
    ) confirmed ON true
    WHERE pl.started_at IS NOT NULL
      AND pl.completed_at IS NULL
      AND pl.started_at < NOW() - INTERVAL '60 minutes'
      AND COALESCE(confirmed.cnt, 0) < route_cp.total
  `;

  for (const patrol of missedPatrols) {
    await generateAnomalyAlert(
      'gap',
      {
        patrolLogId: patrol.patrol_log_id,
        officerName: patrol.officer_name,
        confirmedCheckpoints: patrol.confirmed_count,
        totalCheckpoints: patrol.total_checkpoints,
        detail: 'Patrol started over 60 minutes ago with incomplete checkpoints',
      },
      patrol.zone_id,
    );
  }

  if (missedPatrols.length > 0) {
    console.log(`[anomaly] Detected ${missedPatrols.length} patrol(s) with missed checkpoints`);
  }
}

// ─── Main Processor ─────────────────────────────────────────────────────────

async function processAnomalyCheck(_job: Job): Promise<void> {
  await Promise.allSettled([
    checkStationaryOfficers(),
    checkOfficersOutsideZone(),
    checkIncidentVolumeSpike(),
    checkMissedCheckpoints(),
  ]);
}

export const anomalyWorker = new Worker('anomaly-detection', processAnomalyCheck, {
  connection,
  concurrency: 1,
});

anomalyWorker.on('failed', (job, err) => {
  console.error(`[anomaly] Job ${job?.id} failed:`, err.message);
});
