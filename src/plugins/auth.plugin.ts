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

const authPlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest('user', undefined as unknown as typeof app extends { user: infer U } ? U : any);

  app.addHook('onRequest', async (request: FastifyRequest) => {
    // Skip auth for public routes
    const publicPrefixes = ['/health', '/api/v1/auth/login', '/api/v1/auth/refresh', '/api/v1/whatsapp/webhook'];
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

    // Fire-and-forget presence update (debounced via Redis).
    void touchPresence(request.user.officerId);
  });
};

export default fp(authPlugin);
