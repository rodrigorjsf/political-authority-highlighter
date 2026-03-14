import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import {
  PoliticianParamsSchema,
  VoteListQuerySchema,
  VoteListResponseSchema,
  type PoliticianParams,
  type VoteListQuery,
} from '../schemas/vote.schema.js'
import type { VoteService } from '../services/vote.service.js'

interface RouteDeps {
  voteService: VoteService
}

export function createVotesRoute(deps: RouteDeps): FastifyPluginAsyncTypebox {
  // eslint-disable-next-line @typescript-eslint/require-await
  return async (app) => {
    app.get<{ Params: PoliticianParams; Querystring: VoteListQuery }>(
      '/politicians/:slug/votes',
      {
        schema: {
          params: PoliticianParamsSchema,
          querystring: VoteListQuerySchema,
          response: { 200: VoteListResponseSchema },
        },
      },
      async (request, reply) => {
        const { slug } = request.params
        const { limit = 20, cursor } = request.query

        const result = await deps.voteService.findByPoliticianSlug({
          slug,
          limit,
          cursor,
        })

        void reply.header('Cache-Control', 'public, max-age=300, s-maxage=3600')

        return result
      },
    )
  }
}
