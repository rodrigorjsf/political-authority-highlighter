# Political Authority Highlighter

Visibilidade para politicos que servem com integridade — destacando aqueles que realmente trabalham pela sociedade brasileira.

**Political Authority Highlighter** is a public web platform that surfaces Brazilian politicians demonstrating integrity by cross-referencing 6+ official government data sources. It computes an **Integrity Score (0-100)** based on legislative activity, expense transparency, data availability, and anti-corruption database cross-references.

## Key Principles

- **Political Neutrality** — Uniform scoring across all parties, states, and roles. No editorial bias. No party colors.
- **Public Data Only** — Every data point originates from verifiable government sources under Brazil's LAI (Lei de Acesso a Informacao).
- **Positive Framing** — Highlights integrity, does not expose negatives. Low scores are permissible; exposing corruption details is not.
- **Privacy by Design** — CPFs encrypted at rest (AES-256-GCM), never exposed publicly. LGPD-compliant.

## Architecture

**Modular Monolith with Pipeline Separation** — three logical modules in a TypeScript monorepo:

| Module | Purpose | Database Role |
|--------|---------|---------------|
| `apps/web` | Next.js 15 frontend (SSG/ISR) | None (calls API) |
| `apps/api` | Fastify 5 REST API | `api_reader` (SELECT on `public_data` only) |
| `apps/pipeline` | Data ingestion & score calculation | `pipeline_admin` (full access) |

### Two-Schema Security Boundary

PostgreSQL enforces a hard isolation between public-facing data and internal anti-corruption records:

```
PostgreSQL 16
├── public_data schema     ← API reads from here
│   └── politicians, integrity_scores, bills, votes, expenses...
└── internal_data schema   ← Pipeline writes here (API has ZERO access)
    └── politician_identifiers (CPF encrypted), exclusion_records...
```

Even a SQL injection on the API cannot reach internal data — enforced at the database role level.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Language | TypeScript | 5.4+ |
| Frontend | Next.js (App Router) | 15.x |
| Backend API | Fastify | 5.x |
| Database | PostgreSQL | 16.x |
| ORM | Drizzle ORM | 0.36+ |
| Job Queue | pg-boss | 10.x |
| Validation | Zod | 3.x |
| Hosting (BE) | Hetzner Cloud VPS (CX22) | ~$6/mo |
| Hosting (FE) | Vercel | Free |
| CDN/DNS | Cloudflare | Free |

**Total infrastructure cost: ~$7/month**

## Data Sources

