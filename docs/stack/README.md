# Stack Documentation

Local reference for library patterns.

| File | Library | Version | Last Updated |
|------|---------|---------|-------------|
| [nextjs-15.md](./nextjs-15.md) | Next.js | ^15.0.0 | 2026-03-01 |
| [nextjs-15-csp.md](./nextjs-15-csp.md) | Security: CSP | — | 2026-03-07 |
| [nextjs-client-bundle-security.md](./nextjs-client-bundle-security.md) | Security: Bundles | — | 2026-03-07 |
| [fastify-5.md](./fastify-5.md) | Fastify | ^5.0.0 | 2026-03-01 |
| [drizzle-orm.md](./drizzle-orm.md) | Drizzle ORM | ^0.36.0 | 2026-03-01 |
| [tailwind-v4-design-tokens-dark-mode.md](./tailwind-v4-design-tokens-dark-mode.md) | Tailwind CSS v4 + next-themes | ^4.0.0 | 2026-03-09 |
| [supabase-best-practices.md](./supabase-best-practices.md) | Supabase CLI + PostgreSQL | — | 2026-03-09 |
| [vercel-cli.md](./vercel-cli.md) | Vercel CLI + Deploy | — | 2026-03-09 |
| [plausible-analytics.md](./plausible-analytics.md) | Plausible Analytics | — | 2026-03-10 |
| [ceap-expenses-rf012.md](./ceap-expenses-rf012.md) | Expenses | — | 2026-03-08 |
| [pipeline-rf013.md](./pipeline-rf013.md) | Pipeline stack (pg-boss, csv-parse, fast-xml-parser, crypto, p-limit, axios-retry) | Multiple | 2026-03-10 |

## Scope

- **Next.js:** `searchParams` Promise, `useSearchParams` Suspense, ISR/tags, Vitest mocking.
- **Fastify:** TypeBox integration, async plugins, RFC 7807 errors, CORS.
- **Drizzle:** Dual-schema, cursor pagination, migrations, upserts.
- **Tailwind v4:** Design tokens, dark mode with `next-themes`, `@theme inline`, CSS custom properties.
- **Supabase:** CLI local stack, migration flow (Drizzle → supabase/migrations), roles, pooling.
- **Vercel:** Build validation, ISR revalidation, environment variables.
- **Analytics:** Plausible self-hosted patterns, LGPD-compliant event tracking.
- **Security:** CSP headers, `server-only` guards, CI bundle scans.
- **Domain:** CEAP/CEAPS ingestion, BRL normalization.
- **Pipeline:** pg-boss v10 scheduling/concurrency, CSV streaming, XML security, CPF encryption, rate limiting.

## Policy

Update when adopting new versions, discovering new patterns, or finding time-saving "gotchas."
