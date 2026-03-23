# Phase 8: Visual Regression — RF-018

**PRD**: `.claude/PRPs/prds/rf-018-frontend-complete-redesign.prd.md`
**Phase**: #8 — Visual Regression
**Output plan**: `.claude/PRPs/plans/rf-018-phase8-visual-regression.plan.md`

## Problem

30 baseline screenshots do not yet exist. Any design change — intentional or accidental — can silently break the visual identity. CI has no visual gate.

## User Story

As a PAH developer,
I want 30 automated visual regression baselines (5 pages × 3 viewports × 2 themes),
So that design changes are detected and reviewed before merge.

## Feature Type / Complexity

NEW_CAPABILITY / MEDIUM

## Depends On

- Phase 6 ✓ (all pages finalized, tokens applied, nav built)
- Phase 7 ✓ (local stack documented, `TESTING.md` exists)

## Parallel With

Phase 9 (A11y Enhancement) — different spec file, no shared state

---

## Codebase Patterns Discovered

| Category | File:Lines | Pattern | Code Snippet |
|----------|-----------|---------|-------------|
| PLAYWRIGHT CONFIG | `apps/web/playwright.config.ts:1-20` | `defineConfig`, single `chromium` project, `reuseExistingServer: !isCI` | `projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]` |
| E2E SPEC PATTERN | `apps/web/e2e/accessibility.spec.ts:1-15` | `@playwright/test` + `AxeBuilder`, `page.goto` + `checkA11y(page, testInfo)` | `import { test, expect, type Page } from '@playwright/test'` |
| E2E SPEC PATTERN | `apps/web/e2e/politician-listing.spec.ts:1-8` | Nested `test.describe`, `page.goto`, `waitForLoadState` implicit via assertions | `test.describe('Politician Listing Page', () => {` |
| DARK MODE ATTR | `apps/web/src/styles/tokens.css:58-60` | `[data-theme="dark"]` on `document.documentElement` sets dark CSS vars | `[data-theme="dark"] { --color-background: #0B0E14; ... }` |
| THEME SCRIPT | `apps/web/src/components/theme-script.tsx:3-12` | Reads `localStorage.getItem('pah-theme')` → sets `data-theme` before hydration | `var stored = localStorage.getItem('pah-theme')` |
| TEST SCRIPTS | `apps/web/package.json:scripts` | `"test:e2e": "playwright test e2e"` | `pnpm --filter @pah/web test:e2e` |
| SEED SLUG | `supabase/seed.sql:7` | Profile page test slug | `'ana-lima-sp'` (politician with all score data) |
| SNAPSHOT DOCS | `TESTING.md:~120` | Placeholder section awaiting Phase 8 | `apps/web/e2e/__snapshots__/` referenced as target dir |
| ANIMATION TOKENS | `apps/web/src/styles/globals.css:17-23` | `prefers-reduced-motion: reduce` disables all CSS transitions | `animation-duration: 0.01ms !important` |
| PAGE FADE | `apps/web/src/app/metodologia/page.tsx` | `motion-safe:animate-page-in` on `<main>` | `className="motion-safe:animate-page-in"` |

## Integration Points

- **Theme pre-seeding**: Use `page.addInitScript((t) => localStorage.setItem('pah-theme', t), theme)` before `page.goto()`. ThemeScript reads localStorage on load and sets `data-theme` attribute → CSS vars switch.
- **Reduced motion**: Use `test.use({ reducedMotion: 'reduce' })` inside each `describe` block. This emulates `prefers-reduced-motion: reduce`, triggering globals.css to disable all animations — no mid-transition screenshots.
- **Network idle**: `page.waitForLoadState('networkidle')` ensures fonts, images, and API data are loaded before capture.
- **Profile page**: Requires seeded DB (`ana-lima-sp` is in `supabase/seed.sql`). Local stack (supabase + API + web) must be running.
- **Playwright snapshot storage**: Playwright 1.44 supports top-level `snapshotDir` config. Set to `'./e2e/__snapshots__'` so all baselines land in `apps/web/e2e/__snapshots__/`.
- **CI**: Phase 10 adds E2E to CI; Phase 8 only generates local baselines and commits them.

## Data Flow

```
test.addInitScript('pah-theme') → page.goto()
  → ThemeScript (reads localStorage → sets data-theme attr)
  → CSS vars switch (light|dark tokens)
  → page.waitForLoadState('networkidle')
  → reducedMotion: 'reduce' (animations disabled)
  → expect(page).toHaveScreenshot('name.png', { maxDiffPixelRatio: 0.02, fullPage: true })
  → first run: creates baseline in __snapshots__/
  → subsequent runs: diffs against baseline, fails if > 2% pixels differ
```

## Pages × Viewports × Themes

```
5 pages × 3 viewports × 2 themes = 30 screenshots

Pages:
  home        → /
  listing     → /politicos
  methodology → /metodologia
  sources     → /fontes
  profile     → /politicos/ana-lima-sp  (requires seeded DB)

Viewports:
  mobile   → 375 × 667
  tablet   → 768 × 1024
  desktop  → 1920 × 1080

Themes:
  light  (default)
  dark   (data-theme="dark" via localStorage pre-seed)

Snapshot names:
  {page}-{viewport}-{theme}-chromium.png
  e.g.: home-mobile-light-chromium.png
```

