import { loginSchema, refreshSessionSchema, registerSchema, resendVerificationSchema, verifyEmailSchema } from '@parlo/shared'
import type { FastifyPluginAsync } from 'fastify'
import type { Database } from '../../shared/database/client.js'
import { AppError } from '../../shared/errors/app-error.js'
import type { EmailService } from '../../shared/email/email.service.js'
import { AuthRepository } from './auth.repository.js'
import { accessTokenExpiresIn, AuthService } from './auth.service.js'

type AuthRoutesOptions = { db?: Database | undefined; emailService: EmailService }

export const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (app, options) => {
  if (!options.db) {
    app.all('/*', async () => { throw new AppError('Banco de dados não configurado', 503, 'DATABASE_NOT_CONFIGURED') })
    return
  }

  const service = new AuthService(
    new AuthRepository(options.db),
    (payload) => app.jwt.sign(payload, { expiresIn: accessTokenExpiresIn }),
    options.emailService,
    (error) => app.log.error({ error }, 'Failed to send verification email'),
  )

  app.post('/register', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (request, reply) => reply.status(201).send(
    await service.register(registerSchema.parse(request.body)),
  ))
  app.post('/login', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => reply.send(await service.login(loginSchema.parse(request.body))))
  app.post('/refresh', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (request, reply) => {
    const { refreshToken } = refreshSessionSchema.parse(request.body)
    return reply.send(await service.refresh(refreshToken))
  })
  app.post('/logout', async (request, reply) => {
    const { refreshToken } = refreshSessionSchema.parse(request.body)
    await service.logout(refreshToken)
    return reply.status(204).send()
  })
  app.get('/me', { onRequest: [app.authenticate] }, async (request, reply) => {
    return reply.send(await service.getUser(request.user.sub))
  })
  app.post('/resend-verification', { config: { rateLimit: { max: 3, timeWindow: '15 minutes' } } }, async (request, reply) => {
    const { email } = resendVerificationSchema.parse(request.body)
    await service.resendVerification(email)
    return reply.status(202).send({ message: 'Se o endereço estiver pendente, um novo e-mail será enviado.' })
  })
  app.get('/verify-email', async (request, reply) => {
    const { token } = verifyEmailSchema.parse(request.query)
    await service.verifyEmail(token)
    return reply.type('text/html; charset=utf-8').send(successPage)
  })
}

const successPage = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>E-mail confirmado</title></head><body style="margin:0;background:#fff8ea;font-family:Arial,sans-serif;color:#14213d"><main style="max-width:560px;margin:80px auto;padding:24px;text-align:center"><p style="color:#5b8e7d;font-weight:700;letter-spacing:2px">PARLO</p><h1>E-mail confirmado!</h1><p>Você já pode voltar ao aplicativo e continuar aprendendo.</p></main></body></html>`
