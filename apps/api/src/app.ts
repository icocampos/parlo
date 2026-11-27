import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import Fastify from 'fastify'
import { ZodError } from 'zod'
import { env } from './config/env.js'
import { authRoutes } from './modules/auth/auth.routes.js'
import { healthRoutes } from './modules/health/health.routes.js'
import { createDatabase } from './shared/database/client.js'
import { DisabledEmailService, ResendEmailService } from './shared/email/email.service.js'
import { AppError } from './shared/errors/app-error.js'

export function buildApp() {
  const app = Fastify({ logger: true })
  const database = env.DATABASE_URL ? createDatabase(env.DATABASE_URL) : undefined
  const emailService = env.RESEND_API_KEY && env.EMAIL_FROM && env.API_PUBLIC_URL
    ? new ResendEmailService(env.RESEND_API_KEY, env.EMAIL_FROM, env.API_PUBLIC_URL)
    : new DisabledEmailService()

  app.register(cors, {
    origin: (origin, callback) => {
      // Aplicativos nativos não enviam Origin. Eles não dependem de CORS.
      if (!origin) return callback(null, true)

      if (allowedCorsOrigins().has(origin) || isLocalDevelopmentOrigin(origin)) {
        return callback(null, true)
      }

      return callback(null, false)
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
  app.register(rateLimit, { global: false })
  app.register(jwt, { secret: env.JWT_SECRET ?? 'test-only-secret-that-is-at-least-32-characters' })
  app.decorate('authenticate', async function (request) {
    await request.jwtVerify()
  })
  app.register(healthRoutes, { prefix: '/health' })
  app.register(authRoutes, { prefix: '/auth', db: database?.db, emailService })

  if (database) app.addHook('onClose', () => database.close())

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', issues: error.issues })
    }

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ code: error.code, message: error.message })
    }

    app.log.error(error)
    return reply.status(500).send({ code: 'INTERNAL_SERVER_ERROR', message: 'Unexpected server error' })
  })

  return app
}

function allowedCorsOrigins() {
  return new Set(
    env.CORS_ORIGINS?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? [],
  )
}

function isLocalDevelopmentOrigin(origin: string) {
  if (env.NODE_ENV === 'production') return false

  try {
    const url = new URL(origin)
    return (url.protocol === 'http:' || url.protocol === 'https:')
      && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
  } catch {
    return false
  }
}
