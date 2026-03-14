import 'server-only'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as publicSchema from './public-schema.js'
import * as internalSchema from './internal-schema.js'

/**
 * Public database client — connects with api_reader role (SELECT only on public schema).
 * Used by apps/api exclusively.
 * @param connectionString Database connection string. Use Pooler URL (port 6543) for serverless.
 * @param usePooling Set to true for Supavisor/PgBouncer (Transaction mode).
 */
export function createPublicDb(
  connectionString: string,
  usePooling = false,
): ReturnType<typeof drizzle> {
  const client = postgres(connectionString, { prepare: !usePooling })
  return drizzle(client, { schema: publicSchema })
}

export type PublicDb = ReturnType<typeof createPublicDb>

/**
 * Pipeline database client — connects with pipeline_admin role (ALL on both schemas).
 * Used by apps/pipeline exclusively.
 * @param connectionString Database connection string. Use Direct URL (port 5432) for long-running jobs.
 * @param usePooling Set to true for Supavisor/PgBouncer (Transaction mode).
 */
export function createPipelineDb(
  connectionString: string,
  usePooling = false,
): ReturnType<typeof drizzle> {
  const client = postgres(connectionString, { prepare: !usePooling })
  return drizzle(client, { schema: { ...publicSchema, ...internalSchema } })
}

export type PipelineDb = ReturnType<typeof createPipelineDb>
