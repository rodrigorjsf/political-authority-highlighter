import { describe, it, expect, vi, beforeAll, type Mock } from 'vitest'
import type { SubscriptionRepository } from '../repositories/subscription.repository.js'
import type { Resend } from 'resend'

// MUST stub env BEFORE any import that reads process.env at module level
vi.stubEnv('EMAIL_ENCRYPTION_KEY', 'a'.repeat(64))
vi.stubEnv('RESEND_API_KEY', 'test-key')
vi.stubEnv('ALERTS_FROM_EMAIL', 'test@test.com')
vi.stubEnv('API_BASE_URL', 'http://localhost:3001')
vi.stubEnv('DATABASE_URL_READER', 'postgresql://test:test@localhost:5432/test')

let createSubscriptionService: typeof import('./subscription.service.js').createSubscriptionService
let NotFoundError: typeof import('../hooks/error-handler.js').NotFoundError
let TokenNotFoundError: typeof import('../hooks/error-handler.js').TokenNotFoundError

beforeAll(async () => {
  const serviceModule = await import('./subscription.service.js')
  const errorModule = await import('../hooks/error-handler.js')
  createSubscriptionService = serviceModule.createSubscriptionService
  NotFoundError = errorModule.NotFoundError
  TokenNotFoundError = errorModule.TokenNotFoundError
})

interface MockRepository {
  findPoliticianBySlug: Mock
  insertPendingSubscription: Mock
  findPendingByTokenHash: Mock
  confirmSubscription: Mock
  deleteByUnsubscribeToken: Mock
  deleteExpiredPending: Mock
}

interface MockResend {
  emails: { send: Mock }
}

function buildRepository(): MockRepository {
  return {
    findPoliticianBySlug: vi.fn(),
    insertPendingSubscription: vi.fn().mockResolvedValue(undefined),
    findPendingByTokenHash: vi.fn(),
    confirmSubscription: vi.fn().mockResolvedValue(undefined),
    deleteByUnsubscribeToken: vi.fn().mockResolvedValue(true),
    deleteExpiredPending: vi.fn().mockResolvedValue(undefined),
  }
}

function buildResend(): MockResend {
  return {
    emails: {
      send: vi.fn().mockResolvedValue({ data: { id: 'test-email-id' }, error: null }),
    },
  }
}

describe('subscribe', () => {
  it('throws NotFoundError when politician not found', async () => {
    const repo = buildRepository()
    repo.findPoliticianBySlug.mockResolvedValue(undefined)
    const service = createSubscriptionService(
      repo as unknown as SubscriptionRepository,
      buildResend() as unknown as Resend,
    )

    await expect(service.subscribe('unknown-slug', 'test@example.com')).rejects.toBeInstanceOf(
      NotFoundError,
    )
  })

  it('inserts pending subscription and sends confirmation email when politician found', async () => {
    const repo = buildRepository()
    repo.findPoliticianBySlug.mockResolvedValue({ id: 'politician-id', name: 'Test Politician' })
    const resend = buildResend()
    const service = createSubscriptionService(
      repo as unknown as SubscriptionRepository,
      resend as unknown as Resend,
    )

    await service.subscribe('test-slug', 'user@example.com')

    expect(repo.insertPendingSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        politicianId: 'politician-id',
        email: 'user@example.com',
        confirmTokenHash: expect.stringMatching(/^[0-9a-f]{64}$/) as unknown,
      }),
    )
    expect(resend.emails.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['user@example.com'],
        subject: expect.stringContaining('Test Politician') as unknown,
        html: expect.stringContaining('confirmar') as unknown,
      }),
    )
  })

  it('throws when Resend returns an error', async () => {
    const repo = buildRepository()
    repo.findPoliticianBySlug.mockResolvedValue({ id: 'politician-id', name: 'Test Politician' })
    const resend = buildResend()
    resend.emails.send.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'Invalid email', statusCode: 422 },
    })
    const service = createSubscriptionService(
      repo as unknown as SubscriptionRepository,
      resend as unknown as Resend,
    )

    await expect(service.subscribe('test-slug', 'invalid@example.com')).rejects.toThrow(
      'Resend error',
    )
  })
})

describe('confirm', () => {
  it('throws TokenNotFoundError when token hash not found', async () => {
    const repo = buildRepository()
    repo.findPendingByTokenHash.mockResolvedValue(undefined)
    const service = createSubscriptionService(
      repo as unknown as SubscriptionRepository,
      buildResend() as unknown as Resend,
    )

    await expect(service.confirm('a'.repeat(64))).rejects.toBeInstanceOf(TokenNotFoundError)
  })

  it('throws TokenNotFoundError when token is expired', async () => {
    const repo = buildRepository()
    repo.findPendingByTokenHash.mockResolvedValue({
      id: 'pending-id',
      politicianId: 'politician-id',
      email: 'user@example.com',
      expiresAt: new Date(Date.now() - 1000), // expired 1 second ago
    })
    const service = createSubscriptionService(
      repo as unknown as SubscriptionRepository,
      buildResend() as unknown as Resend,
    )

    await expect(service.confirm('a'.repeat(64))).rejects.toBeInstanceOf(TokenNotFoundError)
  })

  it('confirms subscription when token is valid and not expired', async () => {
    const repo = buildRepository()
    repo.findPendingByTokenHash.mockResolvedValue({
      id: 'pending-id',
      politicianId: 'politician-id',
      email: 'user@example.com',
      expiresAt: new Date(Date.now() + 60_000), // expires in 1 minute
    })
    const service = createSubscriptionService(
      repo as unknown as SubscriptionRepository,
      buildResend() as unknown as Resend,
    )

    await service.confirm('a'.repeat(64))

    expect(repo.confirmSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        pendingId: 'pending-id',
        politicianId: 'politician-id',
        emailHash: expect.stringMatching(/^[0-9a-f]{64}$/) as unknown,
        unsubscribeToken: expect.stringMatching(/^[0-9a-f]{64}$/) as unknown,
      }),
    )
  })
})

describe('unsubscribe', () => {
  it('completes successfully even when token not found (idempotent)', async () => {
    const repo = buildRepository()
    repo.deleteByUnsubscribeToken.mockResolvedValue(false) // token not found
    const service = createSubscriptionService(
      repo as unknown as SubscriptionRepository,
      buildResend() as unknown as Resend,
    )

    // Should not throw
    await expect(service.unsubscribe('a'.repeat(64))).resolves.toBeUndefined()
  })

  it('completes successfully when token is found and deleted', async () => {
    const repo = buildRepository()
    repo.deleteByUnsubscribeToken.mockResolvedValue(true)
    const service = createSubscriptionService(
      repo as unknown as SubscriptionRepository,
      buildResend() as unknown as Resend,
    )

    await expect(service.unsubscribe('a'.repeat(64))).resolves.toBeUndefined()
    expect(repo.deleteByUnsubscribeToken).toHaveBeenCalledWith('a'.repeat(64))
  })
})
