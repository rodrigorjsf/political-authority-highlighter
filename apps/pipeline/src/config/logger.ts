import pino from 'pino'
import { env } from './env.js'

// exactOptionalPropertyTypes: transport must not be conditionally undefined
const loggerOptions =
  env.NODE_ENV === 'development'
    ? { level: env.LOG_LEVEL, transport: { target: 'pino-pretty' } }
    : { level: env.LOG_LEVEL }

/** Pipeline-wide Pino logger instance. */
export const logger = pino(loggerOptions)
