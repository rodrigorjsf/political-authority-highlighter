import { defineConfig, devices } from '@playwright/test'

const PORT = process.env['WEB_PORT'] ?? '3000'
const BASE_URL = `http://localhost:${PORT}`
const isCI = Boolean(process.env.CI)

export default defineConfig({
  testDir: './e2e',
  snapshotDir: './e2e/__snapshots__',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  ...(isCI ? { workers: 1 } : {}),
  reporter: isCI ? 'github' : 'html',
  use: { baseURL: BASE_URL, trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    // Mock API server must start before Next.js so SSR fetches resolve deterministically.
    // Server Components fetch from NEXT_PUBLIC_API_URL at runtime (not baked at build time
    // for server-side code), so localhost:3001 resolves to this mock in CI.
    {
      command: 'node e2e/mock-api-server.mjs',
      url: 'http://localhost:3001/health',
      reuseExistingServer: !isCI,
      timeout: 15_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: isCI
        ? `pnpm --filter @pah/web build && PORT=${PORT} pnpm --filter @pah/web start`
        : `npx next dev -p ${PORT}`,
      url: BASE_URL,
      reuseExistingServer: !isCI,
      timeout: isCI ? 180_000 : 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
})
