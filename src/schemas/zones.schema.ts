import { z } from 'zod';

export const zoneParamsSchema = z.object({
  id: z.string().uuid(),
});
