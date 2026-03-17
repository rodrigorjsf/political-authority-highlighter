---
applyTo: "**/*.ts,**/*.tsx"
---

# Security Code Review — Political Authority Highlighter

## CPF Non-Exposure (DR-005) — REJECT immediately

CPF (Cadastro de Pessoas Fisicas) must NEVER appear in:

- API response bodies or TypeBox response schemas
- URL query parameters or path segments
- Frontend source code or environment variables
- Log messages at any level accessible to non-admins
- Error messages (API or frontend)
- Git commit messages or PR descriptions

CPF exists ONLY in `internal_data.politician_identifiers`, encrypted with AES-256-GCM, hashed with SHA-256 for lookups. The `api_reader` database role has ZERO permissions on this table.

REJECT any code matching these patterns outside `apps/pipeline/src/crypto/cpf.ts`:

- `/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/` (CPF format)
- Variable names containing `cpf` in API or frontend code
- References to `politician_identifiers` table outside pipeline code

## Secrets Management

Secrets (`DATABASE_URL`, `DATABASE_URL_READER`, `DATABASE_URL_WRITER`, `CPF_ENCRYPTION_KEY`, `TRANSPARENCIA_API_KEY`, `VERCEL_REVALIDATE_TOKEN`) must NEVER appear in:

- Source code (hardcoded values)
- Log messages (`console.log`, Pino logger)
- Error messages returned to clients
- Git history or `.env` files (only `.env.example` with placeholders)
- Client-side bundles (`NEXT_PUBLIC_` prefix)

Only `NEXT_PUBLIC_API_URL` is permitted to use the `NEXT_PUBLIC_` prefix. All other env vars are server-only.

REJECT: Hardcoded URLs, API keys, or database connection strings. REJECT: `NEXT_PUBLIC_DATABASE_URL` or similar.

## Import Boundary Enforcement

| Source | Must NOT Import |
|--------|----------------|
| `apps/web/` | `@pah/db`, `pg`, `drizzle-orm`, `pg-boss`, `apps/api/`, `apps/pipeline/` |
| `apps/api/` | `packages/db/internal-schema.ts`, `apps/pipeline/` |

REJECT: Cross-boundary imports. These are also enforced by ESLint `import/no-restricted-paths` and `no-restricted-imports`.

## Frontend Security (DR-008)

- CSP header must be defined in `next.config.ts` via `headers()` function
- All `packages/db/src/` files must import `'server-only'`
- Government-sourced text rendered via JSX auto-escaping only — never `innerHTML` or `dangerouslySetInnerHTML` (except JSON-LD)
- `dangerouslySetInnerHTML` permitted ONLY for `<script type="application/ld+json">` with `JSON.stringify(obj).replace(/</g, '\\u003c')` to prevent XSS
- Error boundaries (`error.tsx`) show generic messages — no stack traces, database table names, SQL queries, internal URLs
- No external `<script>` tags without `integrity` and `crossorigin` attributes

## Input Validation

All API inputs validated via TypeBox schemas with explicit constraints:

- Slug: `^[a-z0-9-]+$` pattern
- State: 2-char uppercase
- Search: 2-100 characters
- Numeric params (limit, year): bounded with `minimum`/`maximum`
- Frontend search queries: trimmed, limited to 100 chars before sending to API

## Silent Exclusion Security (DR-001)

Exclusion record details (source name, date, type, reason, count) are classified as internal data. They must NEVER appear in:

- API responses (only boolean `exclusion_flag` on profile endpoint)
- Frontend UI (only generic notice text)
- Log messages at INFO level or below
- Error messages

REJECT: API fields named `exclusion_records`, `corruption_indicator`, `exclusion_source`, `exclusion_date`, or similar.

## No Retaliation (DR-006)

No features that enable creating hit lists or targeting politicians:

- No ascending sort by score (lowest first)
- No "worst politicians" endpoints or UI
- No comparison features ranking parties negatively
- No negative framing in UI copy

## TypeScript Type Safety

Ban `any` — use `unknown` + type guards. Ban `as` assertions — except `as const` and `as unknown as T` in test factories. No `@ts-ignore` or `@ts-expect-error` without issue link. All public function signatures need explicit return types.
