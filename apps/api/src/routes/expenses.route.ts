import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import type { ExpenseService } from '../services/expense.service.js'
import {
  PoliticianParamsSchema,
  ExpenseListQuerySchema,
  ExpenseListResponseSchema,
  type PoliticianParams,
  type ExpenseListQuery,
} from '../schemas/expense.schema.js'

export function createExpensesRoute(config: { expenseService: ExpenseService }): FastifyPluginAsyncTypebox {
  // eslint-disable-next-line @typescript-eslint/require-await
  return async (app) => {
    app.get<{ Params: PoliticianParams; Querystring: ExpenseListQuery }>(
      '/politicians/:slug/expenses',
      {
        schema: {
          params: PoliticianParamsSchema,
          querystring: ExpenseListQuerySchema,
          response: {
            200: ExpenseListResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const { slug } = request.params
        const { limit = 20, cursor } = request.query

        const result = await config.expenseService.findByPoliticianSlug({ slug, cursor, limit })

        void reply.header('Cache-Control', 'public, max-age=300, s-maxage=3600')
        return result
      },
    )
  }
}
