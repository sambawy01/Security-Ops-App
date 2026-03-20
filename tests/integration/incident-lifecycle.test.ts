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

// Test data IDs
const zoneId = randomUUID();
const categoryId = randomUUID();
const slaRuleId = randomUUID();

// Officers and tokens
let supervisorBadge: string;
let supervisorPin: string;
let supervisorToken: string;
let supervisorOfficerId: string;

let officerBadge: string;
let officerPin: string;
let officerToken: string;
let officerOfficerId: string;

// Incident ID created during the test
let incidentId: string;

beforeAll(async () => {
  app = buildApp();
  await app.ready();

  await cleanTestData();

  // Clean up from previous runs
  await testPrisma.$executeRawUnsafe(`DELETE FROM incident_updates WHERE incident_id IN (SELECT id FROM incidents WHERE title LIKE 'INTEG-%')`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM incident_media WHERE incident_id IN (SELECT id FROM incidents WHERE title LIKE 'INTEG-%')`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM incidents WHERE title LIKE 'INTEG-%'`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM sla_rules WHERE id = '${slaRuleId}'`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM categories WHERE id = '${categoryId}'`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM zones WHERE id = '${zoneId}'`);

  // Create zone
  await insertZoneWithBoundary(
    zoneId, 'منطقة تكامل', 'Integration Zone', '#ff00ff',
    [[35.0, 29.0], [35.1, 29.0], [35.1, 29.1], [35.0, 29.1], [35.0, 29.0]],
  );

  // Create category
  await testPrisma.category.create({
    data: { id: categoryId, nameAr: 'سرقة', nameEn: 'Theft', defaultPriority: 'high' },
  });

  // Create SLA rule: high theft -> 10min response, 120min resolution
  await testPrisma.slaRule.create({
    data: { id: slaRuleId, categoryId, priority: 'high', responseMinutes: 10, resolutionMinutes: 120 },
  });

  // Create supervisor
  const sup = await createTestOfficer({ role: 'supervisor', zoneId });
  supervisorBadge = sup.officer.badgeNumber;
  supervisorPin = sup.pin;
  supervisorOfficerId = sup.officer.id;

  // Create officer
  const off = await createTestOfficer({ role: 'officer', zoneId });
  officerBadge = off.officer.badgeNumber;
  officerPin = off.pin;
  officerOfficerId = off.officer.id;
});

afterAll(async () => {
  await testPrisma.$executeRawUnsafe(`DELETE FROM incident_updates WHERE incident_id IN (SELECT id FROM incidents WHERE title LIKE 'INTEG-%')`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM incident_media WHERE incident_id IN (SELECT id FROM incidents WHERE title LIKE 'INTEG-%')`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM incidents WHERE title LIKE 'INTEG-%'`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM sla_rules WHERE id = '${slaRuleId}'`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM categories WHERE id = '${categoryId}'`);
  await testPrisma.$executeRawUnsafe(`DELETE FROM zones WHERE id = '${zoneId}'`);
  await cleanTestData();
  await testPrisma.$disconnect();
  await redis.quit();
  await app.close();
});

describe('Integration: Full Incident Lifecycle', () => {
  // Step 1: Login as supervisor
  it('Step 1: supervisor logs in and gets token', async () => {
    const auth = await getAuthToken(app, supervisorBadge, supervisorPin);
    expect(auth.statusCode).toBe(200);
    expect(auth.accessToken).toBeDefined();
    supervisorToken = auth.accessToken;
  });

  // Step 2: Create incident with category and description
  it('Step 2: create incident with category and description', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/incidents',
      headers: { authorization: `Bearer ${supervisorToken}` },
      payload: {
        title: 'INTEG-Theft in parking lot',
        description: 'A vehicle was broken into at the parking lot near gate 3.',
        categoryId,
        zoneId,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.title).toBe('INTEG-Theft in parking lot');
    expect(body.data.status).toBe('open');
    incidentId = body.data.id;
  });

  // Step 3: Verify SLA deadlines were set
  it('Step 3: SLA deadlines are set based on category+priority', async () => {
    const incident = await testPrisma.incident.findUnique({ where: { id: incidentId } });
    expect(incident).not.toBeNull();
    expect(incident!.slaResponseDeadline).not.toBeNull();
    expect(incident!.slaResolutionDeadline).not.toBeNull();

    // Response deadline ~10 minutes from creation
    const responseMs = incident!.slaResponseDeadline!.getTime() - incident!.createdAt.getTime();
    expect(responseMs).toBeGreaterThan(9 * 60000);
    expect(responseMs).toBeLessThan(11 * 60000);

    // Resolution deadline ~120 minutes from creation
    const resolutionMs = incident!.slaResolutionDeadline!.getTime() - incident!.createdAt.getTime();
    expect(resolutionMs).toBeGreaterThan(119 * 60000);
    expect(resolutionMs).toBeLessThan(121 * 60000);
  });

  // Step 4: Assign officer to incident
  it('Step 4: assign officer to incident', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/incidents/${incidentId}/assign`,
      headers: { authorization: `Bearer ${supervisorToken}` },
      payload: { officerId: officerOfficerId },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.assignedOfficerId).toBe(officerOfficerId);
  });

  // Step 5: Verify status changed to assigned
  it('Step 5: status is now assigned', async () => {
    const incident = await testPrisma.incident.findUnique({ where: { id: incidentId } });
    expect(incident!.status).toBe('assigned');
    expect(incident!.assignedAt).not.toBeNull();
  });

  // Step 6: Login as officer and acknowledge (in_progress)
  it('Step 6: officer logs in and transitions to in_progress', async () => {
    const auth = await getAuthToken(app, officerBadge, officerPin);
    expect(auth.statusCode).toBe(200);
    officerToken = auth.accessToken;

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/incidents/${incidentId}`,
      headers: { authorization: `Bearer ${officerToken}` },
      payload: { status: 'in_progress' },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.status).toBe('in_progress');
  });

  // Step 7: Add a note to the incident
  it('Step 7: officer adds a note', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/incidents/${incidentId}/updates`,
      headers: { authorization: `Bearer ${officerToken}` },
      payload: {
        type: 'note',
        content: 'Arrived on scene. Vehicle owner contacted. Gathering evidence.',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.type).toBe('note');
    expect(body.data.content).toContain('Arrived on scene');
  });

  // Step 8: Resolve the incident
  it('Step 8: officer resolves the incident', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/incidents/${incidentId}`,
      headers: { authorization: `Bearer ${officerToken}` },
      payload: { status: 'resolved' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.status).toBe('resolved');
    expect(body.data.resolvedAt).toBeDefined();
  });

  // Step 9: Supervisor closes the incident
  it('Step 9: supervisor closes the incident', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/incidents/${incidentId}`,
      headers: { authorization: `Bearer ${supervisorToken}` },
      payload: { status: 'closed' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.status).toBe('closed');
    expect(body.data.closedAt).toBeDefined();
  });

  // Step 10: Verify all incident_updates were created in correct order
  it('Step 10: all incident_updates exist in correct order', async () => {
    const updates = await testPrisma.incidentUpdate.findMany({
      where: { incidentId },
      orderBy: { createdAt: 'asc' },
    });

    // Expect at least: assignment, status_change (in_progress), note, status_change (resolved), status_change (closed)
    expect(updates.length).toBeGreaterThanOrEqual(5);

    // First update should be assignment
    expect(updates[0].type).toBe('assignment');

    // Second update should be status_change to in_progress
    expect(updates[1].type).toBe('status_change');

    // There should be a note update
    const noteUpdate = updates.find((u) => u.type === 'note');
    expect(noteUpdate).toBeDefined();
    expect(noteUpdate!.content).toContain('Arrived on scene');

    // Last two should be status changes (resolved, closed)
    const statusChanges = updates.filter((u) => u.type === 'status_change');
    expect(statusChanges.length).toBeGreaterThanOrEqual(3);

    // Verify the final status change metadata includes closed
    const lastStatusChange = statusChanges[statusChanges.length - 1];
    const meta = lastStatusChange.metadata as Record<string, unknown>;
    expect(meta.new).toBe('closed');
  });
});
