import { z } from 'zod'

export const authProviderSchema = z.enum(['google', 'apple'])
export type AuthProvider = z.infer<typeof authProviderSchema>

export const exchangeIdentityTokenSchema = z.object({
  provider: authProviderSchema,
  identityToken: z.string().min(1),
  nonce: z.string().min(16).optional(),
})

export const sessionSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int().positive(),
})

export type Session = z.infer<typeof sessionSchema>
