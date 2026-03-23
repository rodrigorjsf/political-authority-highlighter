import { test, expect, type Page } from '@playwright/test'

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1920, height: 1080 },
] as const

const PAGES = [
  { name: 'home', path: '/' },
  { name: 'listing', path: '/politicos' },
  { name: 'methodology', path: '/metodologia' },
  { name: 'sources', path: '/fontes' },
  { name: 'profile', path: '/politicos/ana-lima-sp' },
] as const

const THEMES = ['light', 'dark'] as const

// ---------------------------------------------------------------------------
// Deterministic mock data — keeps baselines stable regardless of DB state
// ---------------------------------------------------------------------------
const MOCK_POLITICIAN_CARD = {
  id: '11111111-0000-0000-0000-000000000001',
  slug: 'ana-lima-sp',
  name: 'Ana Lima',
  party: 'PSD',
  state: 'SP',
  role: 'deputado_federal',
  photoUrl: null,
  tenureStartDate: '2019-02-01',
  overallScore: 75,
}

const MOCK_LIST_RESPONSE = { data: [MOCK_POLITICIAN_CARD], cursor: null }

const MOCK_PROFILE_RESPONSE = {
  ...MOCK_POLITICIAN_CARD,
  bioSummary: 'Deputada Federal pelo estado de São Paulo.',
  transparencyScore: 20,
  legislativeScore: 18,
  financialScore: 22,
  anticorruptionScore: 15,
  exclusionFlag: false,
  methodologyVersion: 'v1.0',
}

const MOCK_SOURCES_RESPONSE = {
  data: [
    { source: 'camara', lastSyncAt: '2024-01-15T10:00:00Z', recordCount: 513, status: 'synced', updatedAt: '2024-01-15T10:00:00Z' },
    { source: 'senado', lastSyncAt: '2024-01-15T10:00:00Z', recordCount: 81, status: 'synced', updatedAt: '2024-01-15T10:00:00Z' },
    { source: 'transparencia', lastSyncAt: '2024-01-15T10:00:00Z', recordCount: 594, status: 'synced', updatedAt: '2024-01-15T10:00:00Z' },
    { source: 'tse', lastSyncAt: '2024-01-14T08:00:00Z', recordCount: 594, status: 'synced', updatedAt: '2024-01-14T08:00:00Z' },
    { source: 'tcu', lastSyncAt: '2024-01-13T06:00:00Z', recordCount: 2, status: 'synced', updatedAt: '2024-01-13T06:00:00Z' },
    { source: 'cgu', lastSyncAt: '2024-01-12T04:00:00Z', recordCount: 0, status: 'synced', updatedAt: '2024-01-12T04:00:00Z' },
  ],
}

// Intercept client-side API calls made during navigation. SSR fetches from
// Server Components are handled by the mock API server started in playwright.config.ts
// (page.route only intercepts browser-level requests, not Node.js server requests).
async function mockApiRoutes(page: Page): Promise<void> {
  await page.route('**/api/v1/politicians/ana-lima-sp', (route) =>
    route.fulfill({ json: MOCK_PROFILE_RESPONSE }),
  )
  await page.route('**/api/v1/politicians**', (route) =>
    route.fulfill({ json: MOCK_LIST_RESPONSE }),
  )
  await page.route('**/api/v1/sources**', (route) =>
    route.fulfill({ json: MOCK_SOURCES_RESPONSE }),
  )
}

for (const viewport of VIEWPORTS) {
  for (const theme of THEMES) {
    test.describe(`Visual Regression — ${viewport.name} / ${theme}`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } })

      test.beforeEach(async ({ page }) => {
        // Intercept client-side API calls (SSR is handled by the mock API server).
        await mockApiRoutes(page)
        // Disable CSS animations so screenshots are never captured mid-transition.
        await page.emulateMedia({ reducedMotion: 'reduce' })
        // Pre-seed localStorage so ThemeScript picks up the correct theme before hydration.
        // ThemeScript reads 'pah-theme' and sets data-theme on <html> before React mounts.
        await page.addInitScript((t: string) => {
          localStorage.setItem('pah-theme', t)
        }, theme)
      })

      for (const pg of PAGES) {
        test(pg.name, async ({ page }) => {
          await page.goto(pg.path)
          await page.waitForLoadState('networkidle')
          await expect(page).toHaveScreenshot(
            `${pg.name}-${viewport.name}-${theme}.png`,
            { maxDiffPixelRatio: 0.02, fullPage: true },
          )
        })
      }
    })
  }
}
