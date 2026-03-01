import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL_READER: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),
})

/**
 * Validated environment variables — fails fast at startup if missing.
 * All API config comes from here. Never read process.env directly elsewhere.
 */
export const env = envSchema.parse(process.env)
