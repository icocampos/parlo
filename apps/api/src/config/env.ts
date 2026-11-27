import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3333),
  DATABASE_URL: z.url().optional(),
  JWT_SECRET: z.string().min(32).optional(),
  RESEND_API_KEY: z.string().startsWith('re_').optional(),
  EMAIL_FROM: z.string().min(3).optional(),
  API_PUBLIC_URL: z.url().optional(),
  CORS_ORIGINS: z.string().optional(),
  DEV_AUTH_SECRET: z.string().min(32).optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  APPLE_CLIENT_ID: z.string().min(1).optional(),
}).superRefine((value, context) => {
  if (value.DATABASE_URL && !value.JWT_SECRET) {
    context.addIssue({ code: 'custom', path: ['JWT_SECRET'], message: 'JWT_SECRET is required when DATABASE_URL is set' })
  }
  const emailValues = [value.RESEND_API_KEY, value.EMAIL_FROM, value.API_PUBLIC_URL]
  if (emailValues.some(Boolean) && !emailValues.every(Boolean)) {
    context.addIssue({ code: 'custom', message: 'RESEND_API_KEY, EMAIL_FROM and API_PUBLIC_URL must be configured together' })
  }
})

export const env = envSchema.parse(process.env)
