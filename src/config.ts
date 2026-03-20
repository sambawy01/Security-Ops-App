import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().startsWith('postgresql'),
  REDIS_URL: z.string(),
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  PORT: z.coerce.number().default(3000),
  OLLAMA_URL: z.string().url().default('http://localhost:11434'),
  AI_MODEL: z.string().default('qwen2.5:7b'),
});

export const config = envSchema.parse(process.env);
