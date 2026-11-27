import { z } from 'zod'

export const authProviderSchema = z.enum(['google', 'apple'])
export type AuthProvider = z.infer<typeof authProviderSchema>

const emailSchema = z.email().max(254).transform((email) => email.trim().toLowerCase())
const passwordSchema = z.string().min(8).max(128)

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: passwordSchema,
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
})

export const refreshSessionSchema = z.object({
  refreshToken: z.string().min(32),
})

export const resendVerificationSchema = z.object({
  email: emailSchema,
})

export const verifyEmailSchema = z.object({
  token: z.string().min(32).max(256),
})

export const userSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  emailVerified: z.boolean(),
  avatarUrl: z.url().nullable(),
})

export const exchangeIdentityTokenSchema = z.object({
  provider: authProviderSchema,
  identityToken: z.string().min(1),
  nonce: z.string().min(16).optional(),
})

export const sessionSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int().positive(),
  user: userSchema,
})

export type Session = z.infer<typeof sessionSchema>
export type AuthUser = z.infer<typeof userSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
