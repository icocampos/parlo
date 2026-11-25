import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3333),
  DATABASE_URL: z.url().optional(),
  JWT_SECRET: z.string().min(32).optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  APPLE_CLIENT_ID: z.string().min(1).optional(),
})

export const env = envSchema.parse(process.env)
