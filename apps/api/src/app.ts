import Fastify from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { createPublicDb } from '@pah/db/clients'
import { createPoliticianRepository } from './repositories/politician.repository.js'
import { createPoliticianService } from './services/politician.service.js'
import { createPoliticiansRoute } from './routes/politicians.route.js'
import { createBillRepository } from './repositories/bill.repository.js'
import { createBillService } from './services/bill.service.js'
import { createBillsRoute } from './routes/bills.route.js'
import { createVoteRepository } from './repositories/vote.repository.js'
import { createVoteService } from './services/vote.service.js'
import { createVotesRoute } from './routes/votes.route.js'
import { errorHandler } from './hooks/error-handler.js'
import { env } from './config/env.js'

/** Fastify application factory — used in tests and by server.ts. */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function buildApp() {
  // exactOptionalPropertyTypes: transport must not be conditionally undefined
  const loggerOptions =
    env.NODE_ENV === 'development'
      ? { level: env.LOG_LEVEL, transport: { target: 'pino-pretty' } }
      : { level: env.LOG_LEVEL }

  const app = Fastify({
    logger: loggerOptions,
  }).withTypeProvider<TypeBoxTypeProvider>()

  // Plugins
  void app.register(cors, {
    origin: ['https://autoridade-politica.com.br', 'http://localhost:3000'],
  })
  void app.register(helmet)
  void app.register(rateLimit, { max: 60, timeWindow: '1 minute' })

  // Dependency injection
  const db = createPublicDb(env.DATABASE_URL_READER)
  const politicianRepository = createPoliticianRepository(db)
  const politicianService = createPoliticianService(politicianRepository)
  const billRepository = createBillRepository(db)
  const billService = createBillService(billRepository)
  const voteRepository = createVoteRepository(db)
  const voteService = createVoteService(voteRepository)

  // Routes
  void app.register(createPoliticiansRoute({ politicianService }), { prefix: '/api/v1' })
  void app.register(createBillsRoute({ billService }), { prefix: '/api/v1' })
  void app.register(createVotesRoute({ voteService }), { prefix: '/api/v1' })

  // Health check (no prefix)
  void app.get(
    '/health',
    {
      schema: {
        response: {
          200: { type: 'object', properties: { status: { type: 'string' } } },
        },
      },
    },
    () => ({ status: 'ok' }),
  )

  app.setErrorHandler(errorHandler)

  return app
}
