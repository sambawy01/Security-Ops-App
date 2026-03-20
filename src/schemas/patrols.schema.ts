import { z } from 'zod';

export const patrolRouteParamsSchema = z.object({
  id: z.string().uuid(),
});

export const patrolLogParamsSchema = z.object({
  id: z.string().uuid(),
});

export const checkpointParamsSchema = z.object({
  id: z.string().uuid(),
  checkpointId: z.string().uuid(),
});

export const listPatrolRoutesQuerySchema = z.object({
  zoneId: z.string().uuid().optional(),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(200).default(50),
});

export const createPatrolRouteSchema = z.object({
  name: z.string().min(1).max(255),
  zoneId: z.string().uuid(),
  estimatedDurationMin: z.number().int().min(1),
  checkpoints: z.array(z.object({
    checkpointId: z.string().uuid(),
    sequenceOrder: z.number().int().min(1),
    expectedDwellMin: z.number().int().min(0).default(0),
  })).min(1),
});

export const startPatrolSchema = z.object({
  routeId: z.string().uuid(),
  shiftId: z.string().uuid(),
});

export const confirmCheckpointSchema = z.object({
  confirmed: z.boolean(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  skipReason: z.string().optional(),
}).refine(
  (data) => {
    if (!data.confirmed && !data.skipReason) return false;
    return true;
  },
  { message: 'skipReason is required when checkpoint is skipped', path: ['skipReason'] },
);

export const listPatrolLogsQuerySchema = z.object({
  shiftId: z.string().uuid().optional(),
  officerId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(200).default(50),
});
