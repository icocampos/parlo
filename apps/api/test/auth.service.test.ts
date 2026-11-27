import { describe, expect, it } from 'vitest'
import { AuthService } from '../src/modules/auth/auth.service.js'

function repository() {
  const users = new Map<string, any>()
  const sessions = new Map<string, any>()
  const verificationTokens = new Map<string, any>()
  let sequence = 0

  return {
    users,
    sessions,
    findUserByEmail: async (email: string) => [...users.values()].find((user) => user.email === email),
    findUserById: async (id: string) => users.get(id),
    createUserWithSession: async (input: any) => {
      const user = {
        id: crypto.randomUUID(), email: input.email, passwordHash: input.passwordHash,
        displayName: input.displayName, avatarUrl: null, emailVerifiedAt: null, createdAt: new Date(), updatedAt: new Date(),
      }
      const session = newSession(user.id, input.refreshTokenHash, input.sessionExpiresAt, ++sequence)
      users.set(user.id, user)
      sessions.set(session.id, session)
      verificationTokens.set(input.verificationTokenHash, { userId: user.id, expiresAt: input.verificationExpiresAt })
      return { user, session }
    },
    createSession: async (input: any) => {
      const session = newSession(input.userId, input.refreshTokenHash, input.expiresAt, ++sequence)
      sessions.set(session.id, session)
      return session
    },
    findActiveSession: async (id: string) => {
      const session = sessions.get(id)
      return session && !session.revokedAt && session.expiresAt > new Date() ? session : undefined
    },
    rotateSession: async (id: string, refreshTokenHash: string) => {
      sessions.get(id).refreshTokenHash = refreshTokenHash
    },
    revokeSession: async (id: string) => { sessions.get(id).revokedAt = new Date() },
    replaceEmailVerificationToken: async (userId: string, tokenHash: string, expiresAt: Date) => {
      verificationTokens.clear()
      verificationTokens.set(tokenHash, { userId, expiresAt })
    },
    verifyEmail: async (tokenHash: string) => {
      const token = verificationTokens.get(tokenHash)
      if (!token || token.expiresAt <= new Date()) return undefined
      verificationTokens.delete(tokenHash)
      const user = users.get(token.userId)
      user.emailVerifiedAt = new Date()
      return user
    },
  }
}

function newSession(userId: string, refreshTokenHash: string, expiresAt: Date, sequence: number) {
  return {
    id: `00000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`,
    userId, refreshTokenHash, expiresAt, revokedAt: null, createdAt: new Date(), lastUsedAt: new Date(),
  }
}

describe('AuthService', () => {
  it('registers, logs in and rotates the refresh token', async () => {
    const repo = repository()
    const sent: string[] = []
    const emailService = { sendEmailVerification: async ({ token }: { token: string }) => { sent.push(token) } }
    const service = new AuthService(repo as never, ({ sub }) => `access.${sub}`, emailService)

    const registered = await service.register({ name: 'Icaro', email: 'icaro@example.com', password: 'very-secret' })
    expect(registered.user).toMatchObject({ name: 'Icaro', email: 'icaro@example.com' })
    expect(registered.refreshToken).toContain('.')
    expect(registered.user.emailVerified).toBe(false)
    expect(sent).toHaveLength(1)

    const verified = await service.verifyEmail(sent[0]!)
    expect(verified.emailVerified).toBe(true)
    await expect(service.verifyEmail(sent[0]!)).rejects.toMatchObject({ code: 'INVALID_VERIFICATION_TOKEN' })

    const loggedIn = await service.login({ email: 'icaro@example.com', password: 'very-secret' })
    const refreshed = await service.refresh(loggedIn.refreshToken)
    expect(refreshed.refreshToken).not.toBe(loggedIn.refreshToken)
    await expect(service.refresh(loggedIn.refreshToken)).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN' })
  })

  it('does not reveal whether a login email exists', async () => {
    const service = new AuthService(repository() as never, () => 'access', { sendEmailVerification: async () => undefined })
    await expect(service.login({ email: 'missing@example.com', password: 'wrong' }))
      .rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
  })
})
