import { describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.js'

describe('GET /health', () => {
  it('reports that the API is healthy', async () => {
    const app = buildApp()
    const response = await app.inject({ method: 'GET', url: '/health' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ status: 'ok', service: 'parlo-api' })
    await app.close()
  })
})
