import { z } from 'zod';

export const officerParamsSchema = z.object({
  id: z.string().uuid(),
});

export const createOfficerSchema = z.object({
  nameAr: z.string().min(1),
  nameEn: z.string().min(1),
  badgeNumber: z.string().min(1),
  rank: z.string().default(''),
  role: z.enum(['officer', 'supervisor', 'operator', 'hr_admin', 'secretary', 'assistant_manager', 'manager']),
  zoneId: z.string().uuid().nullable().optional(),
  phone: z.string().default(''),
  pin: z.string().min(4),
  skills: z.array(z.string()).default([]),
});

export const updateOfficerSchema = z.object({
  nameAr: z.string().min(1).optional(),
  nameEn: z.string().min(1).optional(),
  rank: z.string().optional(),
  role: z.enum(['officer', 'supervisor', 'operator', 'hr_admin', 'secretary', 'assistant_manager', 'manager']).optional(),
  zoneId: z.string().uuid().nullable().optional(),
  phone: z.string().optional(),
  skills: z.array(z.string()).optional(),
});

export const locationBodySchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional(),
});

export const statusBodySchema = z.object({
  status: z.enum(['active', 'device_offline', 'off_duty', 'suspended']),
});

export const locationHistoryQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
});
