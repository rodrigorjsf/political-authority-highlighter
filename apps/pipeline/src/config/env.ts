import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DATABASE_URL_WRITER: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  TRANSPARENCIA_API_KEY: z.string(),
  CPF_ENCRYPTION_KEY: z.string().regex(/^[0-9a-f]{64}$/), // 32 bytes hex-encoded
  EMAIL_ENCRYPTION_KEY: z.string().regex(/^[0-9a-f]{64}$/), // 32 bytes hex-encoded (RF-POST-002)
  RESEND_API_KEY: z.string().min(1), // RF-POST-002: transactional email
  ALERTS_FROM_EMAIL: z.string().email(), // RF-POST-002: sender address
  API_BASE_URL: z.string().url().default('http://localhost:3001'), // RF-POST-002: for unsubscribe URLs
  VERCEL_REVALIDATE_TOKEN: z.string().optional(),
  CRON_SCHEDULE_CAMARA: z.string().default('0 2 * * *'),
  CRON_SCHEDULE_SENADO: z.string().default('0 3 * * *'),
  CRON_SCHEDULE_TRANSPARENCIA: z.string().default('0 4 * * *'),
  CRON_SCHEDULE_TSE: z.string().default('0 5 * * 0'),
  CRON_SCHEDULE_TCU: z.string().default('0 6 * * *'),
  CRON_SCHEDULE_CGU: z.string().default('0 7 * * *'),
})

/**
 * Validated environment variables — fails fast at startup if missing.
 * All pipeline config comes from here. Never read process.env directly elsewhere.
 */
export const env = envSchema.parse(process.env)
