import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import {
  PoliticianParamsSchema,
  BillListQuerySchema,
  BillListResponseSchema,
  type PoliticianParams,
  type BillListQuery,
} from '../schemas/bill.schema.js'
import type { BillService } from '../services/bill.service.js'

interface RouteDeps {
  billService: BillService
}

export function createBillsRoute(deps: RouteDeps): FastifyPluginAsyncTypebox {
  // eslint-disable-next-line @typescript-eslint/require-await
  return async (app) => {
    app.get<{ Params: PoliticianParams; Querystring: BillListQuery }>(
      '/politicians/:slug/bills',
      {
        schema: {
          params: PoliticianParamsSchema,
          querystring: BillListQuerySchema,
          response: { 200: BillListResponseSchema },
        },
      },
      async (request, reply) => {
        const { slug } = request.params
        const { limit = 20, cursor } = request.query

        const result = await deps.billService.findByPoliticianSlug(slug, {
          limit,
          cursor,
        })

        void reply.header('Cache-Control', 'public, max-age=300, s-maxage=3600')

        return result
      },
    )
  }
}
