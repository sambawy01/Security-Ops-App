import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { ForbiddenError } from '../lib/errors.js';

type RoleCheck = string[] | ((user: FastifyRequest['user']) => boolean);

declare module 'fastify' {
  interface FastifyContextConfig {
    allowedRoles?: RoleCheck;
  }
}

const rbacPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', async (request: FastifyRequest, _reply: FastifyReply) => {
    const allowedRoles = request.routeOptions.config?.allowedRoles;
    if (!allowedRoles || !request.user) return;

    if (Array.isArray(allowedRoles)) {
      if (!allowedRoles.includes(request.user.role)) {
        throw new ForbiddenError(`Role '${request.user.role}' not permitted`);
      }
    } else if (!allowedRoles(request.user)) {
      throw new ForbiddenError('Access denied');
    }
  });
};

export default fp(rbacPlugin);
