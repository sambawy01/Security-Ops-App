import { FastifyInstance } from 'fastify';
import { testPrisma } from './setup.js';
import { hashPin } from '../src/lib/auth.js';

let testCounter = 0;

interface OfficerOverrides {
  badgeNumber?: string;
  pin?: string;
  role?: string;
  zoneId?: string | null;
  deviceId?: string | null;
  nameEn?: string;
  nameAr?: string;
  failedLoginAttempts?: number;
  lockedUntil?: Date | null;
}

export async function createTestOfficer(overrides: OfficerOverrides = {}) {
  testCounter++;
  const pin = overrides.pin ?? '1234';
  const pinHash = await hashPin(pin);

  const officer = await testPrisma.officer.create({
    data: {
      nameEn: overrides.nameEn ?? `Test Officer ${testCounter}`,
      nameAr: overrides.nameAr ?? `ضابط اختبار ${testCounter}`,
      badgeNumber: overrides.badgeNumber ?? `TEST-${Date.now()}-${testCounter}`,
      role: (overrides.role as any) ?? 'officer',
      zoneId: overrides.zoneId ?? null,
      deviceId: overrides.deviceId ?? null,
      pinHash,
      failedLoginAttempts: overrides.failedLoginAttempts ?? 0,
      lockedUntil: overrides.lockedUntil ?? null,
    },
  });

  return { officer, pin };
}

export async function getAuthToken(
  app: FastifyInstance,
  badgeNumber: string,
  pin: string,
  deviceId?: string,
) {
  const payload: Record<string, string> = { badgeNumber, pin };
  if (deviceId) payload.deviceId = deviceId;

  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload,
  });

  const body = JSON.parse(res.body);
  return {
    accessToken: body.accessToken as string,
    refreshToken: body.refreshToken as string,
    statusCode: res.statusCode,
    body,
  };
}
