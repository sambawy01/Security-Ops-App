import { z } from 'zod';

export const loginSchema = z.object({
  badgeNumber: z.string().min(1),
  pin: z.string().min(4).max(8),
  deviceId: z.string().optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
