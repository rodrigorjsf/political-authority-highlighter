import { config } from 'dotenv'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

// Load environment variables — MUST happen before importing app/env
const __dir = dirname(fileURLToPath(import.meta.url))
// Try .env.local first, then .env in the workspace root
config({ path: resolve(__dir, '../../.env.local'), override: false })
config({ path: resolve(__dir, '../../../.env'), override: false })

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
