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
const categoryId = randomUUID();
const slaRuleId = randomUUID();

// Auth tokens
let managerToken: string;
let supervisorToken: string;
let supervisorOfficerId: string;
let officerToken: string;
let officerOfficerId: string;
let officerBToken: string;
let officerBOfficerId: string;
let secretaryToken: string;

// Created incident IDs for chained tests
let createdIncidentId: string;
let assignedIncidentId: string;

beforeAll(async () => {
  app = buildApp();
  await app.ready();

  await cleanTestData();

  // Clean up test data from previous runs
  await testPrisma.$executeRawUnsafe(`DELETE FROM incident_updates WHERE incident_id IN (SELECT id FROM incidents WHERE title LIKE 'TEST-%')`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM incident_media WHERE incident_id IN (SELECT id FROM incidents WHERE title LIKE 'TEST-%')`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM incidents WHERE title LIKE 'TEST-%'`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM sla_rules WHERE id = '${slaRuleId}'`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM categories WHERE id = '${categoryId}'`);
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

  // Create test category
  await testPrisma.category.create({
    data: {
      id: categoryId,
      nameAr: 'حريق',
      nameEn: 'Fire',
      defaultPriority: 'critical',
    },
  });

  // Create SLA rule: critical fire -> 5min response, 60min resolution
  await testPrisma.slaRule.create({
    data: {
      id: slaRuleId,
      categoryId,
      priority: 'critical',
      responseMinutes: 5,
      resolutionMinutes: 60,
    },
  });

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

  // Create secretary
  const { officer: secretary, pin: secretaryPin } = await createTestOfficer({
    role: 'secretary', zoneId: null,
  });
  const secretaryAuth = await getAuthToken(app, secretary.badgeNumber, secretaryPin);
  secretaryToken = secretaryAuth.accessToken;
});

