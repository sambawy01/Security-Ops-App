import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/server.js';
import { testPrisma, cleanTestData } from '../setup.js';
import { createTestOfficer, getAuthToken } from '../helpers.js';
import { redis } from '../../src/lib/redis.js';
import { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let managerToken: string;

beforeAll(async () => {
  app = buildApp();
  await app.ready();

  await cleanTestData();

  // Create manager for AI endpoint access
  const manager = await createTestOfficer({ role: 'manager', zoneId: null });
  const auth = await getAuthToken(app, manager.officer.badgeNumber, manager.pin);
  managerToken = auth.accessToken;
});

afterAll(async () => {
  await cleanTestData();
  await testPrisma.$disconnect();
  await redis.quit();
  await app.close();
});

describe('Integration: AI Endpoints', () => {
  // 1. GET /api/v1/ai/status returns a valid response with available boolean and model
  it('GET /api/v1/ai/status returns status with available and model fields', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/ai/status',
      headers: { authorization: `Bearer ${managerToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(typeof body.available).toBe('boolean');
    expect(body.model).toBeDefined();
  });

  // 2. POST /api/v1/ai/triage returns category and priority (real or fallback)
  it('POST /api/v1/ai/triage returns category and priority', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/triage',
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { message: 'There is a fire in the parking lot' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toBeDefined();
    // Whether AI is available or not, these fields should be present
    expect(body.data.category).toBeDefined();
    expect(typeof body.data.category).toBe('string');
    expect(body.data.priority).toBeDefined();
    expect(typeof body.data.priority).toBe('string');
  });

  // 3. POST /api/v1/ai/categorize returns category and priority
  it('POST /api/v1/ai/categorize returns category and priority', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/categorize',
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { description: 'Suspicious person near gate 5' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    // Regardless of AI availability, these must be present
    expect(body.category).toBeDefined();
    expect(typeof body.category).toBe('string');
    expect(body.priority).toBeDefined();
    expect(typeof body.priority).toBe('string');
  });

  // 4. GET /api/v1/ai/patterns returns data array
  it('GET /api/v1/ai/patterns returns data array', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/ai/patterns',
      headers: { authorization: `Bearer ${managerToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data)).toBe(true);
  });

  // 5. GET /api/v1/ai/reports returns data array
  it('GET /api/v1/ai/reports returns data array', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/ai/reports',
      headers: { authorization: `Bearer ${managerToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data)).toBe(true);
  });
});
