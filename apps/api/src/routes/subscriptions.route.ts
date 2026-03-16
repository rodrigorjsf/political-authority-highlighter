import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import {
  SubscribeParamsSchema,
  SubscribeBodySchema,
  SubscribeResponseSchema,
  TokenQuerySchema,
  TokenResponseSchema,
  type SubscribeParams,
  type SubscribeBody,
  type TokenQuery,
} from '../schemas/subscription.schema.js'
import type { SubscriptionService } from '../services/subscription.service.js'

interface RouteDeps {
  subscriptionService: SubscriptionService
}

/**
 * Subscription routes for RF-POST-002 email alerts.
 *
 * POST /api/v1/politicians/:slug/subscribe  — initiates double opt-in (returns 202)
 * GET  /api/v1/subscribe/confirm            — confirms subscription (plaintext → encrypted)
 * GET  /api/v1/subscribe/unsubscribe        — one-click unsubscribe (always 200, idempotent)
 */
export function createSubscriptionsRoute(deps: RouteDeps): FastifyPluginAsyncTypebox {
  // eslint-disable-next-line @typescript-eslint/require-await
  return async (app) => {
    app.post<{ Params: SubscribeParams; Body: SubscribeBody }>(
      '/politicians/:slug/subscribe',
      {
        schema: {
          params: SubscribeParamsSchema,
          body: SubscribeBodySchema,
          response: { 202: SubscribeResponseSchema },
        },
      },
      async (request, reply) => {
        const { slug } = request.params
        const { email } = request.body
        await deps.subscriptionService.subscribe(slug, email)
        return reply.status(202).send({ message: 'Verifique seu email para confirmar a inscrição.' })
      },
    )

    app.get<{ Querystring: TokenQuery }>(
      '/subscribe/confirm',
      {
        schema: {
          querystring: TokenQuerySchema,
          response: { 200: TokenResponseSchema },
        },
      },
      async (request) => {
        await deps.subscriptionService.confirm(request.query.token)
        return { message: 'Inscrição confirmada com sucesso. Você receberá alertas por email.' }
      },
    )

    app.get<{ Querystring: TokenQuery }>(
      '/subscribe/unsubscribe',
      {
        schema: {
          querystring: TokenQuerySchema,
          response: { 200: TokenResponseSchema },
        },
      },
      async (request) => {
        await deps.subscriptionService.unsubscribe(request.query.token)
        return { message: 'Inscrição cancelada com sucesso.' }
      },
    )
  }
}
