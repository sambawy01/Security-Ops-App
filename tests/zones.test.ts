import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/server.js';
import { testPrisma, cleanTestData } from './setup.js';
import { createTestOfficer, getAuthToken } from './helpers.js';
import { insertCheckpointWithLocation, insertZoneWithBoundary } from '../src/lib/geo.js';
import { redis } from '../src/lib/redis.js';
import { FastifyInstance } from 'fastify';

let app: FastifyInstance;

// Test data IDs
const zoneAId = randomUUID();
const zoneBId = randomUUID();
const checkpoint1Id = randomUUID();
const checkpoint2Id = randomUUID();
const checkpoint3Id = randomUUID();

// Auth tokens
let managerToken: string;
let supervisorToken: string;
let supervisorZoneBToken: string;

beforeAll(async () => {
  app = buildApp();
  await app.ready();

  // Clean up any previous test data
  await cleanTestData();

  // Clean up test zones and checkpoints from previous runs
  await testPrisma.$executeRawUnsafe(`DELETE FROM checkpoints WHERE zone_id IN ('${zoneAId}', '${zoneBId}')`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM zones WHERE id IN ('${zoneAId}', '${zoneBId}')`);

  // Create test zones using geo helper
  await insertZoneWithBoundary(
    zoneAId,
    'المنطقة أ',
    'Zone A',
    '#ff0000',
    [[33.0, 27.0], [33.1, 27.0], [33.1, 27.1], [33.0, 27.1], [33.0, 27.0]],
  );

  await insertZoneWithBoundary(
    zoneBId,
    'المنطقة ب',
    'Zone B',
    '#00ff00',
    [[33.2, 27.2], [33.3, 27.2], [33.3, 27.3], [33.2, 27.3], [33.2, 27.2]],
  );

  // Create checkpoints using geo helper
  await insertCheckpointWithLocation(checkpoint1Id, 'نقطة 1', 'Checkpoint 1', zoneAId, 'gate', 27.05, 33.05);
  await insertCheckpointWithLocation(checkpoint2Id, 'نقطة 2', 'Checkpoint 2', zoneAId, 'patrol', 27.06, 33.06);
  await insertCheckpointWithLocation(checkpoint3Id, 'نقطة 3', 'Checkpoint 3', zoneBId, 'fixed', 27.25, 33.25);

  // Create a manager officer
  const { officer: manager, pin: managerPin } = await createTestOfficer({
    role: 'manager',
    zoneId: null,
  });
  const managerAuth = await getAuthToken(app, manager.badgeNumber, managerPin);
  managerToken = managerAuth.accessToken;

  // Create a supervisor assigned to Zone A
  const { officer: supervisor, pin: supervisorPin } = await createTestOfficer({
    role: 'supervisor',
    zoneId: zoneAId,
  });
  const supervisorAuth = await getAuthToken(app, supervisor.badgeNumber, supervisorPin);
  supervisorToken = supervisorAuth.accessToken;

  // Create a supervisor assigned to Zone B
  const { officer: supervisorB, pin: supervisorBPin } = await createTestOfficer({
    role: 'supervisor',
    zoneId: zoneBId,
  });
  const supervisorBAuth = await getAuthToken(app, supervisorB.badgeNumber, supervisorBPin);
  supervisorZoneBToken = supervisorBAuth.accessToken;
});

afterAll(async () => {
  // Clean up test data in correct order (checkpoints before zones)
  await testPrisma.$executeRawUnsafe(`DELETE FROM checkpoints WHERE zone_id IN ('${zoneAId}', '${zoneBId}')`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM zones WHERE id IN ('${zoneAId}', '${zoneBId}')`);
  await cleanTestData();
  await testPrisma.$disconnect();
  await redis.quit();
  await app.close();
});

describe('Zone & Checkpoint Routes', () => {
  // 1. GET /api/v1/zones returns all zones with checkpoint counts (as manager)
  it('should return all zones with checkpoint counts as manager', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/zones',
      headers: { authorization: `Bearer ${managerToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toBeDefined();
    expect(body.data.length).toBeGreaterThanOrEqual(2);

    // Find our test zones
    const zoneA = body.data.find((z: any) => z.id === zoneAId);
    const zoneB = body.data.find((z: any) => z.id === zoneBId);

    expect(zoneA).toBeDefined();
    expect(zoneA.nameEn).toBe('Zone A');
    expect(zoneA.nameAr).toBe('المنطقة أ');
    expect(zoneA.color).toBe('#ff0000');
    expect(zoneA._count.checkpoints).toBe(2);

    expect(zoneB).toBeDefined();
    expect(zoneB._count.checkpoints).toBe(1);
  });

  // 2. GET /api/v1/zones returns only assigned zone (as supervisor)
  it('should return only assigned zone for supervisor', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/zones',
      headers: { authorization: `Bearer ${supervisorToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toBeDefined();
    expect(body.data.length).toBe(1);
    expect(body.data[0].id).toBe(zoneAId);
  });

  // 3. GET /api/v1/zones/:id returns zone detail with checkpoints list
  it('should return zone detail with checkpoints list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/zones/${zoneAId}`,
      headers: { authorization: `Bearer ${managerToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toBeDefined();
    expect(body.data.id).toBe(zoneAId);
    expect(body.data.nameEn).toBe('Zone A');
    expect(body.data.stats).toBeDefined();
    expect(body.data.stats.officerCount).toBeGreaterThanOrEqual(0);
    expect(body.data.stats.incidentCount).toBeGreaterThanOrEqual(0);
    expect(body.data.checkpoints).toBeDefined();
    expect(body.data.checkpoints.length).toBe(2);

    // Check checkpoint structure includes lat/lng
    const cp = body.data.checkpoints[0];
    expect(cp.lat).toBeDefined();
    expect(cp.lng).toBeDefined();
    expect(cp.nameEn).toBeDefined();
    expect(cp.nameAr).toBeDefined();
    expect(cp.type).toBeDefined();
    expect(cp.status).toBeDefined();
  });

  // 4. GET /api/v1/zones/:id returns 403 for supervisor accessing different zone
  it('should return 403 for supervisor accessing a different zone', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/zones/${zoneBId}`,
      headers: { authorization: `Bearer ${supervisorToken}` },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error).toContain('Access denied');
  });

  // 5. GET /api/v1/zones/:id/checkpoints returns checkpoints with lat/lng
  it('should return checkpoints with lat/lng', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/zones/${zoneAId}/checkpoints`,
      headers: { authorization: `Bearer ${managerToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toBeDefined();
    expect(body.data.length).toBe(2);

    const cp1 = body.data.find((c: any) => c.id === checkpoint1Id);
    expect(cp1).toBeDefined();
    expect(cp1.nameEn).toBe('Checkpoint 1');
    expect(cp1.lat).toBeCloseTo(27.05, 2);
    expect(cp1.lng).toBeCloseTo(33.05, 2);

    const cp2 = body.data.find((c: any) => c.id === checkpoint2Id);
    expect(cp2).toBeDefined();
    expect(cp2.nameEn).toBe('Checkpoint 2');
    expect(cp2.lat).toBeCloseTo(27.06, 2);
    expect(cp2.lng).toBeCloseTo(33.06, 2);
  });

  // 6. Unauthenticated request returns 401
  it('should return 401 for unauthenticated request', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/zones',
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('Missing token');
  });
});
