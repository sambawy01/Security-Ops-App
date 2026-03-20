import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/server.js';
import { testPrisma, cleanTestData } from '../setup.js';
import { createTestOfficer, getAuthToken } from '../helpers.js';
import { insertZoneWithBoundary } from '../../src/lib/geo.js';
import { redis } from '../../src/lib/redis.js';
import { FastifyInstance } from 'fastify';

let app: FastifyInstance;

// Zones
const zoneAId = randomUUID();
const zoneBId = randomUUID();

// Tokens and IDs
let officerToken: string;
let officerOfficerId: string;
let officerBToken: string;
let officerBOfficerId: string;
let secretaryToken: string;
let supervisorToken: string;
let supervisorOfficerId: string;
let managerToken: string;
let operatorToken: string;

// Incident IDs
let incidentInZoneA: string;
let incidentInZoneB: string;

beforeAll(async () => {
  app = buildApp();
  await app.ready();

  await cleanTestData();

  // Clean up
  await testPrisma.$executeRawUnsafe(`DELETE FROM incident_updates WHERE incident_id IN (SELECT id FROM incidents WHERE title LIKE 'RBAC-%')`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM incidents WHERE title LIKE 'RBAC-%'`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM shifts WHERE zone_id IN ('${zoneAId}', '${zoneBId}')`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM zones WHERE id IN ('${zoneAId}', '${zoneBId}')`);

  // Create zones
  await insertZoneWithBoundary(
    zoneAId, 'RBAC Zone A', 'RBAC Zone A', '#aa0000',
    [[37.0, 31.0], [37.1, 31.0], [37.1, 31.1], [37.0, 31.1], [37.0, 31.0]],
  );
  await insertZoneWithBoundary(
    zoneBId, 'RBAC Zone B', 'RBAC Zone B', '#00aa00',
    [[37.2, 31.2], [37.3, 31.2], [37.3, 31.3], [37.2, 31.3], [37.2, 31.2]],
  );

  // Create officers with different roles
  const officer = await createTestOfficer({ role: 'officer', zoneId: zoneAId });
  officerOfficerId = officer.officer.id;
  const officerAuth = await getAuthToken(app, officer.officer.badgeNumber, officer.pin);
  officerToken = officerAuth.accessToken;

  const officerB = await createTestOfficer({ role: 'officer', zoneId: zoneBId });
  officerBOfficerId = officerB.officer.id;
  const officerBAuth = await getAuthToken(app, officerB.officer.badgeNumber, officerB.pin);
  officerBToken = officerBAuth.accessToken;

  const secretary = await createTestOfficer({ role: 'secretary', zoneId: null });
  const secretaryAuth = await getAuthToken(app, secretary.officer.badgeNumber, secretary.pin);
  secretaryToken = secretaryAuth.accessToken;

  const supervisor = await createTestOfficer({ role: 'supervisor', zoneId: zoneAId });
  supervisorOfficerId = supervisor.officer.id;
  const supervisorAuth = await getAuthToken(app, supervisor.officer.badgeNumber, supervisor.pin);
  supervisorToken = supervisorAuth.accessToken;

  const manager = await createTestOfficer({ role: 'manager', zoneId: null });
  const managerAuth = await getAuthToken(app, manager.officer.badgeNumber, manager.pin);
  managerToken = managerAuth.accessToken;

  const operator = await createTestOfficer({ role: 'operator', zoneId: null });
  const operatorAuth = await getAuthToken(app, operator.officer.badgeNumber, operator.pin);
  operatorToken = operatorAuth.accessToken;

  // Create incidents in each zone (as manager)
  const resA = await app.inject({
    method: 'POST',
    url: '/api/v1/incidents',
    headers: { authorization: `Bearer ${managerToken}` },
    payload: { title: 'RBAC-Zone A Incident', zoneId: zoneAId },
  });
  incidentInZoneA = JSON.parse(resA.body).data.id;

  // Assign zone A incident to officer A
  await app.inject({
    method: 'POST',
    url: `/api/v1/incidents/${incidentInZoneA}/assign`,
    headers: { authorization: `Bearer ${managerToken}` },
    payload: { officerId: officerOfficerId },
  });

  const resB = await app.inject({
    method: 'POST',
    url: '/api/v1/incidents',
    headers: { authorization: `Bearer ${managerToken}` },
    payload: { title: 'RBAC-Zone B Incident', zoneId: zoneBId },
  });
  incidentInZoneB = JSON.parse(resB.body).data.id;
});

afterAll(async () => {
  await testPrisma.$executeRawUnsafe(`DELETE FROM incident_updates WHERE incident_id IN (SELECT id FROM incidents WHERE title LIKE 'RBAC-%')`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM incidents WHERE title LIKE 'RBAC-%'`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM shifts WHERE zone_id IN ('${zoneAId}', '${zoneBId}')`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM zones WHERE id IN ('${zoneAId}', '${zoneBId}')`);
  await cleanTestData();
  await testPrisma.$disconnect();
  await redis.quit();
  await app.close();
});

describe('Integration: RBAC Enforcement', () => {
  // 1. Officer cannot create shifts (403)
  it('officer cannot create shifts', async () => {
    const now = new Date();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/shifts',
      headers: { authorization: `Bearer ${officerToken}` },
      payload: {
        officerId: officerOfficerId,
        zoneId: zoneAId,
        scheduledStart: new Date(now.getTime() + 3600000).toISOString(),
        scheduledEnd: new Date(now.getTime() + 36000000).toISOString(),
      },
    });
    expect(res.statusCode).toBe(403);
  });

  // 2. Officer can only see their own assigned incidents
  it('officer sees only their assigned incidents', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/incidents',
      headers: { authorization: `Bearer ${officerToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    // Officer should only see incidents assigned to them
    for (const inc of body.data) {
      expect(inc.assignedOfficerId).toBe(officerOfficerId);
    }
  });

  // 3. Secretary cannot assign officers (403)
  it('secretary cannot assign officers to incidents', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/incidents/${incidentInZoneB}/assign`,
      headers: { authorization: `Bearer ${secretaryToken}` },
      payload: { officerId: officerBOfficerId },
    });
    expect(res.statusCode).toBe(403);
  });

  // 4. Supervisor can only see their zone's data
  it('supervisor sees only their zone incidents', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/incidents',
      headers: { authorization: `Bearer ${supervisorToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    for (const inc of body.data) {
      expect(inc.zoneId).toBe(zoneAId);
    }
  });

  it('supervisor cannot access incident in another zone', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/incidents/${incidentInZoneB}`,
      headers: { authorization: `Bearer ${supervisorToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  // 5. Manager can see all zones
  it('manager can see incidents across all zones', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/incidents',
      headers: { authorization: `Bearer ${managerToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const zones = new Set(body.data.map((inc: any) => inc.zoneId));
    // Manager should see at least 2 different zones
    expect(zones.size).toBeGreaterThanOrEqual(2);
  });

  // 6. Operator can dispatch (assign) but not configure (create officers)
  it('operator can assign officers to incidents', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/incidents/${incidentInZoneB}/assign`,
      headers: { authorization: `Bearer ${operatorToken}` },
      payload: { officerId: officerBOfficerId },
    });
    expect(res.statusCode).toBe(200);
  });

  it('operator cannot create officers', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/officers',
      headers: { authorization: `Bearer ${operatorToken}` },
      payload: {
        nameEn: 'New Officer',
        nameAr: 'ضابط جديد',
        badgeNumber: 'TEST-SHOULD-FAIL',
        pin: '5678',
        role: 'officer',
      },
    });
    expect(res.statusCode).toBe(403);
  });
});