---

## Tasks

### Task 1: UPDATE `apps/web/playwright.config.ts`

- **ACTION**: ADD `snapshotDir` configuration
- **WHAT**: Add `snapshotDir: './e2e/__snapshots__'` to `defineConfig` options
- **MIRROR**: `apps/web/playwright.config.ts:1-20` — add one field to existing config object
- **GOTCHA**: `snapshotDir` is relative to the config file location (`apps/web/`), not the project root
- **VALIDATE**: `npx tsc --noEmit` inside `apps/web/` passes (config is typed)

```typescript
// Add inside defineConfig({...}):
snapshotDir: './e2e/__snapshots__',
```

### Task 2: CREATE `apps/web/e2e/visual-regression.spec.ts`

- **ACTION**: CREATE new spec file with 30 screenshot tests
- **MIRROR**: `apps/web/e2e/accessibility.spec.ts:1-8` — same import pattern, same `test.describe` structure
- **IMPORTS**: `import { test, expect } from '@playwright/test'`
- **PATTERN**: Nested loops (viewport → theme → page), `test.use()` per describe, `addInitScript` for theme, `toHaveScreenshot` for assertion

Full spec content:

```typescript
import { test, expect } from '@playwright/test'

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

for (const viewport of VIEWPORTS) {
  for (const theme of THEMES) {
    test.describe(`Visual Regression — ${viewport.name} / ${theme}`, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
        reducedMotion: 'reduce',
      })

      test.beforeEach(async ({ page }) => {
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
```

- **GOTCHA 1**: `test.use()` must be called at the TOP of `test.describe()` block, before any `test.beforeEach` or `test()` calls
- **GOTCHA 2**: `addInitScript` callback receives a serialized arg — the `theme` variable is passed as second arg and is typed `string` in the callback, not `'light' | 'dark'`
- **GOTCHA 3**: `reducedMotion: 'reduce'` is a valid Playwright `BrowserContextOptions` field (available since Playwright 1.12). This triggers `prefers-reduced-motion: reduce`, which disables all CSS transitions/animations via `globals.css:17-23`
- **VALIDATE**: `pnpm --filter @pah/web typecheck` passes (no TypeScript errors in spec file)

### Task 3: GENERATE baselines locally

- **PREREQUISITE**: Full local stack must be running:
  1. `pnpm dev:db` (supabase start, wait for "Started")
  2. `pnpm dev:api` (Fastify on :3001)
  3. `pnpm dev:web` (Next.js on :3000, in separate terminal OR let Playwright start it)
- **ACTION**: Run update-snapshots command to generate 30 baselines:

```bash
pnpm --filter @pah/web test:e2e -- --update-snapshots
```

- **EXPECTED OUTPUT**: 30 screenshot files created in `apps/web/e2e/__snapshots__/`
- **VERIFY**: `ls apps/web/e2e/__snapshots__/ | wc -l` should show 30+ files
- **GOTCHA**: First run generates baselines (no diffs). If a page shows 404 or error state, the baseline captures that error state — ensure full stack is running BEFORE generating baselines.
- **VALIDATE**: All 30 tests pass without errors (exit 0)

### Task 4: VERIFY zero diffs on re-run

- **ACTION**: Run tests again WITHOUT `--update-snapshots`:

```bash
pnpm --filter @pah/web test:e2e -- visual-regression
```

- **EXPECTED**: All 30 tests PASS (exit 0, 0 diffs reported)
- **IF FAILURES**: Check for flaky animations — ensure `reducedMotion: 'reduce'` is working. If specific pages show diffs, re-generate only that snapshot with `--update-snapshots` and verify the page looks correct visually.
- **VALIDATE**: Exit 0, all 30 assertions green

### Task 5: UPDATE `TESTING.md` — Snapshot workflow section

- **ACTION**: Expand the existing placeholder section (line ~120) in `TESTING.md`
- **WHAT**: Replace the 3-line placeholder with a full snapshot management workflow
- **CONTENT to add**:

