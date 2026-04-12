# Frontend Development Guide -- Political Authority Highlighter

Stack: Next.js 15 (App Router) | React 19 | Tailwind CSS 4 | shadcn/ui

## Core Principles

1. **Server Components by Default**: Every component is a Server Component unless it needs browser interactivity (`useState`, event handlers, browser APIs). Mark `'use client'` only when strictly necessary. Push client boundaries as far down the tree as possible.

2. **URL as State**: Filters, search, pagination cursors stored in URL search params. No Redux, Zustand, Jotai. `searchParams` is a `Promise` in Next.js 15 — always `await params` and `await searchParams`.

3. **Political Neutrality (DR-002)**: No party colors. Neutral blue palette. Scores as numbers (72/100) only. No qualitative labels ("good," "corrupt"). See `docs/prd/frontend_design_prd.md` for design tokens.

4. **Accessibility First (WCAG 2.1 AA)**: Semantic HTML over div soup. All interactive elements keyboard-navigable. Color contrast >= 4.5:1. `aria-label` on icon-only buttons.

5. **Mobile-First**: Tailwind breakpoints from 320px. Touch targets >= 44x44px. No horizontal scroll.

6. **Frontend Design PRD Compliance (Non-Negotiable)**: All UI work in `apps/web/` must comply with `docs/prd/frontend_design_prd.md`. Run the `web-frontend-design` skill checklist before every UI PR.

## Architecture Boundaries

**IS responsible for**: Rendering politician profiles/scores/rankings, SEO metadata + JSON-LD, URL-based filter state, calling backend API via typed fetch wrapper, ISR for politician pages, accessibility, Core Web Vitals.

**NOT responsible for**: Data fetching from government sources, score calculation, database access, user authentication, data mutation (read-only).

**Depends on**: `apps/api/` via `/api/v1/*`, `packages/shared` (types, utilities)
**Must NOT import**: `packages/db`, `apps/api`, `apps/pipeline`

## File Conventions

| File Type | Pattern | Example |
|-----------|---------|---------|
| Page | `page.tsx` | `app/politicos/page.tsx` |
| Server Component | `kebab-case.tsx` | `politician-card.tsx` |
| Client Component | `kebab-case.tsx` + `'use client'` | `search-bar.tsx` |
| Utility | `kebab-case.ts` | `api-client.ts` |
| Unit test | `*.test.tsx` co-located | `score-badge.test.tsx` |
| E2E test | `e2e/*.spec.ts` | `politician-search.spec.ts` |
| CSS module | Not used — Tailwind only | — |

Key directories: `src/app/` (pages), `src/components/ui/` (shadcn primitives), `src/components/politician/`, `src/components/filters/`, `src/lib/` (api-client, seo, utils), `e2e/`

## Code Standards

**Formatting**: No semicolons, single quotes, 2-space indent, trailing commas (Prettier-enforced).

**No `useEffect` for data** that can be fetched in a Server Component. This is the most common mistake.

**ISR pattern**: `export const revalidate = 3600` + `generateStaticParams()` for politician pages. `searchParams` is `Promise<{ [key: string]: string | string[] | undefined }>` — await it.

**API client**: Use `apiFetch<T>()` in `src/lib/api-client.ts`. Set `next: { revalidate, tags }` for ISR cache tags. Wrap errors in `ApiError` (RFC 7807).

**React `cache()`**: Use for deduplicating fetch calls across components in the same render.

**JSON-LD script injection**: Use `JSON.stringify(obj).replace(/</g, '\\u003c')` to prevent XSS via `</script>` injection. The `react/no-danger` ESLint rule is NOT configured — do not add disable comments for it.

**Comments policy**: Don't comment what JSX renders. Do comment: accessibility decisions, ISR strategies, political neutrality enforcement.

## UI Conventions

**Color**: Use CSS custom properties from `globals.css`. No party colors ever. Score visualization uses single-hue gradient (light to dark blue) or neutral gray. `--destructive` is for form errors only, never for politicians.

**Tailwind**: Use `cn()` helper (from shadcn/ui `lib/utils`) for conditional class merging. No custom CSS except `@layer` extensions in `globals.css`.

**shadcn/ui**: Install via `npx shadcn@latest add <component>`. Import from local `components/ui/`, never from `@shadcn/ui` directly.

