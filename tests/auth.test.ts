import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../src/server.js';
import { testPrisma, cleanTestData } from './setup.js';
import { createTestOfficer, getAuthToken } from './helpers.js';
import { revokeToken } from '../src/lib/auth.js';
import { redis } from '../src/lib/redis.js';
import { FastifyInstance } from 'fastify';

let app: FastifyInstance;

beforeAll(async () => {
  app = buildApp();
  await app.ready();
});

afterAll(async () => {
  await cleanTestData();
  await testPrisma.$disconnect();
  await redis.quit();
  await app.close();
});

beforeEach(async () => {
  await cleanTestData();
});

describe('Auth System', () => {
  // 1. Login with valid badge+PIN returns tokens and officer info
  it('should login with valid badge and PIN', async () => {
    const { officer, pin } = await createTestOfficer();

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { badgeNumber: officer.badgeNumber, pin },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
    expect(body.officer.id).toBe(officer.id);
    expect(body.officer.nameEn).toBe(officer.nameEn);
    expect(body.officer.nameAr).toBe(officer.nameAr);
    expect(body.officer.role).toBe('officer');
  });

  // 2. Login with wrong PIN returns 401 and increments failed attempts
  it('should return 401 for wrong PIN and increment failed attempts', async () => {
    const { officer } = await createTestOfficer();

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { badgeNumber: officer.badgeNumber, pin: '9999' },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('Invalid credentials');

    const updated = await testPrisma.officer.findUnique({ where: { id: officer.id } });
    expect(updated!.failedLoginAttempts).toBe(1);
  });

  // 3. Login with wrong badge number returns 401
  it('should return 401 for non-existent badge number', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { badgeNumber: 'NONEXISTENT-999', pin: '1234' },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('Invalid credentials');
  });

  // 4. Account locks after 5 failed attempts, returns 429
  it('should lock account after 5 failed attempts', async () => {
    const { officer } = await createTestOfficer();

    // Fail 5 times
    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { badgeNumber: officer.badgeNumber, pin: 'wrong' },
      });
    }

    // 6th attempt should return 429
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { badgeNumber: officer.badgeNumber, pin: 'wrong' },
    });

    expect(res.statusCode).toBe(429);
    const body = JSON.parse(res.body);
    expect(body.error).toContain('locked');
  });

  // 5. Locked account cannot login even with correct PIN until lockout expires
  it('should reject correct PIN on locked account', async () => {
    const { officer, pin } = await createTestOfficer({
      failedLoginAttempts: 5,
      lockedUntil: new Date(Date.now() + 15 * 60 * 1000), // locked for 15 more minutes
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { badgeNumber: officer.badgeNumber, pin },
    });

    expect(res.statusCode).toBe(429);
  });

  // 6. Refresh token rotation works
  it('should rotate refresh tokens', async () => {
    const { officer, pin } = await createTestOfficer();
    const { refreshToken: oldRefresh } = await getAuthToken(app, officer.badgeNumber, pin);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: oldRefresh },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
    expect(body.refreshToken).not.toBe(oldRefresh);

    // Old refresh token should now be revoked
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: oldRefresh },
    });

    expect(res2.statusCode).toBe(401);
  });

  // 7. Revoked access token returns 401
  it('should reject revoked access token', async () => {
    const { officer, pin } = await createTestOfficer();
    const { accessToken } = await getAuthToken(app, officer.badgeNumber, pin);

    // Revoke the access token
    await revokeToken(accessToken, 900);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    // The logout route itself works, but try a protected route
    const protectedRes = await app.inject({
      method: 'GET',
      url: '/api/v1/some-protected-route',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(protectedRes.statusCode).toBe(401);
    const body = JSON.parse(protectedRes.body);
    expect(body.error).toBe('Token revoked');
  });

  // 8. Request without Authorization header to protected route returns 401
  it('should return 401 for missing auth header on protected route', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/some-protected-route',
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('Missing token');
  });

  // 9. Device binding: first login binds device, second login from different device returns 401
  it('should bind device on first login and reject different device', async () => {
    const { officer, pin } = await createTestOfficer();

    // First login with device-A
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { badgeNumber: officer.badgeNumber, pin, deviceId: 'device-A' },
    });
    expect(res1.statusCode).toBe(200);

    // Verify device was bound
    const updated = await testPrisma.officer.findUnique({ where: { id: officer.id } });
    expect(updated!.deviceId).toBe('device-A');

    // Second login from device-B should fail
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { badgeNumber: officer.badgeNumber, pin, deviceId: 'device-B' },
    });
    expect(res2.statusCode).toBe(401);
    const body = JSON.parse(res2.body);
    expect(body.error).toContain('Device not authorized');
  });

  // 10. RBAC: route with allowedRoles rejects unauthorized role
  it('should reject unauthorized role via RBAC', async () => {
    const { officer, pin } = await createTestOfficer({ role: 'officer' });

    // Build a fresh app with a guarded route registered before ready()
    const rbacApp = buildApp();
    rbacApp.get(
      '/api/v1/test-rbac',
      { config: { allowedRoles: ['manager'] } },
      async () => ({ ok: true }),
    );
    await rbacApp.ready();

    // Login via the fresh app
    const { accessToken } = await getAuthToken(rbacApp, officer.badgeNumber, pin);

    const res = await rbacApp.inject({
      method: 'GET',
      url: '/api/v1/test-rbac',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error).toContain('not permitted');

    await rbacApp.close();
  });
});
