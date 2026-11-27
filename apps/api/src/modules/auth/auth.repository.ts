import { and, eq, gt, isNull } from 'drizzle-orm'
import type { Database } from '../../shared/database/client.js'
import { emailVerificationTokens, sessions, users } from '../../shared/database/schema.js'

export type StoredUser = typeof users.$inferSelect
export type StoredSession = typeof sessions.$inferSelect

export class AuthRepository {
  constructor(private readonly db: Database) {}

  findUserByEmail(email: string) {
    return this.db.query.users.findFirst({ where: eq(users.email, email) })
  }

  findUserById(id: string) {
    return this.db.query.users.findFirst({ where: eq(users.id, id) })
  }

  async markEmailVerifiedForDevelopment(id: string) {
    const [user] = await this.db.update(users)
      .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, id)).returning()
    return user
  }

  async createUserWithSession(input: {
    email: string
    passwordHash: string
    displayName: string
    refreshTokenHash: string
    sessionExpiresAt: Date
    verificationTokenHash: string
    verificationExpiresAt: Date
  }) {
    return this.db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({
        email: input.email,
        passwordHash: input.passwordHash,
        displayName: input.displayName,
      }).returning()

      if (!user) throw new Error('Failed to create user')

      const [session] = await tx.insert(sessions).values({
        userId: user.id,
        refreshTokenHash: input.refreshTokenHash,
        expiresAt: input.sessionExpiresAt,
      }).returning()

      if (!session) throw new Error('Failed to create session')

      await tx.insert(emailVerificationTokens).values({
        userId: user.id,
        tokenHash: input.verificationTokenHash,
        expiresAt: input.verificationExpiresAt,
      })
      return { user, session }
    })
  }

  async createSession(input: { userId: string; refreshTokenHash: string; expiresAt: Date }) {
    const [session] = await this.db.insert(sessions).values(input).returning()
    if (!session) throw new Error('Failed to create session')
    return session
  }

  findActiveSession(id: string) {
    return this.db.query.sessions.findFirst({
      where: and(eq(sessions.id, id), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())),
    })
  }

  async rotateSession(id: string, refreshTokenHash: string) {
    await this.db.update(sessions).set({ refreshTokenHash, lastUsedAt: new Date() }).where(eq(sessions.id, id))
  }

  async revokeSession(id: string) {
    await this.db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, id))
  }

  async replaceEmailVerificationToken(userId: string, tokenHash: string, expiresAt: Date) {
    await this.db.transaction(async (tx) => {
      await tx.update(emailVerificationTokens)
        .set({ usedAt: new Date() })
        .where(and(eq(emailVerificationTokens.userId, userId), isNull(emailVerificationTokens.usedAt)))
      await tx.insert(emailVerificationTokens).values({ userId, tokenHash, expiresAt })
    })
  }

  async verifyEmail(tokenHash: string) {
    return this.db.transaction(async (tx) => {
      const token = await tx.query.emailVerificationTokens.findFirst({
        where: and(
          eq(emailVerificationTokens.tokenHash, tokenHash),
          isNull(emailVerificationTokens.usedAt),
          gt(emailVerificationTokens.expiresAt, new Date()),
        ),
      })
      if (!token) return undefined

      const [consumed] = await tx.update(emailVerificationTokens)
        .set({ usedAt: new Date() })
        .where(and(eq(emailVerificationTokens.id, token.id), isNull(emailVerificationTokens.usedAt)))
        .returning()
      if (!consumed) return undefined

      const [user] = await tx.update(users)
        .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
        .where(eq(users.id, token.userId))
        .returning()
      return user
    })
  }
}
