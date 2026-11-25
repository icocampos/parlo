import cors from '@fastify/cors'
import Fastify from 'fastify'
import { ZodError } from 'zod'
import { healthRoutes } from './modules/health/health.routes.js'
import { AppError } from './shared/errors/app-error.js'

export function buildApp() {
  const app = Fastify({ logger: true })

  app.register(cors, { origin: false })
  app.register(healthRoutes, { prefix: '/health' })

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
