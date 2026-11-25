import { healthSchema } from '@parlo/shared'
import type { FastifyPluginAsync } from 'fastify'

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (_request, reply) => {
    const payload = healthSchema.parse({
      status: 'ok',
      service: 'parlo-api',
      timestamp: new Date().toISOString(),
    })

    return reply.send(payload)
  })
}
