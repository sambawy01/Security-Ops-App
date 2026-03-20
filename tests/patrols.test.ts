import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/server.js';
import { testPrisma, cleanTestData } from './setup.js';
import { createTestOfficer, getAuthToken } from './helpers.js';
import { insertZoneWithBoundary, insertCheckpointWithLocation } from '../src/lib/geo.js';
import { redis } from '../src/lib/redis.js';
import { FastifyInstance } from 'fastify';

let app: FastifyInstance;

// Test data IDs
const zoneId = randomUUID();
const checkpointAId = randomUUID();
const checkpointBId = randomUUID();

// Auth tokens
let supervisorToken: string;
let supervisorOfficerId: string;
let officerToken: string;
let officerOfficerId: string;

// Created IDs for chained tests
let createdRouteId: string;
let activeShiftId: string;
let patrolLogId: string;

beforeAll(async () => {
  app = buildApp();
  await app.ready();

  await cleanTestData();

  // Clean up any prior test data
  await testPrisma.$executeRawUnsafe(`DELETE FROM patrol_checkpoints WHERE patrol_log_id IN (SELECT id FROM patrol_logs WHERE officer_id IN (SELECT id FROM officers WHERE badge_number LIKE 'TEST-%'))`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM patrol_logs WHERE officer_id IN (SELECT id FROM officers WHERE badge_number LIKE 'TEST-%')`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM patrol_route_checkpoints WHERE route_id IN (SELECT id FROM patrol_routes WHERE zone_id = '${zoneId}')`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM patrol_routes WHERE zone_id = '${zoneId}'`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM checkpoints WHERE zone_id = '${zoneId}'`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM shifts WHERE zone_id = '${zoneId}'`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM zones WHERE id = '${zoneId}'`);

  // Create test zone
  await insertZoneWithBoundary(
    zoneId, 'منطقة دورية', 'Patrol Zone', '#0000ff',
    [[34.0, 28.0], [34.1, 28.0], [34.1, 28.1], [34.0, 28.1], [34.0, 28.0]],
  );

  // Create checkpoints with PostGIS locations
  await insertCheckpointWithLocation(checkpointAId, 'نقطة أ', 'Checkpoint A', zoneId, 'gate', 28.05, 34.05);
  await insertCheckpointWithLocation(checkpointBId, 'نقطة ب', 'Checkpoint B', zoneId, 'patrol', 28.06, 34.06);

  // Create supervisor for zone
  const { officer: supervisor, pin: supervisorPin } = await createTestOfficer({
    role: 'supervisor', zoneId,
  });
  supervisorOfficerId = supervisor.id;
  const supervisorAuth = await getAuthToken(app, supervisor.badgeNumber, supervisorPin);
  supervisorToken = supervisorAuth.accessToken;

  // Create officer in zone
  const { officer: officerA, pin: officerAPin } = await createTestOfficer({
    role: 'officer', zoneId,
  });
  officerOfficerId = officerA.id;
  const officerAAuth = await getAuthToken(app, officerA.badgeNumber, officerAPin);
  officerToken = officerAAuth.accessToken;

  // Create an active shift for the officer (for patrol log tests)
  const now = new Date();
  const start = new Date(now.getTime() - 30 * 60 * 1000);
  const end = new Date(now.getTime() + 8 * 60 * 60 * 1000);

  const shift = await testPrisma.shift.create({
    data: {
      officerId: officerOfficerId,
      zoneId,
      scheduledStart: start,
      scheduledEnd: end,
      status: 'active',
    },
  });
  activeShiftId = shift.id;
});

afterAll(async () => {
  await testPrisma.$executeRawUnsafe(`DELETE FROM patrol_checkpoints WHERE patrol_log_id IN (SELECT id FROM patrol_logs WHERE officer_id IN (SELECT id FROM officers WHERE badge_number LIKE 'TEST-%'))`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM patrol_logs WHERE officer_id IN (SELECT id FROM officers WHERE badge_number LIKE 'TEST-%')`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM patrol_route_checkpoints WHERE route_id IN (SELECT id FROM patrol_routes WHERE zone_id = '${zoneId}')`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM patrol_routes WHERE zone_id = '${zoneId}'`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM checkpoints WHERE zone_id = '${zoneId}'`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM shifts WHERE zone_id = '${zoneId}'`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM zones WHERE id = '${zoneId}'`);
  await cleanTestData();
  await testPrisma.$disconnect();
  await redis.quit();
  await app.close();
});

