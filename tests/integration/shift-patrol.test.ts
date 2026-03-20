import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/server.js';
import { testPrisma, cleanTestData } from '../setup.js';
import { createTestOfficer, getAuthToken } from '../helpers.js';
import { insertZoneWithBoundary, insertCheckpointWithLocation } from '../../src/lib/geo.js';
import { redis } from '../../src/lib/redis.js';
import { FastifyInstance } from 'fastify';

let app: FastifyInstance;

// Test data IDs
const zoneId = randomUUID();
const checkpointAId = randomUUID();
const checkpointBId = randomUUID();
const checkpointCId = randomUUID();

// Tokens
let hrAdminToken: string;
let officerToken: string;
let officerOfficerId: string;
let officerBadge: string;
let officerPinStr: string;

// Created IDs
let shiftId: string;
let routeId: string;
let patrolLogId: string;

beforeAll(async () => {
  app = buildApp();
  await app.ready();

  await cleanTestData();

  // Clean previous test data
  await testPrisma.$executeRawUnsafe(`DELETE FROM patrol_checkpoints WHERE patrol_log_id IN (SELECT id FROM patrol_logs WHERE officer_id IN (SELECT id FROM officers WHERE badge_number LIKE 'TEST-%'))`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM patrol_logs WHERE officer_id IN (SELECT id FROM officers WHERE badge_number LIKE 'TEST-%')`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM patrol_route_checkpoints WHERE route_id IN (SELECT id FROM patrol_routes WHERE zone_id = '${zoneId}')`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM patrol_routes WHERE zone_id = '${zoneId}'`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM checkpoints WHERE zone_id = '${zoneId}'`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM shifts WHERE zone_id = '${zoneId}'`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM zones WHERE id = '${zoneId}'`);

  // Create zone
  await insertZoneWithBoundary(
    zoneId, 'منطقة وردية', 'Shift Patrol Zone', '#00ffff',
    [[36.0, 30.0], [36.1, 30.0], [36.1, 30.1], [36.0, 30.1], [36.0, 30.0]],
  );

  // Create 3 checkpoints
  await insertCheckpointWithLocation(checkpointAId, 'نقطة أ', 'CP Alpha', zoneId, 'gate', 30.05, 36.05);
  await insertCheckpointWithLocation(checkpointBId, 'نقطة ب', 'CP Beta', zoneId, 'patrol', 30.06, 36.06);
  await insertCheckpointWithLocation(checkpointCId, 'نقطة ج', 'CP Gamma', zoneId, 'fixed', 30.07, 36.07);

  // Create hr_admin
  const hr = await createTestOfficer({ role: 'hr_admin', zoneId: null });
  const hrAuth = await getAuthToken(app, hr.officer.badgeNumber, hr.pin);
  hrAdminToken = hrAuth.accessToken;

  // Create officer
  const off = await createTestOfficer({ role: 'officer', zoneId });
  officerOfficerId = off.officer.id;
  officerBadge = off.officer.badgeNumber;
  officerPinStr = off.pin;

  // Create supervisor (to create patrol route)
  const sup = await createTestOfficer({ role: 'supervisor', zoneId });
  const supAuth = await getAuthToken(app, sup.officer.badgeNumber, sup.pin);

  // Create patrol route with 3 checkpoints
  const routeRes = await app.inject({
    method: 'POST',
    url: '/api/v1/patrols/routes',
    headers: { authorization: `Bearer ${supAuth.accessToken}` },
    payload: {
      name: 'Integration Patrol Route',
      zoneId,
      estimatedDurationMin: 30,
      checkpoints: [
        { checkpointId: checkpointAId, sequenceOrder: 1, expectedDwellMin: 5 },
        { checkpointId: checkpointBId, sequenceOrder: 2, expectedDwellMin: 5 },
        { checkpointId: checkpointCId, sequenceOrder: 3, expectedDwellMin: 5 },
      ],
    },
  });
  routeId = JSON.parse(routeRes.body).data.id;
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

describe('Integration: Shift + Patrol Workflow', () => {
  // Step 1: hr_admin creates a shift for the officer
  it('Step 1: hr_admin creates shift for officer', async () => {
    const now = new Date();
    const start = new Date(now.getTime() - 30 * 60 * 1000); // started 30min ago
    const end = new Date(now.getTime() + 8 * 60 * 60 * 1000);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/shifts',
      headers: { authorization: `Bearer ${hrAdminToken}` },
      payload: {
        officerId: officerOfficerId,
        zoneId,
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.status).toBe('scheduled');
    expect(body.data.officerId).toBe(officerOfficerId);
    shiftId = body.data.id;
  });

  // Step 2: Officer logs in and checks in to shift
  it('Step 2: officer checks in to shift', async () => {
    const auth = await getAuthToken(app, officerBadge, officerPinStr);
    expect(auth.statusCode).toBe(200);
    officerToken = auth.accessToken;

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/shifts/${shiftId}/check-in`,
      headers: { authorization: `Bearer ${officerToken}` },
      payload: { lat: 30.05, lng: 36.05 },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.status).toBe('active');
    expect(body.data.actualCheckIn).toBeDefined();
  });

  // Step 3: Verify officer status changed to active
  it('Step 3: officer status is now active', async () => {
    const officer = await testPrisma.officer.findUnique({ where: { id: officerOfficerId } });
    expect(officer!.status).toBe('active');
  });

  // Step 4: Start a patrol
  it('Step 4: officer starts a patrol', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/patrols/logs',
      headers: { authorization: `Bearer ${officerToken}` },
      payload: { routeId, shiftId },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.routeId).toBe(routeId);
    expect(body.data.shiftId).toBe(shiftId);
    expect(body.data.officerId).toBe(officerOfficerId);
    patrolLogId = body.data.id;
  });

  // Step 5: Confirm 2 checkpoints
  it('Step 5: officer confirms checkpoint Alpha', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/patrols/logs/${patrolLogId}/checkpoints/${checkpointAId}`,
      headers: { authorization: `Bearer ${officerToken}` },
      payload: { confirmed: true, lat: 30.05, lng: 36.05 },
    });

    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).data.confirmed).toBe(true);
  });

  it('Step 5b: officer confirms checkpoint Beta', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/patrols/logs/${patrolLogId}/checkpoints/${checkpointBId}`,
      headers: { authorization: `Bearer ${officerToken}` },
      payload: { confirmed: true, lat: 30.06, lng: 36.06 },
    });

    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).data.confirmed).toBe(true);
  });

  // Step 6: Skip 1 checkpoint with reason
  it('Step 6: officer skips checkpoint Gamma with reason', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/patrols/logs/${patrolLogId}/checkpoints/${checkpointCId}`,
      headers: { authorization: `Bearer ${officerToken}` },
      payload: { confirmed: false, skipReason: 'Flooded area, unsafe access' },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.confirmed).toBe(false);
    expect(body.data.skipReason).toBe('Flooded area, unsafe access');
  });

  // Step 7: Check out of shift
  it('Step 7: officer checks out of shift', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/shifts/${shiftId}/check-out`,
      headers: { authorization: `Bearer ${officerToken}` },
      payload: { lat: 30.05, lng: 36.05, handoverNotes: 'Patrol complete, area Gamma inaccessible.' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.status).toBe('completed');
    expect(body.data.actualCheckOut).toBeDefined();
    expect(body.data.handoverNotes).toBe('Patrol complete, area Gamma inaccessible.');
  });

  // Step 8: Verify officer status changed to off_duty
  it('Step 8: officer status is now off_duty', async () => {
    const officer = await testPrisma.officer.findUnique({ where: { id: officerOfficerId } });
    expect(officer!.status).toBe('off_duty');
  });
});
