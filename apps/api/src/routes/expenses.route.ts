import type { FastifyInstance } from 'fastify'
import type { ExpenseService } from '../services/expense.service.js'
import {
  PoliticianParamsSchema,
  ExpenseListQuerySchema,
  ExpenseListResponseSchema,
} from '../schemas/expense.schema.js'

export function createExpensesRoute(config: { expenseService: ExpenseService }) {
  return async (app: FastifyInstance) => {
    app.get<{
      Params: { slug: string }
      Querystring: { cursor?: string; limit?: string }
    }>(
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
      // eslint-disable-next-line require-await
      async (request, reply) => {
        const limit = request.query.limit ?? 20
        const result = await config.expenseService.findByPoliticianSlug(
          request.params.slug,
          request.query.cursor,
          limit,
        )

        reply.header('Cache-Control', 'public, max-age=300, s-maxage=3600')
        return result
      },
    )
  }
}
