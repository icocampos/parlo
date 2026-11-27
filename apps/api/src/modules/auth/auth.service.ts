import { hash, verify } from '@node-rs/argon2'
import type { AuthUser, LoginInput, RegisterInput, Session } from '@parlo/shared'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { AppError } from '../../shared/errors/app-error.js'
import type { EmailService } from '../../shared/email/email.service.js'
import type { AuthRepository, StoredSession, StoredUser } from './auth.repository.js'

const ACCESS_TOKEN_SECONDS = 15 * 60
const REFRESH_TOKEN_DAYS = 30
const EMAIL_VERIFICATION_HOURS = 24
type SignAccessToken = (payload: { sub: string; sessionId: string }) => string

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly signAccessToken: SignAccessToken,
    private readonly emailService: EmailService,
    private readonly onEmailError: (error: unknown) => void = () => undefined,
  ) {}

  async register(input: RegisterInput, options: { skipVerificationEmail?: boolean } = {}): Promise<Session> {
    if (await this.repository.findUserByEmail(input.email)) {
      throw new AppError('Este e-mail já está em uso', 409, 'EMAIL_ALREADY_EXISTS')
    }

    const passwordHash = await hash(input.password, { memoryCost: 19_456, timeCost: 2, parallelism: 1 })
    const tokenSecret = randomBytes(32).toString('base64url')
    const verificationToken = randomBytes(32).toString('base64url')
    let result: Awaited<ReturnType<AuthRepository['createUserWithSession']>>
    try {
      result = await this.repository.createUserWithSession({
        email: input.email,
        displayName: input.name,
        passwordHash,
        refreshTokenHash: digest(tokenSecret),
        sessionExpiresAt: refreshExpiration(),
        verificationTokenHash: digest(verificationToken),
        verificationExpiresAt: verificationExpiration(),
      })
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
        throw new AppError('Este e-mail já está em uso', 409, 'EMAIL_ALREADY_EXISTS')
      }
      throw error
    }
    if (!options.skipVerificationEmail) await this.sendVerificationEmail(result.user, verificationToken)
    return this.sessionResponse(result.user, result.session, tokenSecret)
  }

  async login(input: LoginInput): Promise<Session> {
    const user = await this.repository.findUserByEmail(input.email)
    if (!user || !(await verify(user.passwordHash, input.password))) {
      throw new AppError('E-mail ou senha inválidos', 401, 'INVALID_CREDENTIALS')
    }

    const tokenSecret = randomBytes(32).toString('base64url')
    const session = await this.repository.createSession({
      userId: user.id,
      refreshTokenHash: digest(tokenSecret),
      expiresAt: refreshExpiration(),
    })
    return this.sessionResponse(user, session, tokenSecret)
  }

  async registerVerifiedForDevelopment(input: RegisterInput): Promise<Session> {
    const session = await this.register(input, { skipVerificationEmail: true })
    const user = await this.repository.markEmailVerifiedForDevelopment(session.user.id)
    if (!user) throw new Error('Não foi possível confirmar a conta de teste')
    return { ...session, user: publicUser(user) }
  }

  async refresh(refreshToken: string): Promise<Session> {
    const { sessionId, secret } = splitRefreshToken(refreshToken)
    const session = await this.repository.findActiveSession(sessionId)
    if (!session || !safeEqual(session.refreshTokenHash, digest(secret))) {
      if (session) await this.repository.revokeSession(session.id)
      throw new AppError('Sessão inválida ou expirada', 401, 'INVALID_REFRESH_TOKEN')
    }

    const user = await this.repository.findUserById(session.userId)
    if (!user) throw new AppError('Usuário não encontrado', 401, 'USER_NOT_FOUND')

    const nextSecret = randomBytes(32).toString('base64url')
    await this.repository.rotateSession(session.id, digest(nextSecret))
    return this.sessionResponse(user, session, nextSecret)
  }

  async logout(refreshToken: string) {
    const { sessionId, secret } = splitRefreshToken(refreshToken)
    const session = await this.repository.findActiveSession(sessionId)
    if (!session || !safeEqual(session.refreshTokenHash, digest(secret))) {
      throw new AppError('Sessão inválida ou expirada', 401, 'INVALID_REFRESH_TOKEN')
    }
    await this.repository.revokeSession(sessionId)
  }

  async getUser(userId: string): Promise<AuthUser> {
    const user = await this.repository.findUserById(userId)
    if (!user) throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND')
    return publicUser(user)
  }

  async resendVerification(email: string) {
    const user = await this.repository.findUserByEmail(email)
    if (!user || user.emailVerifiedAt) return

    const token = randomBytes(32).toString('base64url')
    await this.repository.replaceEmailVerificationToken(user.id, digest(token), verificationExpiration())
    await this.sendVerificationEmail(user, token)
  }

  async verifyEmail(token: string): Promise<AuthUser> {
    const user = await this.repository.verifyEmail(digest(token))
    if (!user) throw new AppError('Link inválido ou expirado', 400, 'INVALID_VERIFICATION_TOKEN')
    return publicUser(user)
  }

  private sessionResponse(user: StoredUser, session: StoredSession, secret: string): Session {
    return {
      accessToken: this.signAccessToken({ sub: user.id, sessionId: session.id }),
      refreshToken: `${session.id}.${secret}`,
      expiresIn: ACCESS_TOKEN_SECONDS,
      user: publicUser(user),
    }
  }

  private async sendVerificationEmail(user: StoredUser, token: string) {
    try {
      await this.emailService.sendEmailVerification({ email: user.email, name: user.displayName, token })
    } catch (error) {
      this.onEmailError(error)
    }
  }
}

function publicUser(user: StoredUser): AuthUser {
  return {
    id: user.id,
    name: user.displayName,
    email: user.email,
    emailVerified: user.emailVerifiedAt !== null,
    avatarUrl: user.avatarUrl,
  }
}

function digest(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

function refreshExpiration() {
  return new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000)
}

function verificationExpiration() {
  return new Date(Date.now() + EMAIL_VERIFICATION_HOURS * 60 * 60 * 1000)
}

function splitRefreshToken(token: string) {
  const separator = token.indexOf('.')
  if (separator < 1) throw new AppError('Refresh token inválido', 401, 'INVALID_REFRESH_TOKEN')
  return { sessionId: token.slice(0, separator), secret: token.slice(separator + 1) }
}

export const accessTokenExpiresIn = ACCESS_TOKEN_SECONDS
