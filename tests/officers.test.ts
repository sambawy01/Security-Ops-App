import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/server.js';
import { testPrisma, cleanTestData } from './setup.js';
import { createTestOfficer, getAuthToken } from './helpers.js';
import { insertZoneWithBoundary, insertOfficerLocation } from '../src/lib/geo.js';
import { redis } from '../src/lib/redis.js';
import { FastifyInstance } from 'fastify';

let app: FastifyInstance;

// Test data IDs
const zoneAId = randomUUID();
const zoneBId = randomUUID();

// Auth tokens
let managerToken: string;
let supervisorToken: string;
let supervisorOfficerId: string;
let hrAdminToken: string;
let officerToken: string;
let officerOfficerId: string;

beforeAll(async () => {
  app = buildApp();
  await app.ready();

  await cleanTestData();

  // Clean up test zones from previous runs
  await testPrisma.$executeRawUnsafe(`DELETE FROM officer_locations WHERE officer_id IN (SELECT id FROM officers WHERE badge_number LIKE 'TEST-%')`);
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

  // Create manager
  const { officer: manager, pin: managerPin } = await createTestOfficer({
    role: 'manager', zoneId: null,
  });
  const managerAuth = await getAuthToken(app, manager.badgeNumber, managerPin);
  managerToken = managerAuth.accessToken;

  // Create supervisor assigned to Zone A
  const { officer: supervisor, pin: supervisorPin } = await createTestOfficer({
    role: 'supervisor', zoneId: zoneAId,
  });
  supervisorOfficerId = supervisor.id;
  const supervisorAuth = await getAuthToken(app, supervisor.badgeNumber, supervisorPin);
  supervisorToken = supervisorAuth.accessToken;

  // Create hr_admin
  const { officer: hrAdmin, pin: hrAdminPin } = await createTestOfficer({
    role: 'hr_admin', zoneId: null,
  });
  const hrAdminAuth = await getAuthToken(app, hrAdmin.badgeNumber, hrAdminPin);
  hrAdminToken = hrAdminAuth.accessToken;

  // Create regular officer in Zone A
  const { officer: regularOfficer, pin: officerPin } = await createTestOfficer({
    role: 'officer', zoneId: zoneAId,
  });
  officerOfficerId = regularOfficer.id;
  const officerAuth = await getAuthToken(app, regularOfficer.badgeNumber, officerPin);
  officerToken = officerAuth.accessToken;
});

afterAll(async () => {
  await testPrisma.$executeRawUnsafe(`DELETE FROM officer_locations WHERE officer_id IN (SELECT id FROM officers WHERE badge_number LIKE 'TEST-%')`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM zones WHERE id IN ('${zoneAId}', '${zoneBId}')`);
  await cleanTestData();
  await testPrisma.$disconnect();
  await redis.quit();
  await app.close();
});

describe('Officer Routes', () => {
  // 1. GET /api/v1/officers returns all officers (as manager)
  it('should return all officers as manager', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/officers',
      headers: { authorization: `Bearer ${managerToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toBeDefined();
    expect(body.data.length).toBeGreaterThanOrEqual(3);

    // Check structure
    const officer = body.data[0];
    expect(officer.id).toBeDefined();
    expect(officer.nameEn).toBeDefined();
    expect(officer.badgeNumber).toBeDefined();
    expect(officer.role).toBeDefined();
    expect(officer.status).toBeDefined();
    // Should NOT include pinHash
    expect(officer.pinHash).toBeUndefined();
  });

  // 2. GET /api/v1/officers returns zone-scoped officers (as supervisor)
  it('should return zone-scoped officers as supervisor', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/officers',
      headers: { authorization: `Bearer ${supervisorToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toBeDefined();
    // All returned officers should be in Zone A
    for (const officer of body.data) {
      expect(officer.zoneId).toBe(zoneAId);
    }
  });

  // 3. POST /api/v1/officers creates officer (as hr_admin)
  it('should create officer as hr_admin without pinHash in response', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/officers',
      headers: { authorization: `Bearer ${hrAdminToken}` },
      payload: {
        nameAr: 'ضابط جديد',
        nameEn: 'New Officer',
        badgeNumber: `TEST-CREATE-${Date.now()}`,
        rank: 'corporal',
        role: 'officer',
        zoneId: zoneAId,
        phone: '+201234567890',
        pin: '5678',
        skills: ['driving', 'first_aid'],
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data).toBeDefined();
    expect(body.data.nameEn).toBe('New Officer');
    expect(body.data.nameAr).toBe('ضابط جديد');
    expect(body.data.rank).toBe('corporal');
    expect(body.data.role).toBe('officer');
    expect(body.data.zoneId).toBe(zoneAId);
    expect(body.data.skills).toEqual(['driving', 'first_aid']);
    // pinHash must NOT be in the response
    expect(body.data.pinHash).toBeUndefined();
    expect(body.data.pin).toBeUndefined();
  });

  // 4. POST /api/v1/officers returns 403 (as officer role)
  it('should return 403 when officer tries to create officer', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/officers',
      headers: { authorization: `Bearer ${officerToken}` },
      payload: {
        nameAr: 'لا يسمح',
        nameEn: 'Not Allowed',
        badgeNumber: `TEST-NOPE-${Date.now()}`,
        rank: '',
        role: 'officer',
        pin: '1234',
      },
    });

    expect(res.statusCode).toBe(403);
  });

  // 5. PATCH /api/v1/officers/:id updates officer name and zone
  it('should update officer name and zone', async () => {
    // Create an officer to update
    const { officer: toUpdate } = await createTestOfficer({
      role: 'officer', zoneId: zoneAId, nameEn: 'Before Update',
    });

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/officers/${toUpdate.id}`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        nameEn: 'After Update',
        zoneId: zoneBId,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.nameEn).toBe('After Update');
    expect(body.data.zoneId).toBe(zoneBId);
  });

  // 6. POST /api/v1/officers/:id/location records GPS location
  it('should record GPS location for own officer', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/officers/${officerOfficerId}/location`,
      headers: { authorization: `Bearer ${officerToken}` },
      payload: { lat: 27.05, lng: 33.05, accuracy: 10 },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
  });

  // 7. POST /api/v1/officers/:id/location returns 403 for another officer's location
  it('should return 403 when officer updates another officers location', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/officers/${supervisorOfficerId}/location`,
      headers: { authorization: `Bearer ${officerToken}` },
      payload: { lat: 27.05, lng: 33.05 },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error).toContain('own location');
  });

  // 8. PATCH /api/v1/officers/:id/status changes status (as supervisor)
  it('should change officer status to device_offline as supervisor', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/officers/${officerOfficerId}/status`,
      headers: { authorization: `Bearer ${supervisorToken}` },
      payload: { status: 'device_offline' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.status).toBe('device_offline');
  });

  // 9. GET /api/v1/officers/:id/locations returns location history
  it('should return location history with lat/lng', async () => {
    // Insert a couple more locations for this officer
    await insertOfficerLocation(officerOfficerId, 27.06, 33.06, 5);
    await insertOfficerLocation(officerOfficerId, 27.07, 33.07, 8);

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/officers/${officerOfficerId}/locations`,
      headers: { authorization: `Bearer ${managerToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toBeDefined();
    expect(body.data.length).toBeGreaterThanOrEqual(2);

    // Check structure
    const loc = body.data[0];
    expect(loc.lat).toBeDefined();
    expect(loc.lng).toBeDefined();
    expect(loc.timestamp).toBeDefined();
    expect(typeof loc.lat).toBe('number');
    expect(typeof loc.lng).toBe('number');
  });
});
