# @pah/web

Frontend for the Political Authority Highlighter. Built with **Next.js 15**, **React 19**, and **Tailwind CSS 4**.

## Features

- **Server-First** — UI rendered via Server Components (RSC). LCP < 1.0s.
- **URL State** — Filters and pagination stored in URL search parameters.
- **Neutrality** — Neutral palette (grays, blues) without party colors.
- **Dark Mode** — System-aware and user-togglable via `next-themes`.
- **ISR** — Static profiles with 1-hour revalidation.
- **Accessibility** — WCAG 2.1 AA compliant.
- **Modern Styling** — Tailwind CSS 4 and **shadcn/ui**.
- **Analytics** — Plausible (LGPD-compliant, zero cookies).

## Performance

- **LCP:** < 2.0s
- **FID:** < 100ms
- **CLS:** < 0.1
- **First Load JS:** < 100KB

## Structure

```
src/
├── app/        # Pages, layouts, API routes
│   ├── politicos/    # Catalog and politician profiles
│   ├── comparar/     # Politician comparison (/comparar?a=...&b=...)
│   ├── metodologia/  # Scoring methodology
│   └── fontes/       # Data sources
├── components/ # UI primitives and domain components
├── lib/        # API client and SEO helpers
└── e2e/        # Playwright tests
```

## Development

```bash
pnpm dev              # Development server
pnpm build            # Production build
pnpm lint             # Run ESLint
pnpm test             # Run unit tests
pnpm test:e2e         # Run Playwright E2E tests
```

## Config

- `NEXT_PUBLIC_API_URL` — Backend API URL.
- `VERCEL_REVALIDATE_TOKEN` — ISR revalidation secret.
- `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` — Plausible analytics domain (optional).
