import { defineConfig } from 'drizzle-kit'
import { config } from 'dotenv'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

// Load .env.local if it exists (development only)
const __dir = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dir, '../../.env.local') })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL environment variable is required. ' +
    'Set it in .env.local or pass it as an environment variable.',
  )
}

export default defineConfig({
  schema: ['./src/public-schema.ts', './src/internal-schema.ts'],
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
})
