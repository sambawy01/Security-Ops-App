import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { verifyAccessToken, isTokenRevoked, TokenPayload } from '../lib/auth.js';
import { UnauthorizedError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { redis } from '../lib/redis.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: TokenPayload;
  }
}

// Presence: at most one DB write per officer per PRESENCE_WRITE_DEBOUNCE_S.
// Redis SET NX EX returns "OK" only when the key was absent — so the write
// fires once, then is suppressed for the TTL.
const PRESENCE_WRITE_DEBOUNCE_S = 30;

async function touchPresence(officerId: string): Promise<void> {
  try {
    const ok = await redis.set(
      `presence:wrote:${officerId}`,
      '1',
      'EX',
      PRESENCE_WRITE_DEBOUNCE_S,
      'NX',
    );
    if (ok !== 'OK') return;
    await prisma.officer.update({
      where: { id: officerId },
      data: { lastSeenAt: new Date() },
    });
  } catch {
    // Presence is best-effort — never fail a request because of it.
  }
}

// Check if the officer's account is still active (not suspended/deleted).
// Cached in Redis for 30s to avoid a DB hit on every request.
const STATUS_CACHE_TTL_S = 30;

async function isOfficerActive(officerId: string): Promise<boolean> {
  try {
    const cacheKey = `officer:status:${officerId}`;
    const cached = await redis.get(cacheKey);
    if (cached !== null) {
      return cached === 'active' || cached === 'off_duty' || cached === 'device_offline';
    }

    const officer = await prisma.officer.findUnique({
      where: { id: officerId },
      select: { status: true },
    });
    if (!officer) return false;

    await redis.setex(cacheKey, STATUS_CACHE_TTL_S, officer.status);
    return officer.status === 'active' || officer.status === 'off_duty' || officer.status === 'device_offline';
  } catch {
    // If the check fails, allow the request through — better than
    // locking out all users on a transient DB error.
    return true;
  }
}

const authPlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest('user', undefined as unknown as typeof app extends { user: infer U } ? U : any);

  app.addHook('onRequest', async (request: FastifyRequest) => {
    // Skip auth for public routes. /media/ serves uploaded incident photos —
    // filenames are random UUIDs, so the URL itself is the capability and
    // gating with JWT would block direct <img src> loads from the dashboard.
    const publicPrefixes = ['/health', '/api/v1/auth/login', '/api/v1/auth/refresh', '/api/v1/whatsapp/webhook', '/media/'];
    if (publicPrefixes.some(p => request.url.startsWith(p))) return;

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedError('Missing token');

    const token = authHeader.slice(7);
    if (await isTokenRevoked(token)) throw new UnauthorizedError('Token revoked');

    try {
      request.user = verifyAccessToken(token);
    } catch {
      throw new UnauthorizedError('Invalid token');
    }

    // Check that the officer's account is still active (not suspended/deleted).
    // Cached in Redis for 30s to avoid a DB hit per request.
    if (!(await isOfficerActive(request.user.officerId))) {
      throw new UnauthorizedError('Account suspended or deactivated');
    }

    // Fire-and-forget presence update (debounced via Redis).
    void touchPresence(request.user.officerId);
  });
};

export default fp(authPlugin);
