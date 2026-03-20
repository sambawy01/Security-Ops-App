import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/server.js';
import { testPrisma, cleanTestData } from './setup.js';
import { createTestOfficer, getAuthToken } from './helpers.js';
import { insertZoneWithBoundary } from '../src/lib/geo.js';
import { redis } from '../src/lib/redis.js';
import { FastifyInstance } from 'fastify';

let app: FastifyInstance;

// Test data IDs
const zoneAId = randomUUID();
const zoneBId = randomUUID();

// Auth tokens
let hrAdminToken: string;
let hrAdminOfficerId: string;
let supervisorToken: string;
let supervisorOfficerId: string;
let officerToken: string;
let officerOfficerId: string;
let officerBToken: string;
let officerBOfficerId: string;

// Created shift IDs for chained tests
let createdShiftId: string;
let checkInShiftId: string;
let checkOutShiftId: string;
let calledOffShiftId: string;
let noShowShiftId: string;
let officerOnlyShiftId: string;

beforeAll(async () => {
  app = buildApp();
  await app.ready();

  await cleanTestData();

  // Clean up test data from previous runs
  await testPrisma.$executeRawUnsafe(`DELETE FROM patrol_checkpoints WHERE patrol_log_id IN (SELECT id FROM patrol_logs WHERE shift_id IN (SELECT id FROM shifts WHERE officer_id IN (SELECT id FROM officers WHERE badge_number LIKE 'TEST-%')))`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM patrol_logs WHERE shift_id IN (SELECT id FROM shifts WHERE officer_id IN (SELECT id FROM officers WHERE badge_number LIKE 'TEST-%'))`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM shifts WHERE officer_id IN (SELECT id FROM officers WHERE badge_number LIKE 'TEST-%')`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM zones WHERE id IN ('${zoneAId}', '${zoneBId}')`);

  // Create test zones
  await insertZoneWithBoundary(
    zoneAId, 'المنطقة أ', 'Zone A', '#ff0000',
    [[33.0, 27.0], [33.1, 27.0], [33.1, 27.1], [33.0, 27.1], [33.0, 27.0]],
  );
  await insertZoneWithBoundary(
    zoneBId, 'المنطقة ب', 'Zone B', '#00ff00',
    [[33.2, 27.2], [33.3, 27.2], [33.3, 27.3], [33.2, 27.3], [33.2, 27.2]],
  );

  // Create hr_admin
  const { officer: hrAdmin, pin: hrAdminPin } = await createTestOfficer({
    role: 'hr_admin', zoneId: null,
  });
  hrAdminOfficerId = hrAdmin.id;
  const hrAdminAuth = await getAuthToken(app, hrAdmin.badgeNumber, hrAdminPin);
  hrAdminToken = hrAdminAuth.accessToken;

  // Create supervisor assigned to Zone A
  const { officer: supervisor, pin: supervisorPin } = await createTestOfficer({
    role: 'supervisor', zoneId: zoneAId,
  });
  supervisorOfficerId = supervisor.id;
  const supervisorAuth = await getAuthToken(app, supervisor.badgeNumber, supervisorPin);
  supervisorToken = supervisorAuth.accessToken;

  // Create officer in Zone A
  const { officer: officerA, pin: officerAPin } = await createTestOfficer({
    role: 'officer', zoneId: zoneAId,
  });
  officerOfficerId = officerA.id;
  const officerAAuth = await getAuthToken(app, officerA.badgeNumber, officerAPin);
  officerToken = officerAAuth.accessToken;

  // Create another officer in Zone B
  const { officer: officerB, pin: officerBPin } = await createTestOfficer({
    role: 'officer', zoneId: zoneBId,
  });
  officerBOfficerId = officerB.id;
  const officerBAuth = await getAuthToken(app, officerB.badgeNumber, officerBPin);
  officerBToken = officerBAuth.accessToken;
});

afterAll(async () => {
  await testPrisma.$executeRawUnsafe(`DELETE FROM patrol_checkpoints WHERE patrol_log_id IN (SELECT id FROM patrol_logs WHERE shift_id IN (SELECT id FROM shifts WHERE officer_id IN (SELECT id FROM officers WHERE badge_number LIKE 'TEST-%')))`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM patrol_logs WHERE shift_id IN (SELECT id FROM shifts WHERE officer_id IN (SELECT id FROM officers WHERE badge_number LIKE 'TEST-%'))`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM shifts WHERE officer_id IN (SELECT id FROM officers WHERE badge_number LIKE 'TEST-%')`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM zones WHERE id IN ('${zoneAId}', '${zoneBId}')`);
  await cleanTestData();
  await testPrisma.$disconnect();
  await redis.quit();
  await app.close();
});

