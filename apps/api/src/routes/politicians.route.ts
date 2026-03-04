import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import {
  PoliticianListQuerySchema,
  PoliticianListResponseSchema,
  PoliticianParamsSchema,
  PoliticianProfileSchema,
  type PoliticianListQuery,
  type PoliticianParams,
} from '../schemas/politician.schema.js'
import type { PoliticianService } from '../services/politician.service.js'
import { NotFoundError } from '../hooks/error-handler.js'

interface RouteDeps {
  politicianService: PoliticianService
}

/**
 * GET /politicians — paginated politician listing sorted by integrity score DESC.
 * Cache-Control: public, max-age=300, s-maxage=3600 for Cloudflare CDN.
 */
export function createPoliticiansRoute(deps: RouteDeps): FastifyPluginAsyncTypebox {
  // eslint-disable-next-line @typescript-eslint/require-await
  return async (app) => {
    app.get<{ Querystring: PoliticianListQuery }>(
      '/politicians',
      {
        schema: {
          querystring: PoliticianListQuerySchema,
          response: { 200: PoliticianListResponseSchema },
        },
      },
      async (request, reply) => {
        const { limit = 20, cursor, role, state, search } = request.query

        const result = await deps.politicianService.findByFilters({
          limit,
          cursor,
          role,
          state,
          search,
        })

        void reply.header('Cache-Control', 'public, max-age=300, s-maxage=3600')

        return result
      },
    )

    app.get<{ Params: PoliticianParams }>(
      '/politicians/:slug',
      {
        schema: {
          params: PoliticianParamsSchema,
          response: { 200: PoliticianProfileSchema },
        },
      },
      async (request, reply) => {
        const { slug } = request.params
        const result = await deps.politicianService.findBySlug(slug)

        if (result === undefined) {
          throw new NotFoundError('Politician', slug)
        }

        void reply.header('Cache-Control', 'public, max-age=3600, s-maxage=86400')

        return result
      },
    )
  }
}
