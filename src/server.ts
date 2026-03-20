import Fastify, { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import { AppError } from './lib/errors.js';
import authPlugin from './plugins/auth.plugin.js';
import rbacPlugin from './plugins/rbac.plugin.js';
import authRoutes from './routes/auth.routes.js';
import zonesRoutes from './routes/zones.routes.js';
import officersRoutes from './routes/officers.routes.js';
import incidentsRoutes from './routes/incidents.routes.js';
import shiftsRoutes from './routes/shifts.routes.js';
import patrolsRoutes from './routes/patrols.routes.js';

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(cors, { origin: true });

  // Global error handler
  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ error: error.message });
    }
    if (error.validation) {
      return reply.status(400).send({ error: 'Validation error', details: error.validation });
    }
    app.log.error(error);
    return reply.status(500).send({ error: 'Internal server error' });
  });

  // Health check placeholder
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

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

  return app;
}
