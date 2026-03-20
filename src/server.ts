import Fastify, { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import { AppError } from './lib/errors.js';

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

  return app;
}
