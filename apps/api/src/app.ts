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
import { createExpenseRepository } from './repositories/expense.repository.js'
import { createExpenseService } from './services/expense.service.js'
import { createExpensesRoute } from './routes/expenses.route.js'
import { createProposalRepository } from './repositories/proposal.repository.js'
import { createProposalService } from './services/proposal.service.js'
import { createProposalsRoute } from './routes/proposals.route.js'
import { createCommitteeRepository } from './repositories/committee.repository.js'
import { createCommitteeService } from './services/committee.service.js'
import { createCommitteesRoute } from './routes/committees.route.js'
import { createSourceRepository } from './repositories/source.repository.js'
import { createSourceService } from './services/source.service.js'
import { createSourcesRoute } from './routes/sources.route.js'
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
  // Use pooling (Transaction mode) if port 6543 is detected (Supabase/Supavisor)
  const usePooling = env.DATABASE_URL_READER.includes(':6543')
  const db = createPublicDb(env.DATABASE_URL_READER, usePooling)
  const politicianRepository = createPoliticianRepository(db)
  const politicianService = createPoliticianService(politicianRepository)
  const billRepository = createBillRepository(db)
  const expenseRepository = createExpenseRepository(db)
  const expenseService = createExpenseService(expenseRepository)
  const billService = createBillService(billRepository)
  const voteRepository = createVoteRepository(db)
  const voteService = createVoteService(voteRepository)
  const proposalRepository = createProposalRepository(db)
  const proposalService = createProposalService(proposalRepository)
  const committeeRepository = createCommitteeRepository(db)
  const committeeService = createCommitteeService(committeeRepository)
  const sourceRepository = createSourceRepository(db)
  const sourceService = createSourceService(sourceRepository)

  void app.register(createExpensesRoute({ expenseService }), { prefix: '/api/v1' })
  // Routes
  void app.register(createPoliticiansRoute({ politicianService }), { prefix: '/api/v1' })
  void app.register(createBillsRoute({ billService }), { prefix: '/api/v1' })
  void app.register(createVotesRoute({ voteService }), { prefix: '/api/v1' })
  void app.register(createProposalsRoute({ proposalService }), { prefix: '/api/v1' })
  void app.register(createCommitteesRoute({ committeeService }), { prefix: '/api/v1' })
  void app.register(createSourcesRoute({ sourceService }), { prefix: '/api/v1' })

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
