import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { SourceListResponseSchema } from '../schemas/source.schema.js'
import type { SourceService } from '../services/source.service.js'

interface RouteDeps {
  sourceService: SourceService
}

export function createSourcesRoute(deps: RouteDeps): FastifyPluginAsyncTypebox {
  // eslint-disable-next-line @typescript-eslint/require-await
  return async (app) => {
    app.get(
      '/sources',
      {
        schema: { response: { 200: SourceListResponseSchema } },
      },
      async (_request, reply) => {
        const result = await deps.sourceService.findAll()
        void reply.header('Cache-Control', 'public, max-age=60, s-maxage=300')
        return result
      },
    )
  }
}