**Score display**: Numerical only (`72/100`). Progress bars with `role="progressbar"` and `aria-valuenow/min/max`. No qualitative labels.

**Silent exclusion (DR-001)**: When `exclusionFlag` is true, render only: "Information from public anti-corruption databases affected this component of the score." No source, record ID, or date.

**Dark mode**: CSS vars with `@media prefers-color-scheme` + `[data-theme]` attribute. Inline ThemeScript in root layout prevents FOUC. `localStorage` key: `'pah-theme'`.

**Fonts**: `next/font/google` — Inter (`--font-inter`) + JetBrains Mono (`--font-jetbrains-mono`).

## State Management

No client-side state libraries. URL search params are the source of truth. Filter components read `useSearchParams()` and push to `useRouter()`. Always `params.delete('cursor')` when changing filters.

## Performance Targets

| Metric | Target | Strategy |
|--------|--------|---------|
| LCP | < 2.0s | Server Components, ISR, Cloudflare CDN |
| INP | < 100ms | Minimal client JS |
| CLS | < 0.1 | Fixed image dimensions, skeleton loaders |
| Bundle | < 100KB JS | Dynamic imports for charts (`next/dynamic + ssr: false`) |

Use `next/image` for all images (prevents CLS). Use `next/font` for fonts. No barrel exports (prevents tree-shaking).

## Testing

```bash
pnpm --filter @pah/web test       # Vitest + RTL unit tests
pnpm --filter @pah/web test:e2e   # Playwright E2E + visual regression (WEB_PORT=3001 in Claude sessions)
```

**Visual regression**: 30 baselines committed in `e2e/__snapshots__/`. Spec uses `page.route()` mocks — no DB/API needed. Naming: `{page}-{viewport}-{theme}-chromium-linux.png`.

**`localStorage` in jsdom**: Use `vi.stubGlobal('localStorage', createLocalStorageMock())` in `beforeEach` — jsdom's localStorage is non-standard.

**Async Server Components**: Call as async function then `render(await MyPage())`.

## Security Baseline

- Search queries: trim + limit to 100 chars before sending to API
- Only `NEXT_PUBLIC_API_URL` uses `NEXT_PUBLIC_` prefix
- `server-only` guard on `packages/db/` — build fails if frontend imports DB modules
- CI post-build scan: checks `.next/static/chunks/` for `drizzle-orm`, `DATABASE_URL`, `CPF_ENCRYPTION_KEY`
- Error boundaries: show generic messages only, use `digest` for server-side correlation
- CSP configured in `next.config.ts` headers (DR-008)

## Dependency Rules

**Allowed**: `next`, `react`, `react-dom`, tailwindcss stack, `@radix-ui/*` via shadcn/ui, `lucide-react`, `recharts` (dynamic import only), `vitest`, `@testing-library/react`, `playwright`, `@axe-core/playwright`, `packages/shared`

**Banned**: CSS-in-JS (styled-components, emotion), client state (Redux, Zustand, Jotai, Recoil), form libraries (no forms in MVP), animation libraries without `prefers-reduced-motion` handling

## What NEVER to Do

| Anti-Pattern | Why Prohibited |
|---|---|
| `useEffect` for data fetchable on server | Slower load, no SEO, unnecessary client JS |
| Party colors in UI | DR-002 political neutrality |
| Qualitative score labels ("good," "corrupt") | DR-002 |
| Import from `packages/db/` | Frontend accesses data through API only |
| `'use client'` without need | Increases bundle, disables SSR |
| `any` type | Use proper TypeScript types |
| Barrel exports (`index.ts` re-exporting all) | Prevents tree-shaking |
| `<img>` instead of `next/image` | Misses optimization, causes CLS |
| Hardcode API URLs | Use `NEXT_PUBLIC_API_URL` |
| Skip `alt` text | WCAG 2.1 AA violation |
| Client state libraries (Redux, Zustand) | URL search params are state management |
| Expose exclusion record details | DR-001 silent exclusion |
| Raw HTML injection outside JSON-LD | XSS risk; JSON-LD requires `.replace(/</g, '\\u003c')` |
| Skip `loading.tsx` for async pages | Poor UX, CLS |
| Implement UI without reading design PRD | Visual inconsistencies with design system |
