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
  webServer: {
    command: isCI
      ? 'pnpm --filter @pah/web build && pnpm --filter @pah/web start'
      : `npx next dev -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: isCI ? 180_000 : 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
