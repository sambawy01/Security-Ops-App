import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';

const syncRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/v1/sync', async (request) => {
    const { actions } = request.body as { actions: Array<{
      id: string;
      actionType: string;
      payload: any;
      createdAtDevice: string;
    }> };

    const processed: string[] = [];
    const conflicts: string[] = [];

    for (const action of actions.slice(0, 500)) { // Max 500 per batch
      try {
        // Store in sync_queue for audit trail
        await prisma.syncQueue.create({
          data: {
            deviceId: request.user.deviceId || 'unknown',
            officerId: request.user.officerId,
            actionType: action.actionType,
            payload: action.payload,
            createdAtDevice: new Date(action.createdAtDevice),
            receivedAtServer: new Date(),
            processedAt: new Date(),
            conflictStatus: 'none',
          },
        });
        processed.push(action.id);
      } catch (err) {
        conflicts.push(action.id);
      }
    }

    return { processed, conflicts, serverSeq: Date.now() };
  });
};

export default syncRoutes;