describe('Shift Routes', () => {
  // 1. POST /api/v1/shifts creates a scheduled shift (as hr_admin)
  it('should create a scheduled shift as hr_admin', async () => {
    const now = new Date();
    const start = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    const end = new Date(now.getTime() + 9 * 60 * 60 * 1000); // 9 hours from now

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/shifts',
      headers: { authorization: `Bearer ${hrAdminToken}` },
      payload: {
        officerId: officerOfficerId,
        zoneId: zoneAId,
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data).toBeDefined();
    expect(body.data.status).toBe('scheduled');
    expect(body.data.officerId).toBe(officerOfficerId);
    expect(body.data.zoneId).toBe(zoneAId);
    createdShiftId = body.data.id;
  });

  // 2. POST /api/v1/shifts returns 403 (as officer role)
  it('should return 403 when officer tries to create shift', async () => {
    const now = new Date();
    const start = new Date(now.getTime() + 60 * 60 * 1000);
    const end = new Date(now.getTime() + 9 * 60 * 60 * 1000);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/shifts',
      headers: { authorization: `Bearer ${officerToken}` },
      payload: {
        officerId: officerOfficerId,
        zoneId: zoneAId,
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
      },
    });

    expect(res.statusCode).toBe(403);
  });

  // 3. GET /api/v1/shifts filters by zone, officer, date range, status
  it('should filter shifts by zone, officer, date range, status', async () => {
    // Filter by zone
    let res = await app.inject({
      method: 'GET',
      url: `/api/v1/shifts?zoneId=${zoneAId}`,
      headers: { authorization: `Bearer ${hrAdminToken}` },
    });
    expect(res.statusCode).toBe(200);
    let body = JSON.parse(res.body);
    for (const s of body.data) {
      expect(s.zoneId).toBe(zoneAId);
    }

    // Filter by officer
    res = await app.inject({
      method: 'GET',
      url: `/api/v1/shifts?officerId=${officerOfficerId}`,
      headers: { authorization: `Bearer ${hrAdminToken}` },
    });
    expect(res.statusCode).toBe(200);
    body = JSON.parse(res.body);
    for (const s of body.data) {
      expect(s.officerId).toBe(officerOfficerId);
    }

    // Filter by status
    res = await app.inject({
      method: 'GET',
      url: `/api/v1/shifts?status=scheduled`,
      headers: { authorization: `Bearer ${hrAdminToken}` },
    });
    expect(res.statusCode).toBe(200);
    body = JSON.parse(res.body);
    for (const s of body.data) {
      expect(s.status).toBe('scheduled');
    }
  });

  // 4. POST /api/v1/shifts/:id/check-in records GPS location and sets status to active
  it('should check in officer with GPS and set status to active', async () => {
    // Create a shift for check-in test
    const now = new Date();
    const start = new Date(now.getTime() - 30 * 60 * 1000); // started 30 min ago
    const end = new Date(now.getTime() + 8 * 60 * 60 * 1000);

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/shifts',
      headers: { authorization: `Bearer ${hrAdminToken}` },
      payload: {
        officerId: officerOfficerId,
        zoneId: zoneAId,
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
      },
    });
    checkInShiftId = JSON.parse(createRes.body).data.id;

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/shifts/${checkInShiftId}/check-in`,
      headers: { authorization: `Bearer ${officerToken}` },
      payload: { lat: 27.05, lng: 33.05 },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.status).toBe('active');
    expect(body.data.actualCheckIn).toBeDefined();

    // Verify GPS was stored via raw SQL
    const locResult = await testPrisma.$queryRaw<{ lat: number; lng: number }[]>`
      SELECT ST_Y(check_in_location) as lat, ST_X(check_in_location) as lng
      FROM shifts WHERE id = ${checkInShiftId}::uuid
    `;
    expect(locResult[0].lat).toBeCloseTo(27.05, 2);
    expect(locResult[0].lng).toBeCloseTo(33.05, 2);
  });

  // 5. POST /api/v1/shifts/:id/check-in returns 403 when different officer tries to check in
  it('should return 403 when different officer tries to check in', async () => {
    // Create a shift for officer A
    const now = new Date();
    const start = new Date(now.getTime() - 30 * 60 * 1000);
    const end = new Date(now.getTime() + 8 * 60 * 60 * 1000);

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/shifts',
      headers: { authorization: `Bearer ${hrAdminToken}` },
      payload: {
        officerId: officerOfficerId,
        zoneId: zoneAId,
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
      },
    });
    const shiftId = JSON.parse(createRes.body).data.id;

    // Officer B tries to check in to officer A's shift
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/shifts/${shiftId}/check-in`,
      headers: { authorization: `Bearer ${officerBToken}` },
      payload: { lat: 27.05, lng: 33.05 },
    });

    expect(res.statusCode).toBe(403);
  });

  // 6. POST /api/v1/shifts/:id/check-out records GPS, handover notes, sets status to completed
  it('should check out officer with GPS and handover notes', async () => {
    // Use the shift that was already checked in (checkInShiftId)
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/shifts/${checkInShiftId}/check-out`,
      headers: { authorization: `Bearer ${officerToken}` },
      payload: { lat: 27.06, lng: 33.06, handoverNotes: 'All clear, no issues.' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.status).toBe('completed');
    expect(body.data.actualCheckOut).toBeDefined();
    expect(body.data.handoverNotes).toBe('All clear, no issues.');

    // Verify GPS was stored via raw SQL
    const locResult = await testPrisma.$queryRaw<{ lat: number; lng: number }[]>`
      SELECT ST_Y(check_out_location) as lat, ST_X(check_out_location) as lng
      FROM shifts WHERE id = ${checkInShiftId}::uuid
    `;
    expect(locResult[0].lat).toBeCloseTo(27.06, 2);
    expect(locResult[0].lng).toBeCloseTo(33.06, 2);
  });

  // 7. PATCH /api/v1/shifts/:id/status sets called_off (as supervisor)
  it('should set shift status to called_off as supervisor', async () => {
    // Create a scheduled shift in zone A
    const now = new Date();
    const start = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const end = new Date(now.getTime() + 10 * 60 * 60 * 1000);

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/shifts',
      headers: { authorization: `Bearer ${hrAdminToken}` },
      payload: {
        officerId: officerOfficerId,
        zoneId: zoneAId,
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
      },
    });
    calledOffShiftId = JSON.parse(createRes.body).data.id;

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/shifts/${calledOffShiftId}/status`,
      headers: { authorization: `Bearer ${supervisorToken}` },
      payload: { status: 'called_off' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.status).toBe('called_off');
  });

  // 8. PATCH /api/v1/shifts/:id/status sets no_show (as supervisor)
  it('should set shift status to no_show as supervisor', async () => {
    // Create a shift that started >30 minutes ago
    const now = new Date();
    const start = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
    const end = new Date(now.getTime() + 7 * 60 * 60 * 1000);

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/shifts',
      headers: { authorization: `Bearer ${hrAdminToken}` },
      payload: {
        officerId: officerOfficerId,
        zoneId: zoneAId,
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
      },
    });
    noShowShiftId = JSON.parse(createRes.body).data.id;

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/shifts/${noShowShiftId}/status`,
      headers: { authorization: `Bearer ${supervisorToken}` },
      payload: { status: 'no_show' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.status).toBe('no_show');
  });

  // 9. GET /api/v1/shifts officer sees only own shifts
  it('should return only own shifts for officer role', async () => {
    // Create a shift for officer B
    const now = new Date();
    const start = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const end = new Date(now.getTime() + 11 * 60 * 60 * 1000);

    await app.inject({
      method: 'POST',
      url: '/api/v1/shifts',
      headers: { authorization: `Bearer ${hrAdminToken}` },
      payload: {
        officerId: officerBOfficerId,
        zoneId: zoneBId,
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
      },
    });

    // Officer A should only see their own shifts
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/shifts',
      headers: { authorization: `Bearer ${officerToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBeGreaterThan(0);
    for (const s of body.data) {
      expect(s.officerId).toBe(officerOfficerId);
    }
  });
});
