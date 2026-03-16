import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL_READER: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),
  RESEND_API_KEY: z.string().min(1), // RF-POST-002: transactional email
  EMAIL_ENCRYPTION_KEY: z.string().regex(/^[0-9a-f]{64}$/), // 32 bytes hex-encoded (RF-POST-002)
  ALERTS_FROM_EMAIL: z.string().email(), // RF-POST-002: sender address
  API_BASE_URL: z.string().url().default('http://localhost:3001'), // RF-POST-002: for confirmation URLs
})

/**
 * Validated environment variables — fails fast at startup if missing.
 * All API config comes from here. Never read process.env directly elsewhere.
 */
export const env = envSchema.parse(process.env)