```markdown
## Visual Regression Tests

### Running baselines (Phase 8+)

Visual regression tests compare page screenshots against stored baselines.

**Prerequisites**: Full local stack must be running (see 3-Terminal Workflow above).

#### Generate new baselines (first time or after intentional design changes)

```bash
pnpm --filter @pah/web test:e2e -- --update-snapshots
```

This creates/updates 30 screenshots in `apps/web/e2e/__snapshots__/`.
Commit the updated snapshots alongside your design change PR.

#### Run visual regression check (verify no regressions)

```bash
pnpm --filter @pah/web test:e2e -- visual-regression
```

Fails if any page differs by more than 2% pixel ratio from the baseline.

#### When to update snapshots

- After intentional design changes (token updates, component redesigns)
- After `pnpm build` changes the rendered output on any page
- When adding a new page to the visual regression suite

#### Snapshot files

Stored in `apps/web/e2e/__snapshots__/`.
Naming: `{page}-{viewport}-{theme}-chromium.png`
Example: `home-mobile-dark-chromium.png`

Total: 30 files (5 pages × 3 viewports × 2 themes)
```
```

- **VALIDATE**: Markdown renders correctly; no broken links

### Task 6: UPDATE PRD status

- **ACTION**: Edit `.claude/PRPs/prds/rf-018-frontend-complete-redesign.prd.md`
- **WHAT**: In the Implementation Phases table, update Phase 8 row:
  - Status: `pending` → `in-progress`
  - PRP Plan: `-` → `.claude/PRPs/plans/rf-018-phase8-visual-regression.plan.md`
- **VALIDATE**: Table renders correctly in Markdown

---

## Validation Commands

### Level 1: Static Analysis

```bash
pnpm --filter @pah/web typecheck
pnpm --filter @pah/web lint
```

**EXPECT**: Exit 0, no TypeScript errors in `visual-regression.spec.ts`

### Level 2: Generate Baselines (first run)

```bash
# Prerequisites: full stack running (supabase + api + web)
pnpm --filter @pah/web test:e2e -- --update-snapshots
```

**EXPECT**: 30 new files in `apps/web/e2e/__snapshots__/`, exit 0

### Level 3: Zero-Diff Verification

```bash
pnpm --filter @pah/web test:e2e -- visual-regression
```

**EXPECT**: All 30 tests pass, 0 pixel diff reported, exit 0

### Level 4: Snapshot Count

```bash
find apps/web/e2e/__snapshots__ -name "*.png" | wc -l
```

**EXPECT**: 30 (or more if subdirectory naming adds variants)

### Level 5: Full suite regression

```bash
pnpm --filter @pah/web test:e2e
```

**EXPECT**: All existing tests (accessibility + listing + visual-regression) pass, exit 0

---

## Edge Cases

- **Profile 404 during baseline gen**: If API is down when generating baselines, profile page shows 404. Re-generate with full stack running. Check `curl http://localhost:3001/api/v1/politicians/ana-lima-sp` before running.
- **Font rendering diff**: `reducedMotion: 'reduce'` doesn't prevent font rendering differences between runs. The 2% tolerance (`maxDiffPixelRatio: 0.02`) handles minor anti-aliasing variation.
- **`/comparar` page exclusion**: The comparison page is intentionally excluded from visual regression (it's in accessibility tests). Its state depends on URL params.
- **Snapshot directory naming**: Playwright appends `-chromium` to each snapshot name (based on the project name in `playwright.config.ts`). Expected names: `home-mobile-light-chromium.png`.
- **Git LFS**: PRD open question about LFS for snapshots. At 30 PNGs (~100-500KB each = 3–15MB total), Git LFS is not required. Document this decision in TESTING.md.
- **CI visibility**: Playwright HTML report (`reporter: 'html'` in local mode) shows visual diffs side-by-side. Run `npx playwright show-report` to view locally after failures.

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Baselines generated with broken API state | MEDIUM | HIGH | Run `curl :3001/health` and `curl :3001/api/v1/politicians?limit=1` before running `--update-snapshots` |
| Font rendering differs between machines | MEDIUM | MEDIUM | 2% tolerance handles anti-aliasing; add note in TESTING.md: "baselines generated on [OS]" |
| Animation still running at screenshot time | LOW | MEDIUM | `reducedMotion: 'reduce'` + `networkidle` covers all cases; globals.css disables all transitions at `0.01ms` |
| `snapshotDir` config breaks existing `toHaveScreenshot` in other specs | LOW | LOW | No other specs use `toHaveScreenshot`; only `visual-regression.spec.ts` does |
| Profile page ISR cache during test | LOW | LOW | `reuseExistingServer: !isCI` means local dev server is used; ISR doesn't apply in dev mode |

---

## Acceptance Criteria

- [ ] `apps/web/e2e/visual-regression.spec.ts` created with 30 test cases
- [ ] `playwright.config.ts` updated with `snapshotDir: './e2e/__snapshots__'`
- [ ] 30 baseline screenshots generated and committed in `apps/web/e2e/__snapshots__/`
- [ ] Re-run shows 0 diffs (all 30 pass)
- [ ] `TESTING.md` snapshot workflow section filled in with commands and workflow
- [ ] PRD Phase 8 status updated to `in-progress`, plan linked
- [ ] `pnpm typecheck` and `pnpm lint` pass across all packages

---

## Notes

- **Parallel work**: Phase 9 (A11y Enhancement) touches `apps/web/e2e/accessibility.spec.ts` and can run simultaneously in a separate worktree.
- **Baseline OS**: Document on which OS baselines were generated (e.g., "Linux Ubuntu 22.04" in TESTING.md). Baselines generated on macOS will diff against Linux CI. If CI is added in Phase 10, baselines should be regenerated on Linux or snapshots should be skipped in CI (CI only validates no crashes, not pixel-perfect match).
- **Git LFS decision**: Not needed for 30 PNGs (est. <15MB). Revisit if snapshot count grows significantly in future phases.
- **No `comparar` page**: `/comparar` is excluded per PRD (state depends on URL params). A11y covers it separately.
