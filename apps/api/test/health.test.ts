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

  it('allows the Expo web origin during development', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'http://localhost:8081' },
    })

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:8081')
    await app.close()
  })

  it('does not allow an unknown web origin', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://example.invalid' },
    })

    expect(response.headers['access-control-allow-origin']).toBeUndefined()
    await app.close()
  })
})
