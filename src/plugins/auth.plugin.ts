import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { verifyAccessToken, isTokenRevoked, TokenPayload } from '../lib/auth.js';
import { UnauthorizedError } from '../lib/errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: TokenPayload;
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
  });
};

export default fp(authPlugin);
