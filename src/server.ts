import Fastify, { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import { ZodError } from 'zod';
import { AppError } from './lib/errors.js';
import { prisma } from './lib/prisma.js';
import { redis } from './lib/redis.js';
import authPlugin from './plugins/auth.plugin.js';
import rbacPlugin from './plugins/rbac.plugin.js';
import authRoutes from './routes/auth.routes.js';
import zonesRoutes from './routes/zones.routes.js';
import officersRoutes from './routes/officers.routes.js';
import incidentsRoutes from './routes/incidents.routes.js';
import shiftsRoutes from './routes/shifts.routes.js';
import patrolsRoutes from './routes/patrols.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import mediaRoutes from './routes/media.routes.js';
import syncRoutes from './routes/sync.routes.js';
import aiRoutes from './routes/ai.routes.js';
import whatsappRoutes from './routes/whatsapp.routes.js';
import broadcastsRoutes from './routes/broadcasts.routes.js';

export function buildApp() {
  // trustProxy honors X-Forwarded-* from Railway/Fly/Vercel edge so request.ip
  // and request.protocol reflect the real client, not the platform proxy.
  const app = Fastify({ logger: true, trustProxy: true });

  app.register(cors, { origin: true });

  // Treat empty JSON bodies as `{}` instead of throwing FST_ERR_CTP_EMPTY_JSON_BODY.
  // Clients (browser fetch / RN fetch) send `Content-Type: application/json` even on
  // no-body POSTs like /broadcasts/:id/ack; Fastify's default parser 500s on those.
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    const raw = (body as string).trim();
    if (raw === '') return done(null, {});
    try {
      done(null, JSON.parse(raw));
    } catch (err) {
      (err as any).statusCode = 400;
      done(err as Error, undefined);
    }
  });

  // Global error handler. Routes parse query/body via zod's `.parse()` inside
  // handlers — those throw ZodError, which Fastify's `error.validation` field
  // never sees (it only fires for schemas attached to the route definition).
  // Without an explicit ZodError branch every bad input returns 500. Catch it
  // here and shape the same 400 response Fastify-validated routes return.
  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ error: error.message });
    }
    if (error instanceof ZodError) {
      return reply.status(400).send({ error: 'Validation error', details: error.issues });
    }
    if (error.validation) {
      return reply.status(400).send({ error: 'Validation error', details: error.validation });
    }
    app.log.error(error);
    return reply.status(500).send({ error: 'Internal server error' });
  });

  // Health check — reports PostgreSQL + Redis status
  app.get('/health', async () => {
    const dbOk = await prisma.$queryRawUnsafe('SELECT 1').then(() => true).catch(() => false);
    const redisOk = await redis.ping().then(() => true).catch(() => false);
    return {
      status: dbOk && redisOk ? 'ok' : 'degraded',
      services: { database: dbOk, redis: redisOk },
      timestamp: new Date().toISOString(),
    };
  });

  // Auth & RBAC plugins (before routes)
  app.register(authPlugin);
  app.register(rbacPlugin);

  // Routes
  app.register(authRoutes);
  app.register(zonesRoutes);
  app.register(officersRoutes);
  app.register(incidentsRoutes);
  app.register(shiftsRoutes);
  app.register(patrolsRoutes);
  app.register(dashboardRoutes);
  app.register(mediaRoutes);
  app.register(syncRoutes);
  app.register(aiRoutes);
  app.register(whatsappRoutes);
  app.register(broadcastsRoutes);

  return app;
}
