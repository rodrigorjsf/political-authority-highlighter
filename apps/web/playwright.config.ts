import { defineConfig, devices } from '@playwright/test'

const BASE_URL = `http://localhost:3000`
const isCI = Boolean(process.env.CI)

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  ...(isCI ? { workers: 1 } : {}),
  reporter: isCI ? 'github' : 'html',
  use: { baseURL: BASE_URL, trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: isCI
      ? 'pnpm --filter @pah/web build && pnpm --filter @pah/web start'
      : 'pnpm --filter @pah/web dev',
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: isCI ? 180_000 : 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
