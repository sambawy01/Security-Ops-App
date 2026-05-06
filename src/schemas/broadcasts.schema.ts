import { z } from 'zod';

const PRIORITIES = ['emergency', 'urgent', 'normal', 'info'] as const;
const ROLE_AUDIENCES = ['officer', 'supervisor', 'operator', 'manager', 'assistant_manager', 'secretary', 'hr_admin'] as const;

export const broadcastParamsSchema = z.object({
  id: z.string().uuid(),
});

export const createBroadcastSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  priority: z.enum(PRIORITIES).default('normal'),
  /** 'all' | a Role | 'zone' (when zoneId is supplied) */
  audience: z.union([z.literal('all'), z.enum(ROLE_AUDIENCES), z.literal('zone')]).default('all'),
  zoneId: z.string().uuid().optional(),
});

export const listBroadcastsQuerySchema = z.object({
  /** ISO timestamp; only broadcasts created strictly after `since` are returned */
  since: z.string().datetime().optional(),
  /** Cap row count */
  take: z.coerce.number().int().min(1).max(100).default(50),
});
