import { z } from 'zod';

export const incidentParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listIncidentsQuerySchema = z.object({
  status: z.enum(['open', 'assigned', 'in_progress', 'escalated', 'resolved', 'closed', 'cancelled']).optional(),
  zone: z.string().uuid().optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  assignedOfficerId: z.string().uuid().optional(),
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(200).default(50),
});

export const createIncidentSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  zoneId: z.string().uuid().optional(),
  reporterType: z.enum(['officer', 'resident', 'whatsapp']).optional(),
  reporterPhone: z.string().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export const assignIncidentSchema = z.object({
  officerId: z.string().uuid(),
});

export const updateIncidentSchema = z.object({
  status: z.enum(['in_progress', 'resolved', 'escalated', 'closed', 'cancelled']).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  awaitingExternal: z.boolean().optional(),
});

export const addUpdateSchema = z.object({
  type: z.enum(['note', 'status_change', 'escalation']),
  content: z.string().default(''),
  metadata: z.record(z.unknown()).optional(),
});

export const cancelIncidentSchema = z.object({
  reason: z.string().min(1),
});
