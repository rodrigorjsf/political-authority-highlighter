import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import {
  PoliticianParamsSchema,
  CommitteeListResponseSchema,
  type PoliticianParams,
} from '../schemas/committee.schema.js'
import type { CommitteeService } from '../services/committee.service.js'

interface RouteDeps {
  committeeService: CommitteeService
}

export function createCommitteesRoute(deps: RouteDeps): FastifyPluginAsyncTypebox {
  // eslint-disable-next-line @typescript-eslint/require-await
  return async (app) => {
    app.get<{ Params: PoliticianParams }>(
      '/politicians/:slug/committees',
      {
        schema: {
          params: PoliticianParamsSchema,
          response: { 200: CommitteeListResponseSchema },
        },
      },
      async (request, reply) => {
        const { slug } = request.params

        const result = await deps.committeeService.findByPoliticianSlug({ slug })

        void reply.header('Cache-Control', 'public, max-age=300, s-maxage=3600')

        return result
      },
    )
  }
}
