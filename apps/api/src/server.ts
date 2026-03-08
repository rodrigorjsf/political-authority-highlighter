import { config } from 'dotenv'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

// Load .env.local if it exists (development only) — MUST happen before importing app/env
const __dir = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dir, '../../.env.local')
config({ path: envPath, override: false })

// Now safe to import modules that read process.env
const { buildApp } = await import('./app.js')
const { env } = await import('./config/env.js')

const app = buildApp()

try {
  await app.listen({ port: env.PORT, host: env.HOST })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
