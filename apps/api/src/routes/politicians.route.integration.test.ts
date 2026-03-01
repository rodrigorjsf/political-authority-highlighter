import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../app.js'

// Phase 1: tests run against a seeded local PostgreSQL
// Full Testcontainers setup added in CI task

describe('GET /api/v1/politicians', () => {
  const app = buildApp()

  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns 200 with data array and cursor field', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/politicians' })
    expect(response.statusCode).toBe(200)
    const body = response.json<{ data: unknown[]; cursor: string | null }>()
    expect(Array.isArray(body.data)).toBe(true)
    expect('cursor' in body).toBe(true)
  })

  it('respects limit query param', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/politicians?limit=5' })
    expect(response.statusCode).toBe(200)
    const body = response.json<{ data: unknown[] }>()
    expect(body.data.length).toBeLessThanOrEqual(5)
  })

  it('returns 400 for invalid limit', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/politicians?limit=0' })
    expect(response.statusCode).toBe(400)
  })

  it('returns 400 for limit over maximum', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/politicians?limit=100' })
    expect(response.statusCode).toBe(400)
  })

  it('each item has required card fields', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/politicians?limit=1' })
    const body = response.json<{ data: Array<Record<string, unknown>> }>()
    if (body.data.length > 0) {
      const item = body.data[0]
      expect(item).toBeDefined()
      if (item !== undefined) {
        expect(typeof item['id']).toBe('string')
        expect(typeof item['slug']).toBe('string')
        expect(typeof item['name']).toBe('string')
        expect(typeof item['party']).toBe('string')
        expect(typeof item['state']).toBe('string')
        expect(typeof item['overallScore']).toBe('number')
      }
    }
  })

  it('sets Cache-Control header', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/politicians' })
    expect(response.headers['cache-control']).toBe('public, max-age=300, s-maxage=3600')
  })

  it('/health returns ok', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' })
    expect(response.statusCode).toBe(200)
    expect(response.json<{ status: string }>().status).toBe('ok')
  })
})
