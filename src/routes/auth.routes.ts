import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import {
  hashPin,
  verifyPin,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  revokeToken,
  isTokenRevoked,
  TokenPayload,
} from '../lib/auth.js';
import { UnauthorizedError, TooManyRequestsError } from '../lib/errors.js';
import { loginSchema, refreshSchema } from '../schemas/auth.schema.js';

const LOCKOUT_MINUTES = 15;
const MAX_FAILED_ATTEMPTS = 5;

const authRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/v1/auth/login
  app.post('/api/v1/auth/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const officer = await prisma.officer.findUnique({
      where: { badgeNumber: body.badgeNumber },
    });

    if (!officer) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check lockout
    if (officer.lockedUntil && officer.lockedUntil > new Date()) {
      throw new TooManyRequestsError('Account locked due to too many failed attempts');
    }

    // Check device binding
    if (officer.deviceId && body.deviceId && officer.deviceId !== body.deviceId) {
      throw new UnauthorizedError('Device not authorized for this account');
    }

    // Verify PIN
    const pinValid = await verifyPin(body.pin, officer.pinHash);

    if (!pinValid) {
      const newAttempts = officer.failedLoginAttempts + 1;
      const updateData: Record<string, unknown> = {
        failedLoginAttempts: newAttempts,
      };

      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
      }

      await prisma.officer.update({
        where: { id: officer.id },
        data: updateData,
      });

      throw new UnauthorizedError('Invalid credentials');
    }

    // Success: reset failed attempts, bind device if first login
    const updateData: Record<string, unknown> = {
      failedLoginAttempts: 0,
      lockedUntil: null,
    };

    if (!officer.deviceId && body.deviceId) {
      updateData.deviceId = body.deviceId;
    }

    await prisma.officer.update({
      where: { id: officer.id },
      data: updateData,
    });

    const payload: TokenPayload = {
      officerId: officer.id,
      role: officer.role,
      zoneId: officer.zoneId,
      deviceId: officer.deviceId ?? body.deviceId ?? null,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      officer: {
        id: officer.id,
        nameEn: officer.nameEn,
        nameAr: officer.nameAr,
        role: officer.role,
        zoneId: officer.zoneId,
      },
    };
  });

  // POST /api/v1/auth/refresh
  app.post('/api/v1/auth/refresh', async (request, reply) => {
    const body = refreshSchema.parse(request.body);

    if (await isTokenRevoked(body.refreshToken)) {
      throw new UnauthorizedError('Refresh token revoked');
    }

    let decoded: TokenPayload;
    try {
      decoded = verifyRefreshToken(body.refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Revoke old refresh token (rotation) — 7 days TTL
    await revokeToken(body.refreshToken, 7 * 24 * 60 * 60);

    const payload: TokenPayload = {
      officerId: decoded.officerId,
      role: decoded.role,
      zoneId: decoded.zoneId,
      deviceId: decoded.deviceId,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    return { accessToken, refreshToken };
  });

  // POST /api/v1/auth/logout
  app.post('/api/v1/auth/logout', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      // Revoke access token with 15 minute TTL
      await revokeToken(token, 15 * 60);
    }

    return { success: true };
  });
};

export default authRoutes;