describe('Patrol Routes', () => {
  // 3. POST /api/v1/patrols/routes creates a patrol route with checkpoints (as supervisor)
  it('should create a patrol route with checkpoints as supervisor', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/patrols/routes',
      headers: { authorization: `Bearer ${supervisorToken}` },
      payload: {
        name: 'Morning Patrol Route',
        zoneId,
        estimatedDurationMin: 45,
        checkpoints: [
          { checkpointId: checkpointAId, sequenceOrder: 1, expectedDwellMin: 5 },
          { checkpointId: checkpointBId, sequenceOrder: 2, expectedDwellMin: 10 },
        ],
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data).toBeDefined();
    expect(body.data.name).toBe('Morning Patrol Route');
    expect(body.data.estimatedDurationMin).toBe(45);
    expect(body.data.checkpoints).toHaveLength(2);
    expect(body.data.checkpoints[0].sequenceOrder).toBe(1);
    expect(body.data.checkpoints[1].sequenceOrder).toBe(2);
    createdRouteId = body.data.id;
  });

  // 1. GET /api/v1/patrols/routes lists patrol routes for a zone (as supervisor)
  it('should list patrol routes for a zone as supervisor', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/patrols/routes?zoneId=${zoneId}`,
      headers: { authorization: `Bearer ${supervisorToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBeGreaterThan(0);
    for (const route of body.data) {
      expect(route.zoneId).toBe(zoneId);
      expect(route.checkpointCount).toBeDefined();
      expect(route.zone).toBeDefined();
    }
  });

  // 2. GET /api/v1/patrols/routes/:id returns route with ordered checkpoints
  it('should return route with ordered checkpoints', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/patrols/routes/${createdRouteId}`,
      headers: { authorization: `Bearer ${supervisorToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.id).toBe(createdRouteId);
    expect(body.data.name).toBe('Morning Patrol Route');
    expect(body.data.checkpoints).toHaveLength(2);

    // Verify ordering
    expect(body.data.checkpoints[0].sequenceOrder).toBe(1);
    expect(body.data.checkpoints[1].sequenceOrder).toBe(2);

    // Verify checkpoint detail fields
    const cp = body.data.checkpoints[0];
    expect(cp.nameAr).toBeDefined();
    expect(cp.nameEn).toBeDefined();
    expect(cp.type).toBeDefined();
    expect(cp.lat).toBeDefined();
    expect(cp.lng).toBeDefined();
  });

  // 4. POST /api/v1/patrols/logs starts a patrol log for an active shift (as officer)
  it('should start a patrol log for an active shift as officer', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/patrols/logs',
      headers: { authorization: `Bearer ${officerToken}` },
      payload: {
        routeId: createdRouteId,
        shiftId: activeShiftId,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data).toBeDefined();
    expect(body.data.routeId).toBe(createdRouteId);
    expect(body.data.shiftId).toBe(activeShiftId);
    expect(body.data.officerId).toBe(officerOfficerId);
    expect(body.data.startedAt).toBeDefined();
    patrolLogId = body.data.id;
  });

  // 5. POST /api/v1/patrols/logs/:id/checkpoints/:checkpointId confirms checkpoint arrival
  it('should confirm checkpoint arrival with GPS', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/patrols/logs/${patrolLogId}/checkpoints/${checkpointAId}`,
      headers: { authorization: `Bearer ${officerToken}` },
      payload: {
        confirmed: true,
        lat: 28.05,
        lng: 34.05,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.confirmed).toBe(true);
    expect(body.data.arrivedAt).toBeDefined();
    expect(body.data.lat).toBeCloseTo(28.05, 2);
    expect(body.data.lng).toBeCloseTo(34.05, 2);
  });

  // 6. POST /api/v1/patrols/logs/:id/checkpoints/:checkpointId skips with reason
  it('should skip checkpoint with reason', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/patrols/logs/${patrolLogId}/checkpoints/${checkpointBId}`,
      headers: { authorization: `Bearer ${officerToken}` },
      payload: {
        confirmed: false,
        skipReason: 'Area under construction',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.confirmed).toBe(false);
    expect(body.data.skipReason).toBe('Area under construction');
  });

  // 7. GET /api/v1/patrols/logs lists patrol logs for a shift
  it('should list patrol logs for a shift', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/patrols/logs?shiftId=${activeShiftId}`,
      headers: { authorization: `Bearer ${supervisorToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBeGreaterThan(0);
    for (const log of body.data) {
      expect(log.shiftId).toBe(activeShiftId);
      expect(log.officer).toBeDefined();
      expect(log.route).toBeDefined();
      expect(log.checkpointCount).toBeDefined();
    }
  });
});
