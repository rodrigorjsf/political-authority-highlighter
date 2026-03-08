# @pah/web

Modern React frontend for the Political Authority Highlighter. Built with **Next.js 15 (App Router)**, **React 19**, and **Tailwind CSS 4**.

## Features

- **Server-First Architecture**: 95% of the UI rendered via React Server Components (RSC) for zero-JS interactivity and LCP < 1.0s.
- **URL as State**: All filters, search queries, and pagination cursors are stored in the URL search parameters. No client-side state library needed.
- **Political Neutrality (DR-002)**: Design system based on a neutral palette (grays, blues, whites) without party branding or qualitative "good/bad" labels.
- **On-Demand Revalidation (ISR)**: Static pages for politicians with 1-hour revalidation and support for on-demand revalidation via webhooks.
- **Accessibility (WCAG 2.1 AA)**: Semantic HTML, keyboard-navigable interactive elements, and color contrast adherence.
- **Modern Styling**: Tailwind CSS 4 and **shadcn/ui** for a clean, accessible, and responsive design system.

## Performance Targets

- **LCP (Largest Contentful Paint)**: < 2.0s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1
- **First Load JS**: < 100KB

## Structure

```
src/
├── app/                  # Next.js App Router (pages, layouts, API routes)
├── components/           # UI primitives (shadcn) and domain components
├── lib/                  # API client, SEO helpers, and shared utilities
├── styles/               # Global CSS and Tailwind directives
└── e2e/                  # Playwright end-to-end tests
```

## Workflows

### Development

```bash
pnpm dev              # Start Next.js development server
pnpm build            # Build project for production
pnpm lint             # Run ESLint
pnpm test             # Run unit tests (Vitest)
pnpm test:e2e         # Run Playwright E2E tests
```

### Type Checking

```bash
pnpm typecheck
```

## Environment Variables

- `NEXT_PUBLIC_API_URL`: Backend API base URL.
- `VERCEL_REVALIDATE_TOKEN`: Secret token for ISR on-demand revalidation.
