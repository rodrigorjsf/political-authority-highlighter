# Political Authority Highlighter

<p align="center">
  <img src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/fastify-%23202020.svg?style=for-the-badge&logo=fastify&logoColor=white" alt="Fastify" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Drizzle-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black" alt="Drizzle ORM" />
  <img src="https://img.shields.io/badge/Turborepo-ef4444?style=for-the-badge&logo=turborepo&logoColor=white" alt="Turborepo" />
  <img src="https://img.shields.io/badge/pnpm-%234a4a4a.svg?style=for-the-badge&logo=pnpm&logoColor=f69220" alt="PNPM" />
  <img src="https://img.shields.io/badge/Docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/GitHub_Actions-%232088FF.svg?style=for-the-badge&logo=github-actions&logoColor=white" alt="GitHub Actions" />
  <img src="https://img.shields.io/badge/Vitest-%23449845?style=for-the-badge&logo=vitest&logoColor=FCC72B" alt="Vitest" />
  <img src="https://img.shields.io/badge/Playwright-%232EAD33.svg?style=for-the-badge&logo=playwright&logoColor=white" alt="Playwright" />
  <img src="https://img.shields.io/badge/vercel-%23000000.svg?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
  <img src="https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=Cloudflare&logoColor=white" alt="Cloudflare" />
</p>

Highlights Brazilian politicians who serve with integrity.

**Political Authority Highlighter** cross-references 6+ official government sources to compute an **Integrity Score (0-100)**. It measures legislative activity, expense transparency, data availability, and anti-corruption sanctions.

## Key Principles

- **Neutrality** — Uniform scoring across all parties, states, and roles. No bias.
- **Public Data** — Verifiable government sources only (LAI).
- **Positive Framing** — Highlights integrity; does not expose corruption details.
- **Privacy** — CPFs encrypted at rest (AES-256-GCM). LGPD-compliant.

## Architecture

**Modular Monolith** — TypeScript monorepo with three logical modules:

| Module          | Purpose             | Role             |
| --------------- | ------------------- | ---------------- |
| `apps/web`      | Next.js 15 frontend | None             |
| `apps/api`      | Fastify 5 REST API  | `api_reader`     |
| `apps/pipeline` | Ingestion & scoring | `pipeline_admin` |

### Database Boundary

PostgreSQL enforces isolation between public data and internal anti-corruption records. Even SQL injection on the API cannot reach internal data.

## Tech Stack

- **Language:** TypeScript 5.4+
- **Frontend:** Next.js 15
- **Backend:** Fastify 5
- **Database:** PostgreSQL 16 (Drizzle ORM)
- **Jobs:** pg-boss 10
- **Cost:** ~$1.50/mo (Supabase Free + Vercel Free + domain)

## Data Sources

- [Camara](https://dadosabertos.camara.leg.br/) — Bills, votes, expenses, committees
- [Senado](https://legis.senado.leg.br/dadosabertos/) — Bills, votes, expenses, committees
- [Portal da Transparencia](https://portaldatransparencia.gov.br/api-de-dados) — Sanctions (CEIS, CNEP, CEAF, CEPIM)
- [TSE](https://dadosabertos.tse.jus.br/) — Candidacies, assets, affiliations
- [TCU](https://portal.tcu.gov.br/) — Irregular accounts
- [CGU](https://www.gov.br/cgu/pt-br/acesso-a-informacao/dados-abertos) — Disciplinary proceedings

## Integrity Score

A composite score (0-100) from 4 equally-weighted (0.25) dimensions:

- **Transparency** — Data availability.
- **Legislative Activity** — Bills, votes, participation.
- **Expense Transparency** — Regularity and documentation.
- **Anti-corruption** — Binary (0 or 25).

Methodology at `/metodologia`.

## Structure

```
├── apps/         # web (Next.js), api (Fastify), pipeline (pg-boss)
├── packages/     # shared (types), db (Drizzle)
└── infrastructure/ # Docker, Nginx, backups
```

## Getting Started

### Prerequisites

- Node.js 20+, pnpm 9+, [Supabase CLI](https://supabase.com/docs/guides/cli) (for local DB). Optional: Docker if you prefer the legacy compose-based Postgres.

### Setup

```bash
pnpm install
cp .env.example .env.local
supabase start
pnpm dev
```

Local Postgres runs on port **54322** (Supabase default). To reset the DB and re-apply migrations and seed: `supabase db reset`.

> **Optional (Docker):** To use Docker Compose instead of Supabase local, run `docker compose up -d` and set `DATABASE_URL*` in `.env.local` to `postgresql://postgres:postgres_dev_password@127.0.0.1:5433/authority_highlighter`, then run `pnpm --filter @pah/db migrate`.

## Development

```bash
pnpm dev          # Start apps
pnpm build        # Build artifacts
pnpm lint         # Run ESLint
pnpm typecheck    # Run type checks
pnpm test         # Run unit and integration tests
vercel build      # Run the Vercel build phase (OBRIGATÓRIO PASSAR COM SUCESSO)
pnpm test:e2e     # Run Playwright E2E tests
```

- **Quality:** Strict TypeScript, Prettier, Conventional Commits.
- **Testing:** Vitest (80%+ coverage), Testcontainers, Playwright.

## Compliance

- **LGPD** — Processing based on Legitimate Interest (Art. 7 IX).
- **LAI** — Public data attribution.
- **Marco Civil** — Log retention compliance.

## Documentation

- [PRD](docs/prd/PRD.md)
- [Architecture](docs/prd/ARCHITECTURE.md)
- [ER Diagram](docs/prd/ER.md)
- [CLAUDE.md](CLAUDE.md)

## Status

- [x] Phase 1: Database & API
- [x] Phase 2: Politician Catalog
- [x] Phase 3: Profile Overview
- [x] Phase 4: Legislative Activity
- [x] Phase 5: Financial Transparency
- [ ] Phase 6: Ingestion Pipeline
- [ ] Phase 7: Deployment

## License

All rights reserved.
