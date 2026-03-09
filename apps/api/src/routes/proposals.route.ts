import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import {
  PoliticianParamsSchema,
  ProposalListQuerySchema,
  ProposalListResponseSchema,
  type PoliticianParams,
  type ProposalListQuery,
} from '../schemas/proposal.schema.js'
import type { ProposalService } from '../services/proposal.service.js'

interface RouteDeps {
  proposalService: ProposalService
}

export function createProposalsRoute(deps: RouteDeps): FastifyPluginAsyncTypebox {
  // eslint-disable-next-line @typescript-eslint/require-await
  return async (app) => {
    app.get<{ Params: PoliticianParams; Querystring: ProposalListQuery }>(
      '/politicians/:slug/proposals',
      {
        schema: {
          params: PoliticianParamsSchema,
          querystring: ProposalListQuerySchema,
          response: { 200: ProposalListResponseSchema },
        },
      },
      async (request, reply) => {
        const { slug } = request.params
        const { limit = 20, cursor } = request.query

        const result = await deps.proposalService.findByPoliticianSlug(slug, {
          limit,
          cursor,
        })

        void reply.header('Cache-Control', 'public, max-age=300, s-maxage=3600')

        return result
      },
    )
  }
}
