---
applyTo: "apps/pipeline/**"
---

# Pipeline Code Review — Political Authority Highlighter

## CPF Handling (DR-005) — REJECT violations

CPF encryption/decryption ONLY in `src/crypto/cpf.ts`. AES-256-GCM encryption, SHA-256 hashing for lookups. CPF stored encrypted in `internal_data.politician_identifiers`. Encryption key from `CPF_ENCRYPTION_KEY` environment variable — never hardcoded.

REJECT: CPF values in log messages at any level. REJECT: CPF decryption outside `src/crypto/cpf.ts`. REJECT: Raw CPF values stored without encryption.

CGU exclusion data uses `CPF_SERVIDOR` field (raw CPF) — must call `hashCPF(raw.CPF_SERVIDOR)` before lookup. Never store raw CPF from CGU directly.

## Idempotent Upserts (DR-007) — REJECT non-idempotent writes

All database inserts use `ON CONFLICT DO UPDATE` via Drizzle's `onConflictDoUpdate()`. Natural keys: `source + external_id` composite. Running the same ingestion twice must produce the same database state. Failed jobs roll back entirely — no partial state.

REJECT: `db.insert(table).values(data)` without `.onConflictDoUpdate()`. REJECT: Non-transactional multi-row inserts.

## Adapter Pattern

All source adapters follow `*.adapter.ts` naming. Adapters extend `BaseAdapter` with retry logic, rate limiting, and logging. Each adapter fetches from exactly one government source.

Source configuration:

| Source | Rate Limit | Format | Cadence |
|--------|-----------|--------|---------|
| Camara | 120/min | JSON | Daily |
| Senado | None documented | XML/JSON | Daily |
| Transparencia | 90/min | JSON (API key) | Daily |
| TSE | N/A | CSV bulk | Weekly |
| TCU | None documented | JSON | Weekly |
| CGU | N/A | CSV bulk | Monthly |

All adapters must include fallback handling for missing/empty responses from government APIs. Never let a single source failure stop other sources.

## pg-boss v10

Job queue for all scheduled tasks. No `setTimeout`/`setInterval` for scheduling. Options require `name` field. `schedule()` third param `data` must be `object` not `null` — use `{}`. Retry: 3 attempts with exponential backoff (immediate, 1min, 5min). After 3 failures: dead letter queue, ingestion marked `failed`. Job timeout: 2 hours (`expireInMinutes: 120`).

## Schema Access

Pipeline uses `pipeline_admin` role with ALL permissions on both `public` and `internal_data` schemas. Pipeline publishes computed results to `public` schema via upserts. Raw source data stored in `internal_data.raw_source_data` for auditability.

## Scoring Rules (DR-002, DR-004)

Score weights are uniform: 0.25 each for transparency, legislative, financial, anticorruption. No party-specific, state-specific, or role-specific scoring adjustments. Anticorruption is binary: 25 if clean, 0 if ANY exclusion record exists. `data_coverage_ratio` multiplier applied — less data = lower ceiling.

## Silent Exclusion (DR-001)

Only the boolean `exclusion_flag` crosses from `internal_data` to `public` schema. No exclusion record details (source name, date, type, reason) are published to `public` tables. Pipeline sets `exclusion_flag = true` on `public.politicians` and `public.integrity_scores` when any exclusion exists.

## Transformer Functions

Name: `to` + target type (e.g., `toPolitician`, `toExpense`). Transformers normalize: names (diacritics, casing), dates, currency (BRL), bill types. Pure functions — no side effects, no I/O. Validate raw source data with Zod schemas before transformation.

## Error Handling

Adapters catch source-specific errors and log them. Mark ingestion as `partial` or `failed`. All errors recorded in `internal_data.ingestion_logs`. Never throw unhandled exceptions. Source errors use `SourceApiError` class.

## Sensitive Data in Logs

Never log CPF values, encryption keys, or API keys (Portal da Transparencia). Pipeline logs use `DEBUG` level only for exclusion-related debugging. No exclusion reasons at `INFO` level or below.
