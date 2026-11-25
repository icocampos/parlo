import 'dotenv/config'
import { buildApp } from './app.js'
import { env } from './config/env.js'

const app = buildApp()

const shutdown = async () => {
  await app.close()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

try {
  await app.listen({ host: env.HOST, port: env.PORT })
} catch (error) {
  app.log.error(error)
  process.exit(1)
}