| Source | Type | Cadence | Data Provided |
|--------|------|---------|---------------|
| [Camara dos Deputados](https://dadosabertos.camara.leg.br/) | REST JSON | Daily | Bills, votes, expenses (CEAP), committees |
| [Senado Federal](https://legis.senado.leg.br/dadosabertos/) | REST XML/JSON | Daily | Bills, votes, expenses (CEAPS), committees |
| [Portal da Transparencia](https://portaldatransparencia.gov.br/api-de-dados) | REST JSON | Daily | Anti-corruption sanctions (CEIS, CNEP, CEAF, CEPIM) |
| [TSE](https://dadosabertos.tse.jus.br/) | Bulk CSV | Weekly | Candidacies, declared assets, party affiliations |
| [TCU CADIRREG](https://portal.tcu.gov.br/) | REST JSON | Weekly | Irregular accounts register |
| [CGU-PAD](https://www.gov.br/cgu/pt-br/acesso-a-informacao/dados-abertos) | Bulk CSV | Monthly | Federal disciplinary proceedings |

## Integrity Score

Composite score (0-100) calculated from 4 equally-weighted dimensions:

| Component | Range | Description |
|-----------|-------|-------------|
| Transparency | 0-25 | Data availability across sources |
| Legislative Activity | 0-25 | Bills authored, votes cast, committee participation |
| Expense Transparency | 0-25 | Expense regularity and documentation |
| Anti-corruption | 0-25 | Binary: 25 (no exclusion records) or 0 (any record exists) |

```
final_score = transparency + legislative + financial + anticorruption
```

Methodology documented at `/metodologia`. All weights are uniform (0.25 each) to ensure political neutrality.

## Monorepo Structure

```
political-authority-highlighter/
├── apps/
│   ├── web/              # Next.js 15 frontend
│   ├── api/              # Fastify 5 backend API
│   └── pipeline/         # Data ingestion pipeline
├── packages/
│   ├── shared/           # Domain types, constants, utilities
│   └── db/               # Drizzle schemas, migrations, DB clients
├── infrastructure/       # Docker Compose, Nginx, backups
├── docs/prd/             # PRD, Architecture, ER diagram
└── .claude/skills/       # AI development enforcement skills
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose
- PostgreSQL 16 (via Docker)

### Setup

```bash
# Clone the repository
git clone https://github.com/<org>/political-authority-highlighter.git
cd political-authority-highlighter

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Start PostgreSQL and infrastructure
docker compose up -d

# Run database migrations
pnpm --filter @pah/db migrate

# Start development servers
pnpm dev
```

### Environment Variables

| Variable | Used By | Description |
|----------|---------|-------------|
| `DATABASE_URL` | api, pipeline | PostgreSQL connection string |
| `DATABASE_URL_READER` | api | Connection with `api_reader` role |
| `DATABASE_URL_WRITER` | pipeline | Connection with `pipeline_admin` role |
| `CPF_ENCRYPTION_KEY` | pipeline | AES-256-GCM key (32 bytes, hex) |
| `TRANSPARENCIA_API_KEY` | pipeline | Portal da Transparencia API key |
| `NEXT_PUBLIC_API_URL` | web | Backend API base URL |

See `.env.example` for the full list with placeholder values.

## Development

### Commands

```bash
pnpm dev          # Start all apps in development mode
pnpm build        # Build all packages and apps
pnpm lint         # Run ESLint across all packages
pnpm typecheck    # Run TypeScript type checking
pnpm test         # Run all unit and integration tests
pnpm test:e2e     # Run Playwright E2E tests
```

### Code Quality

- **TypeScript strict mode** — `any` is banned, use `unknown` + type guards
- **Prettier** — auto-format on save (semi: false, singleQuote: true)
- **ESLint** — `@typescript-eslint/recommended-type-checked` + import boundary enforcement
- **Conventional Commits** — `feat(api): add cursor pagination`

### Testing

| Type | Tool | Coverage Target |
|------|------|-----------------|
| Unit | Vitest | 80-90% (scoring, transformers) |
| Integration | Vitest + Testcontainers | API routes with real PostgreSQL |
| E2E | Playwright | Critical user flows |

## Deployment

### Production

- **Backend**: Docker Compose on Hetzner CX22 VPS (2 vCPU, 4GB RAM)
- **Frontend**: Vercel Free tier with automatic deploys from `main`
- **CDN**: Cloudflare Free (Brazilian PoPs in Sao Paulo, Rio de Janeiro)

### Infrastructure Cost

| Component | Cost |
|-----------|------|
| Hetzner CX22 VPS | ~$6/mo |
| Vercel Free | $0 |
| Cloudflare Free | $0 |
| Domain + DNS | ~$1/mo |
| **Total** | **~$7/mo** |

## Compliance

| Law | Scope |
|-----|-------|
| LGPD (Lei 13.709/2018) | Personal data protection — legal basis: Art. 7 IX (legitimate interest) |
| LAI (Lei 12.527/2011) | Access to public information — all sources are public government data |
| Marco Civil (Lei 12.965/2014) | Internet framework — no user data collected in MVP |
| Lei da Ficha Limpa (LC 135/2010) | Referenced for exclusion filter inputs (not legal judgments) |

## Documentation

| Document | Path | Description |
|----------|------|-------------|
| PRD | [`docs/prd/PRD.md`](docs/prd/PRD.md) | Product Requirements (17 functional, 22 non-functional) |
| Architecture | [`docs/prd/ARCHITECTURE.md`](docs/prd/ARCHITECTURE.md) | Stack decisions, ADRs, system diagrams |
| ER Diagram | [`docs/prd/ER.md`](docs/prd/ER.md) | Entity-relationship model (15 tables) |
| Project Guide | [`CLAUDE.md`](CLAUDE.md) | Development conventions and domain rules |

## License

This project is not yet licensed. All rights reserved.
