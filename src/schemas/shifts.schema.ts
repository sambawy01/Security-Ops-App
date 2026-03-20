import { z } from 'zod';

export const shiftParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listShiftsQuerySchema = z.object({
  zoneId: z.string().uuid().optional(),
  officerId: z.string().uuid().optional(),
  status: z.enum(['scheduled', 'active', 'completed', 'no_show', 'called_off']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(200).default(50),
});

export const createShiftSchema = z.object({
  officerId: z.string().uuid(),
  zoneId: z.string().uuid(),
  scheduledStart: z.coerce.date(),
  scheduledEnd: z.coerce.date(),
  isOvertime: z.boolean().optional(),
  parentShiftId: z.string().uuid().optional(),
}).refine((data) => data.scheduledEnd > data.scheduledStart, {
  message: 'scheduledEnd must be after scheduledStart',
  path: ['scheduledEnd'],
});

export const checkInSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const checkOutSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  handoverNotes: z.string().optional(),
});

export const changeShiftStatusSchema = z.object({
  status: z.enum(['called_off', 'no_show']),
});