afterAll(async () => {
  // Clean up incident data
  await testPrisma.$executeRawUnsafe(`DELETE FROM incident_updates WHERE incident_id IN (SELECT id FROM incidents WHERE title LIKE 'TEST-%')`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM incident_media WHERE incident_id IN (SELECT id FROM incidents WHERE title LIKE 'TEST-%')`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM incidents WHERE title LIKE 'TEST-%'`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM sla_rules WHERE id = '${slaRuleId}'`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM categories WHERE id = '${categoryId}'`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM zones WHERE id IN ('${zoneAId}', '${zoneBId}')`);
  await cleanTestData();
  await testPrisma.$disconnect();
  await redis.quit();
  await app.close();
});

describe('Incident Routes', () => {
  // 1. POST /api/v1/incidents creates incident with category and auto-sets SLA deadlines
  it('should create incident with category and auto-set SLA deadlines', async () => {
    const before = Date.now();

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/incidents',
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        title: 'TEST-Fire in Building A',
        categoryId,
        zoneId: zoneAId,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data).toBeDefined();
    expect(body.data.title).toBe('TEST-Fire in Building A');
    expect(body.data.status).toBe('open');
    // Priority should be derived from category default (critical)
    expect(body.data.priority).toBe('critical');
    // SLA deadlines should be set
    expect(body.data.slaResponseDeadline).toBeDefined();
    expect(body.data.slaResolutionDeadline).toBeDefined();

    createdIncidentId = body.data.id;
  });

  // 2. SLA deadline math: critical incident with matching SLA rule sets correct deadlines
  it('should set correct SLA deadlines (5min response, 60min resolution)', async () => {
    const before = Date.now();

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/incidents',
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        title: 'TEST-SLA Deadline Check',
        categoryId,
        priority: 'critical',
        zoneId: zoneAId,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    const responseDeadline = new Date(body.data.slaResponseDeadline).getTime();
    const resolutionDeadline = new Date(body.data.slaResolutionDeadline).getTime();

    // Response deadline should be ~5 minutes from now
    const expectedResponseMin = before + 5 * 60000 - 5000; // 5s tolerance
    const expectedResponseMax = before + 5 * 60000 + 5000;
    expect(responseDeadline).toBeGreaterThanOrEqual(expectedResponseMin);
    expect(responseDeadline).toBeLessThanOrEqual(expectedResponseMax);

    // Resolution deadline should be ~60 minutes from now
    const expectedResolutionMin = before + 60 * 60000 - 5000;
    const expectedResolutionMax = before + 60 * 60000 + 5000;
    expect(resolutionDeadline).toBeGreaterThanOrEqual(expectedResolutionMin);
    expect(resolutionDeadline).toBeLessThanOrEqual(expectedResolutionMax);
  });

  // 3. POST /api/v1/incidents/:id/assign assigns officer, sets status, records assigned_at
  it('should assign officer, set status to assigned, and record assigned_at', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/incidents/${createdIncidentId}/assign`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { officerId: officerOfficerId },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.assignedOfficerId).toBe(officerOfficerId);
    expect(body.data.status).toBe('assigned');
    expect(body.data.assignedAt).toBeDefined();

    assignedIncidentId = createdIncidentId;
  });

  // 4. PATCH /api/v1/incidents/:id transitions assigned -> in_progress -> resolved -> closed
  it('should transition assigned -> in_progress -> resolved -> closed', async () => {
    // assigned -> in_progress
    let res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/incidents/${assignedIncidentId}`,
      headers: { authorization: `Bearer ${officerToken}` },
      payload: { status: 'in_progress' },
    });
    expect(res.statusCode).toBe(200);
    let body = JSON.parse(res.body);
    expect(body.data.status).toBe('in_progress');

    // in_progress -> resolved
    res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/incidents/${assignedIncidentId}`,
      headers: { authorization: `Bearer ${officerToken}` },
      payload: { status: 'resolved' },
    });
    expect(res.statusCode).toBe(200);
    body = JSON.parse(res.body);
    expect(body.data.status).toBe('resolved');
    expect(body.data.resolvedAt).toBeDefined();

    // resolved -> closed (supervisor)
    res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/incidents/${assignedIncidentId}`,
      headers: { authorization: `Bearer ${supervisorToken}` },
      payload: { status: 'closed' },
    });
    expect(res.statusCode).toBe(200);
    body = JSON.parse(res.body);
    expect(body.data.status).toBe('closed');
    expect(body.data.closedAt).toBeDefined();
  });

  // 5. PATCH /api/v1/incidents/:id rejects invalid transition (open -> resolved) with 400
  it('should reject invalid status transition with 400', async () => {
    // Create a fresh open incident
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/incidents',
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { title: 'TEST-Invalid Transition', zoneId: zoneAId },
    });
    const incidentId = JSON.parse(createRes.body).data.id;

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/incidents/${incidentId}`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { status: 'resolved' },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toContain('Invalid status transition');
  });

  // 6. POST /api/v1/incidents/:id/cancel cancels with reason (as supervisor)
  it('should cancel incident with reason as supervisor', async () => {
    // Create a fresh incident in zone A
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/incidents',
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { title: 'TEST-To Cancel', zoneId: zoneAId },
    });
    const incidentId = JSON.parse(createRes.body).data.id;

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/incidents/${incidentId}/cancel`,
      headers: { authorization: `Bearer ${supervisorToken}` },
      payload: { reason: 'Duplicate report' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.status).toBe('cancelled');
    expect(body.data.cancelReason).toBe('Duplicate report');
  });

  // 7. POST /api/v1/incidents/:id/cancel returns 403 (as officer)
  it('should return 403 when officer tries to cancel incident', async () => {
    // Create a fresh incident
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/incidents',
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { title: 'TEST-Officer Cannot Cancel', zoneId: zoneAId },
    });
    const incidentId = JSON.parse(createRes.body).data.id;

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/incidents/${incidentId}/cancel`,
      headers: { authorization: `Bearer ${officerToken}` },
      payload: { reason: 'Should not work' },
    });

    expect(res.statusCode).toBe(403);
  });

  // 8. GET /api/v1/incidents filters by status, zone, priority
  it('should filter incidents by status, zone, priority', async () => {
    // Create incidents in different zones/statuses
    await app.inject({
      method: 'POST',
      url: '/api/v1/incidents',
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { title: 'TEST-Filter High ZoneB', zoneId: zoneBId, priority: 'high' },
    });

    // Filter by zone
    let res = await app.inject({
      method: 'GET',
      url: `/api/v1/incidents?zone=${zoneBId}`,
      headers: { authorization: `Bearer ${managerToken}` },
    });
    expect(res.statusCode).toBe(200);
    let body = JSON.parse(res.body);
    for (const inc of body.data) {
      expect(inc.zoneId).toBe(zoneBId);
    }

    // Filter by priority
    res = await app.inject({
      method: 'GET',
      url: `/api/v1/incidents?priority=high`,
      headers: { authorization: `Bearer ${managerToken}` },
    });
    expect(res.statusCode).toBe(200);
    body = JSON.parse(res.body);
    for (const inc of body.data) {
      expect(inc.priority).toBe('high');
    }

    // Filter by status
    res = await app.inject({
      method: 'GET',
      url: `/api/v1/incidents?status=open`,
      headers: { authorization: `Bearer ${managerToken}` },
    });
    expect(res.statusCode).toBe(200);
    body = JSON.parse(res.body);
    for (const inc of body.data) {
      expect(inc.status).toBe('open');
    }
  });

  // 9. GET /api/v1/incidents supervisor sees only their zone's incidents
  it('should return only zone-scoped incidents for supervisor', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/incidents',
      headers: { authorization: `Bearer ${supervisorToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    // Supervisor is in Zone A, should only see Zone A incidents
    for (const inc of body.data) {
      expect(inc.zoneId).toBe(zoneAId);
    }
  });

  // 10. GET /api/v1/incidents/:id returns full detail with updates
  it('should return full incident detail with updates', async () => {
    // Use the first created incident (which has been assigned, transitioned, etc.)
    // Create a fresh one with updates for clarity
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/incidents',
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { title: 'TEST-Detail Check', zoneId: zoneAId, categoryId },
    });
    const incidentId = JSON.parse(createRes.body).data.id;

    // Assign to officer
    await app.inject({
      method: 'POST',
      url: `/api/v1/incidents/${incidentId}/assign`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { officerId: officerOfficerId },
    });

    // Get detail
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/incidents/${incidentId}`,
      headers: { authorization: `Bearer ${managerToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.id).toBe(incidentId);
    expect(body.data.title).toBe('TEST-Detail Check');
    expect(body.data.updates).toBeDefined();
    expect(body.data.updates.length).toBeGreaterThanOrEqual(1);
    expect(body.data.media).toBeDefined();
    expect(body.data.category).toBeDefined();
    expect(body.data.category.nameEn).toBe('Fire');
    expect(body.data.assignedOfficer).toBeDefined();
    expect(body.data.zone).toBeDefined();
    expect(body.data.zone.nameEn).toBe('Zone A');
  });

  // 11. POST /api/v1/incidents/:id/updates adds a note update
  it('should add a note update to incident', async () => {
    // Create an incident and assign to officer
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/incidents',
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { title: 'TEST-Note Update', zoneId: zoneAId },
    });
    const incidentId = JSON.parse(createRes.body).data.id;

    // Assign to officer so they can add updates
    await app.inject({
      method: 'POST',
      url: `/api/v1/incidents/${incidentId}/assign`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { officerId: officerOfficerId },
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/incidents/${incidentId}/updates`,
      headers: { authorization: `Bearer ${officerToken}` },
      payload: {
        type: 'note',
        content: 'Arrived on scene, investigating.',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data).toBeDefined();
    expect(body.data.type).toBe('note');
    expect(body.data.content).toBe('Arrived on scene, investigating.');
    expect(body.data.incidentId).toBe(incidentId);
  });
});
