# Feature: Alertas de Pontuação por Email (RF-POST-002)

## Summary

Implementar um sistema de alertas por email com double opt-in LGPD-compliant que permite
cidadãos se inscreverem para notificações quando a pontuação de integridade de um político
que acompanham variar ≥ 5 pontos ou o `exclusion_flag` mudar. O email é armazenado com
AES-256-GCM (mesmo padrão do CPF). A detecção de diff ocorre após cada run do scoring engine
no pipeline, disparando jobs pg-boss para envio via Resend.

## User Story

Como um Cidadão Engajado
Quero receber um email quando o score de integridade de um político que acompanho mudar significativamente
Para me manter informado sem precisar entrar na plataforma toda semana

## Problem Statement

A plataforma não tem mecanismo de retenção: depois da primeira visita, o cidadão só retorna
se lembrar de verificar manualmente. Sem alertas, o KPI de MAU retornante (≥ 5% dos inscritos
ativos/mês) é impossível de atingir.

## Solution Statement

Double opt-in via email + AES-256-GCM storage + pg-boss worker de detecção de diff.
O fluxo é: inscrição → confirmation email via Resend → confirmação → email armazenado
criptografado. O pipeline detecta diffs ≥ 5 pontos após cada scoring run, enfileira jobs
`score-alert` no pg-boss, e o worker decripta os emails em memória para envio via Resend.

## Metadata

| Field            | Value                                                     |
| ---------------- | --------------------------------------------------------- |
| Type             | NEW_CAPABILITY                                            |
| Complexity       | HIGH                                                      |
| Systems Affected | packages/db, apps/api, apps/pipeline, apps/web            |
| Dependencies     | resend (new), pg-boss 10.4.2 (existing), Node.js crypto   |
| Estimated Tasks  | 22                                                        |

---

## UX Design

### Before State

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                              BEFORE STATE                                      ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   ┌──────────────────┐         ┌──────────────────┐                          ║
║   │  Politician       │ ──────► │  No mechanism    │                          ║
║   │  Profile Page     │         │  to come back    │                          ║
║   └──────────────────┘         └──────────────────┘                          ║
║                                                                               ║
║   USER_FLOW: User visits profile → reads score → leaves and never returns     ║
║   PAIN_POINT: Score changes are invisible. User must visit manually each week ║
║   DATA_FLOW: Score computed by pipeline → stored in DB → API → frontend       ║
║              No diff detection, no notification mechanism                      ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### After State

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                               AFTER STATE                                      ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   ┌──────────────────┐   email  ┌──────────────────┐   202  ┌────────────┐  ║
║   │  <SubscribeForm>  │ ──────► │  POST /subscribe  │ ────► │ Resend     │  ║
║   │  (Client Comp.)   │         │  (Fastify route)  │       │ Confirm    │  ║
║   └──────────────────┘         └──────────────────┘        │ Email      │  ║
║                                         │                   └────────────┘  ║
║   ┌────────────────────────────────────────────────────────────────────────┐ ║
║   │                       PIPELINE (daily run)                              │ ║
║   │  scorePolitician() → detect diff ≥ 5pts → boss.send('score-alert')     │ ║
║   │  → score-alert.worker → decryptEmail → Resend alert email              │ ║
║   └────────────────────────────────────────────────────────────────────────┘ ║
║                                                                               ║
║   USER_FLOW: User sees SubscribeForm at bottom of profile → enters email      ║
║   → receives confirmation email → clicks confirm → receives alert when        ║
║   score changes ≥ 5 points → clicks link in email to view updated profile    ║
║   VALUE_ADD: Passive monitoring — citizen stays informed without polling      ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### Interaction Changes

| Location | Before | After | User Impact |
|---|---|---|---|
| `/politicos/[slug]` | No subscription option | `<SubscribeForm>` at bottom | Can subscribe in < 30s |
| `GET /api/v1/subscribe/confirm?token=` | Route doesn't exist | Returns 200 JSON | Email confirmed, alert active |
| `GET /api/v1/subscribe/unsubscribe?token=` | Route doesn't exist | Returns 200 JSON | One-click unsubscribe from email |
| Pipeline `scorePolitician` | No diff detection | Returns `needsAlert` flag | Triggers email when score changes |

---

## Mandatory Reading

**CRITICAL: Implementation agent MUST read these files before starting any task:**

| Priority | File | Lines | Why Read This |
|---|---|---|---|
| P0 | `apps/pipeline/src/crypto/cpf.ts` | 1-46 | Pattern to MIRROR exactly for email.ts |
| P0 | `packages/db/src/public-schema.ts` | 1-80 | MIRROR table definition pattern |
| P0 | `apps/api/src/routes/politicians.route.ts` | 1-72 | MIRROR route factory pattern (FastifyPluginAsyncTypebox) |
| P0 | `apps/api/src/app.ts` | 1-96 | Must understand DI pattern before adding route+service |
| P1 | `apps/pipeline/src/scheduler.ts` | 1-64 | MIRROR createQueue/work registration pattern |
| P1 | `apps/pipeline/src/services/scoring.service.ts` | all | Understand exact insertion point for diff detection |
| P1 | `apps/pipeline/src/index.ts` | all | Thread `boss` to `runPipeline` call sites |
| P1 | `apps/api/src/hooks/error-handler.ts` | all | Extend error handler with new error types |
| P1 | `supabase/migrations/0009_add_data_source_status.sql` | all | MIRROR migration SQL format + GRANT pattern |
| P2 | `apps/api/src/repositories/politician.repository.ts` | 49-162 | Drizzle query patterns: `.at(0)`, `and(...conditions)` |
| P2 | `apps/api/src/services/politician.service.ts` | all | Service factory pattern to mirror |
| P2 | `apps/web/src/app/politicos/[slug]/page.tsx` | all | Find exact insertion point for `<SubscribeForm>` |
| P2 | `apps/pipeline/src/orchestrator.ts` | all | Thread `boss` param through `runPipeline` |

**External Documentation:**

| Source | Section | Why Needed |
|---|---|---|
| Resend SDK v6.9.3 (installed) | `dist/index.d.mts` — `CreateEmailResponse` type | `{ data, error }` pattern — no try/catch needed |
| pg-boss v10.4.2 | `types.d.ts` — `WorkHandler<T>` receives `Job<T>[]` (array!) | `([job])` destructuring in worker handler |
| Node.js Crypto | `createCipheriv` — `getAuthTag()` AFTER `cipher.final()` | Critical operation order for AES-256-GCM |

---

## Patterns to Mirror

**EMAIL_CRYPTO_PATTERN:**

```typescript
// SOURCE: apps/pipeline/src/crypto/cpf.ts:1-46
// COPY THIS PATTERN for apps/pipeline/src/crypto/email.ts and apps/api/src/crypto/email.ts
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto'
import { env } from '../config/env.js'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

const encryptionKey = Buffer.from(env.EMAIL_ENCRYPTION_KEY, 'hex') // 32 bytes
// GOTCHA: key read at module level — tests must vi.stubEnv('EMAIL_ENCRYPTION_KEY', 'a'.repeat(64)) BEFORE dynamic import

export function encryptEmail(email: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, encryptionKey, iv)
  const encrypted = Buffer.concat([cipher.update(email, 'utf-8'), cipher.final()])
  const authTag = cipher.getAuthTag() // AFTER cipher.final()!
  return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}

export function decryptEmail(encrypted: string): string {
  const buffer = Buffer.from(encrypted, 'base64')
  const iv = buffer.subarray(0, IV_LENGTH)
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const ciphertext = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH)
  const decipher = createDecipheriv(ALGORITHM, encryptionKey, iv)
  decipher.setAuthTag(authTag) // BEFORE decipher.update()!
  return decipher.update(ciphertext).toString('utf-8') + decipher.final('utf-8')
}

export function hashEmail(email: string): string {
  return createHash('sha256').update(email.toLowerCase().trim()).digest('hex')
}
```

**DRIZZLE_TABLE_PATTERN:**

```typescript
// SOURCE: packages/db/src/public-schema.ts:32-67
export const alertSubscriptions = publicData.table('alert_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  politicianId: uuid('politician_id').notNull().references(() => politicians.id),
  emailEncrypted: text('email_encrypted').notNull(),
  emailHash: varchar('email_hash', { length: 64 }).notNull(),
  unsubscribeToken: varchar('unsubscribe_token', { length: 64 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  confirmedAt: timestamp('confirmed_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_alert_subscriptions_politician').on(table.politicianId),
  index('idx_alert_subscriptions_email_hash').on(table.emailHash),
  unique('uq_alert_email_politician').on(table.politicianId, table.emailHash),
])
```

**ROUTE_FACTORY_PATTERN:**

```typescript
// SOURCE: apps/api/src/routes/politicians.route.ts:1-15
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import type { SubscriptionService } from '../services/subscription.service.js'

interface RouteDeps {
  subscriptionService: SubscriptionService
}

export function createSubscriptionsRoute(deps: RouteDeps): FastifyPluginAsyncTypebox {
  // eslint-disable-next-line @typescript-eslint/require-await
  return async (app) => {
    app.post('/politicians/:slug/subscribe', { schema: { ... } }, async (request) => {
      // handler
    })
  }
}
```

**PG_BOSS_WORKER_PATTERN:**

```typescript
// SOURCE: apps/pipeline/src/scheduler.ts:21-58
// createQueue BEFORE work — name field required in options (pg-boss v10 quirk)
await boss.createQueue('score-alert', { name: 'score-alert', retryLimit: 3, retryDelay: 60, retryBackoff: true })

// Handler receives Job[] ARRAY not a single job
await boss.work<ScoreAlertPayload>('score-alert', { batchSize: 5 }, async (jobs) => {
  await Promise.allSettled(jobs.map((job) => processAlertJob(job.data)))
})
```

**SERVICE_FACTORY_PATTERN:**

```typescript
// SOURCE: apps/api/src/services/politician.service.ts
export function createSubscriptionService(
  repository: SubscriptionRepository,
  resend: Resend,
): SubscriptionService {
  return {
    async subscribe(slug: string, email: string): Promise<void> { ... },
    async confirm(token: string): Promise<void> { ... },
    async unsubscribe(token: string): Promise<void> { ... },
  }
}
export type SubscriptionService = ReturnType<typeof createSubscriptionService>
```

**RESEND_PATTERN (from research — never throws, returns {data, error}):**

```typescript
const { data, error } = await resend.emails.send({
  from: `PAH <${env.ALERTS_FROM_EMAIL}>`,
  to: [recipientEmail],
  subject: 'Confirme sua inscrição de alertas',
  html: `<p>Clique <a href="${confirmUrl}">aqui</a> para confirmar.</p>`,
})
if (error) {
  logger.error({ code: error.name, status: error.statusCode }, error.message)
  throw new Error(`Resend error: ${error.message}`)
}
```

**SCORE_DIFF_DETECTION_PATTERN:**

```typescript
// SOURCE: apps/pipeline/src/services/scoring.service.ts (insertion point before upsert)
// Fetch previous score BEFORE upsert
const [prevScore] = await db
  .select({ overallScore: integrityScores.overallScore, exclusionFlag: integrityScores.exclusionFlag })
  .from(integrityScores)
  .where(eq(integrityScores.politicianId, politicianId))

const needsAlert =
  prevScore !== undefined &&
  (Math.abs(overallScore - prevScore.overallScore) >= 5 ||
    politician.exclusionFlag !== prevScore.exclusionFlag)

// ... upsert (existing) ...
return { transparencyScore, legislativeScore, financialScore, anticorruptionScore, overallScore, needsAlert }
```

**TYPEBOX_BODY_SCHEMA_PATTERN:**

```typescript
// SOURCE: apps/api/src/schemas/politician.schema.ts:1-30
// body schema uses Type.Object — same as querystring/params
export const SubscribeBodySchema = Type.Object({
  email: Type.String({ format: 'email', maxLength: 254 }),
})
export type SubscribeBody = Static<typeof SubscribeBodySchema>

export const SubscribeParamsSchema = Type.Object({
  slug: Type.String({ minLength: 1, maxLength: 255 }),
})
```

**CLIENT_COMPONENT_PATTERN:**

```typescript
// SOURCE: apps/web/src/components/filters/search-bar.tsx:1-10
'use client'
import { useState } from 'react'

type FormState = 'idle' | 'loading' | 'success' | 'error'

export function SubscribeForm({ slug }: { slug: string }): React.JSX.Element {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<FormState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  // ...
}
```

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `packages/db/src/public-schema.ts` | UPDATE | Add `alertSubscriptions` + `pendingSubscriptions` Drizzle tables |
| `supabase/migrations/0010_add_alert_subscriptions.sql` | CREATE | DDL + targeted GRANT INSERT/UPDATE/DELETE to api_reader |
| `packages/db/migrations/0009_add_alert_subscriptions.sql` | CREATE | Drizzle mirror migration (same DDL, without roles.sql grants) |
| `apps/pipeline/src/crypto/email.ts` | CREATE | AES-256-GCM encrypt/decrypt/hash for email (mirrors cpf.ts) |
| `apps/pipeline/src/config/env.ts` | UPDATE | Add `EMAIL_ENCRYPTION_KEY`, `RESEND_API_KEY`, `ALERTS_FROM_EMAIL` |
| `apps/pipeline/src/services/scoring.service.ts` | UPDATE | Add diff detection, return `needsAlert` flag |
| `apps/pipeline/src/orchestrator.ts` | UPDATE | Accept `boss: PgBoss` param, call `boss.send('score-alert')` on `needsAlert` |
| `apps/pipeline/src/scheduler.ts` | UPDATE | Register `score-alert` queue + worker |
| `apps/pipeline/src/workers/score-alert.worker.ts` | CREATE | Fetch subscriptions, decrypt emails, send via Resend |
| `apps/pipeline/src/index.ts` | UPDATE | Thread `boss` into `runPipeline` handler call |
| `apps/api/src/crypto/email.ts` | CREATE | Same AES-256-GCM pattern — used for encrypt-on-confirm |
| `apps/api/src/config/env.ts` | UPDATE | Add `RESEND_API_KEY`, `EMAIL_ENCRYPTION_KEY`, `ALERTS_FROM_EMAIL` |
| `apps/api/src/repositories/subscription.repository.ts` | CREATE | Drizzle queries for pending/active subscriptions |
| `apps/api/src/hooks/error-handler.ts` | UPDATE | Add `TokenNotFoundError`, `DuplicateSubscriptionError` |
| `apps/api/src/services/subscription.service.ts` | CREATE | Business logic: subscribe/confirm/unsubscribe + Resend |
| `apps/api/src/schemas/subscription.schema.ts` | CREATE | TypeBox schemas for subscribe body + query params |
| `apps/api/src/routes/subscriptions.route.ts` | CREATE | 3 endpoints: POST /subscribe, GET /confirm, GET /unsubscribe |
| `apps/api/src/app.ts` | UPDATE | Register subscriptions route + inject Resend client |
| `apps/web/src/components/politician/subscribe-form.tsx` | CREATE | Client Component with form states: idle/loading/success/error |
| `apps/web/src/app/politicos/[slug]/page.tsx` | UPDATE | Import `<SubscribeForm slug={politician.slug} />` before `</main>` |
| `apps/web/src/lib/api-client.ts` | UPDATE | Add `subscribeToAlerts(slug, email)` function |
| `.env.example` | UPDATE | Add `RESEND_API_KEY`, `EMAIL_ENCRYPTION_KEY`, `ALERTS_FROM_EMAIL` |

---

## NOT Building (Scope Limits)

- **Unsubscription management UI** — users unsubscribe via email link only; no frontend management page
- **Subscription list for users** — no "my subscriptions" page; would require authentication
- **Alert throttling / alert history** — basic 1-alert-per-score-run for MVP; rate limiting is next phase
- **Score increase vs decrease differentiation** — just "score changed ≥ 5 points"
- **Rich HTML email templates** — minimal functional HTML; design improvements are post-phase
- **Bulk unsubscribe** — unsubscribe-all link is out of scope
- **Webhook alternative** — REST/email only; webhooks are post-pós-MVP
- **API write role separation** — `api_reader` gets targeted INSERT/UPDATE/DELETE grants on subscription tables only

---

## Step-by-Step Tasks

Execute in order. Each task is atomic and independently verifiable.

---

### Task 1: UPDATE `packages/db/src/public-schema.ts`

**ACTION**: ADD two new table definitions after the existing `dataSourceStatus` table

**IMPLEMENT**:

```typescript
export const pendingSubscriptions = publicData.table('pending_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  politicianId: uuid('politician_id').notNull().references(() => politicians.id),
  email: varchar('email', { length: 254 }).notNull(),
  confirmTokenHash: varchar('confirm_token_hash', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_pending_subscriptions_politician').on(table.politicianId),
])

export const alertSubscriptions = publicData.table('alert_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  politicianId: uuid('politician_id').notNull().references(() => politicians.id),
  emailEncrypted: text('email_encrypted').notNull(),
  emailHash: varchar('email_hash', { length: 64 }).notNull(),
  unsubscribeToken: varchar('unsubscribe_token', { length: 64 }).notNull().unique(),
  confirmedAt: timestamp('confirmed_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_alert_subscriptions_politician').on(table.politicianId),
  unique('uq_alert_subscriptions_politician_email').on(table.politicianId, table.emailHash),
])
```

**MIRROR**: `packages/db/src/public-schema.ts` existing table pattern (uuid PK, references, indexes)
**IMPORTS**: No new imports needed — all types already imported in the file
**GOTCHA**: `timestamp` is without timezone by default — Postgres stores as local. For confirmed_at/expires_at use `timestamp('x').notNull()` (matches existing pattern in this schema). Do NOT use `timestamptz` — the existing schema uses `timestamp` for consistency.
**GOTCHA**: `confirmTokenHash` stores SHA-256 hash of the raw token (security: if DB is leaked, tokens can't be replayed)
**VALIDATE**: `pnpm --filter @pah/db typecheck`

---

### Task 2: CREATE `supabase/migrations/0010_add_alert_subscriptions.sql`

**ACTION**: CREATE migration file for Supabase CLI

**IMPLEMENT**:

```sql
-- 0010_add_alert_subscriptions.sql — RF-POST-002: alert subscriptions with double opt-in
-- email stored encrypted (AES-256-GCM) in alert_subscriptions; plaintext only in pending (24h TTL)

CREATE TABLE IF NOT EXISTS public.pending_subscriptions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id        UUID NOT NULL REFERENCES public.politicians(id),
  email                VARCHAR(254) NOT NULL,
  confirm_token_hash   VARCHAR(64) NOT NULL UNIQUE,
  expires_at           TIMESTAMPTZ NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.alert_subscriptions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id        UUID NOT NULL REFERENCES public.politicians(id),
  email_encrypted      TEXT NOT NULL,
  email_hash           VARCHAR(64) NOT NULL,
  unsubscribe_token    VARCHAR(64) NOT NULL UNIQUE,
  confirmed_at         TIMESTAMPTZ NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pending_subscriptions_politician
  ON public.pending_subscriptions(politician_id);

CREATE INDEX IF NOT EXISTS idx_alert_subscriptions_politician
  ON public.alert_subscriptions(politician_id);

CREATE INDEX IF NOT EXISTS idx_alert_subscriptions_email_hash
  ON public.alert_subscriptions(email_hash);

CREATE UNIQUE INDEX IF NOT EXISTS uq_alert_subscriptions_politician_email
  ON public.alert_subscriptions(politician_id, email_hash);

-- Grant SELECT to api_reader (existing pattern)
GRANT SELECT ON TABLE public.pending_subscriptions TO api_reader;
GRANT SELECT ON TABLE public.alert_subscriptions TO api_reader;

-- Grant INSERT/UPDATE/DELETE on subscription tables to api_reader
-- Rationale: subscription tables are user-facing public data managed by the API layer
-- NOT internal_data; api_reader remains read-only on all other public tables
GRANT INSERT, DELETE ON TABLE public.pending_subscriptions TO api_reader;
GRANT INSERT, UPDATE, DELETE ON TABLE public.alert_subscriptions TO api_reader;

-- Grant full access to pipeline_admin
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pending_subscriptions TO pipeline_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.alert_subscriptions TO pipeline_admin;
```

**MIRROR**: `supabase/migrations/0009_add_data_source_status.sql` SQL format + GRANT pattern
**GOTCHA**: `supabase/migrations/` uses `TIMESTAMPTZ` (with timezone) — note this differs from the Drizzle schema which uses `timestamp` (without TZ). Both are valid — the migration is the authoritative source for Postgres; Drizzle maps `timestamp` to `TIMESTAMP WITHOUT TIME ZONE`. Keep them aligned by using the SAME type in both.
**CORRECTION**: Use `TIMESTAMP NOT NULL` (without TZ) in the SQL migration to match Drizzle's `timestamp()`. The existing migrations use `TIMESTAMPTZ` but Drizzle uses `timestamp` — pick the Drizzle convention for new tables to maintain code-schema alignment.
**VALIDATE**: `supabase db reset` (if local Supabase running) or verify SQL syntax manually

---

### Task 3: CREATE `packages/db/migrations/0009_add_alert_subscriptions.sql`

**ACTION**: CREATE Drizzle migration mirror (same DDL but without roles/grants — those are Supabase-specific)

**IMPLEMENT**: Same DDL as Task 2 but without the GRANT statements (Drizzle migrations don't include role grants; those are in supabase/roles.sql and Supabase migrations)

**MIRROR**: `packages/db/migrations/0008_add_data_source_status.sql` format
**VALIDATE**: SQL syntax is valid (no execution needed for this task)

---

### Task 4: CREATE `apps/pipeline/src/crypto/email.ts`

**ACTION**: CREATE email encryption module mirroring `cpf.ts` exactly

**IMPLEMENT**:

```typescript
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto'
import { env } from '../config/env.js'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

const encryptionKey = Buffer.from(env.EMAIL_ENCRYPTION_KEY, 'hex')

export function encryptEmail(email: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, encryptionKey, iv)
  const encrypted = Buffer.concat([cipher.update(email, 'utf-8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}

export function decryptEmail(encrypted: string): string {
  const buffer = Buffer.from(encrypted, 'base64')
  const iv = buffer.subarray(0, IV_LENGTH)
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const ciphertext = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH)
  const decipher = createDecipheriv(ALGORITHM, encryptionKey, iv)
  decipher.setAuthTag(authTag)
  return decipher.update(ciphertext).toString('utf-8') + decipher.final('utf-8')
}

export function hashEmail(email: string): string {
  return createHash('sha256').update(email.toLowerCase().trim()).digest('hex')
}
```

**MIRROR**: `apps/pipeline/src/crypto/cpf.ts:1-46` — exactly the same structure
**IMPORTS**: `from 'node:crypto'` + `from '../config/env.js'`
**GOTCHA**: Key is read at **module level** — tests must use `vi.stubEnv('EMAIL_ENCRYPTION_KEY', 'a'.repeat(64))` BEFORE dynamic import of this module (see MEMORY.md pattern)
**VALIDATE**: `pnpm --filter @pah/pipeline typecheck`

---

### Task 5: UPDATE `apps/pipeline/src/config/env.ts`

**ACTION**: ADD `EMAIL_ENCRYPTION_KEY`, `RESEND_API_KEY`, `ALERTS_FROM_EMAIL` to the Zod schema

**IMPLEMENT**: Add to `envSchema`:

```typescript
EMAIL_ENCRYPTION_KEY: z.string().regex(/^[0-9a-f]{64}$/), // 32 bytes hex
RESEND_API_KEY: z.string().min(1),
ALERTS_FROM_EMAIL: z.string().email(),
```

**MIRROR**: `apps/pipeline/src/config/env.ts` — CPF_ENCRYPTION_KEY regex pattern
**GOTCHA**: `RESEND_API_KEY` starts with `re_` in production — use `z.string().min(1)` not `.email()`
**VALIDATE**: `pnpm --filter @pah/pipeline typecheck`

---

### Task 6: UPDATE `apps/pipeline/src/services/scoring.service.ts`

**ACTION**: ADD diff detection before the upsert, change return type to include `needsAlert`

**IMPLEMENT**:

1. Change `ScoreResult` interface to add `needsAlert: boolean`
2. Before the existing upsert block, add:

```typescript
// Fetch previous score for diff detection
const [prevScore] = await db
  .select({
    overallScore: integrityScores.overallScore,
    exclusionFlag: integrityScores.exclusionFlag,
  })
  .from(integrityScores)
  .where(eq(integrityScores.politicianId, politicianId))

const needsAlert =
  prevScore !== undefined &&
  (Math.abs(overallScore - prevScore.overallScore) >= 5 ||
    politician.exclusionFlag !== prevScore.exclusionFlag)
```
1. Change the return statement to: `return { transparencyScore, legislativeScore, financialScore, anticorruptionScore, overallScore, needsAlert }`

**MIRROR**: Existing Drizzle query pattern in `scoring.service.ts` — same `db.select().from().where()` chain
**GOTCHA**: `[prevScore]` destructuring returns `undefined` if no existing score (first run) — `prevScore !== undefined` guard handles this. On first run, `needsAlert` is `false` (correct: new politicians don't trigger alerts)
**GOTCHA**: Use `[prevScore]` array destructuring, NOT `.at(0)` here — `[prevScore]` is valid for a single expected result from a query with `eq(politicianId)` unique constraint
**VALIDATE**: `pnpm --filter @pah/pipeline typecheck`

---

### Task 7: UPDATE `apps/pipeline/src/orchestrator.ts`

**ACTION**: Accept `boss: PgBoss` as second parameter, call `boss.send('score-alert', ...)` when `needsAlert`

**IMPLEMENT**:

1. Change function signature: `export async function runPipeline(db: PipelineDb, boss: PgBoss, source: DataSource): Promise<void>`
2. After `scorePolitician(db, politician.id)` call, if result `needsAlert`, call:

```typescript
if (result.needsAlert) {
  await boss.send('score-alert', {
    politicianId: politician.id,
    slug: politician.slug,
    newScore: result.overallScore,
  })
  logger.info({ politicianId: politician.id }, 'Score-alert job enqueued')
}
```

**MIRROR**: `apps/pipeline/src/orchestrator.ts` existing logger and flow patterns
**IMPORTS**: `import type PgBoss from 'pg-boss'` at top
**GOTCHA**: `boss.send()` returns `string | null` — null means a singleton policy suppressed the job (not an error). No need to throw on null result.
**VALIDATE**: `pnpm --filter @pah/pipeline typecheck`

---

### Task 8: CREATE `apps/pipeline/src/workers/score-alert.worker.ts`

**ACTION**: CREATE pg-boss worker that fetches active subscriptions, decrypts emails, sends alerts via Resend

**IMPLEMENT**:

```typescript
import { Resend } from 'resend'
import { eq } from 'drizzle-orm'
import { alertSubscriptions, politicians, integrityScores } from '@pah/db/public-schema'
import type { PipelineDb } from '@pah/db/clients'
import { decryptEmail } from '../crypto/email.js'
import { env } from '../config/env.js'
import { logger } from '../config/logger.js'

export interface ScoreAlertPayload {
  politicianId: string
  slug: string
  newScore: number
}

export async function processScoreAlert(
  db: PipelineDb,
  resend: Resend,
  data: ScoreAlertPayload,
): Promise<void> {
  const { politicianId, slug, newScore } = data

  // Fetch politician name + subscriptions in parallel
  const [politicianResult, subscriptions] = await Promise.all([
    db.select({ name: politicians.name }).from(politicians).where(eq(politicians.id, politicianId)),
    db.select({ emailEncrypted: alertSubscriptions.emailEncrypted, unsubscribeToken: alertSubscriptions.unsubscribeToken })
      .from(alertSubscriptions)
      .where(eq(alertSubscriptions.politicianId, politicianId)),
  ])

  const politician = politicianResult.at(0)
  if (politician === undefined || subscriptions.length === 0) return

  logger.info({ politicianId, count: subscriptions.length }, 'Sending score alerts')

  for (const sub of subscriptions) {
    const email = decryptEmail(sub.emailEncrypted)
    const unsubscribeUrl = `${env.API_BASE_URL}/api/v1/subscribe/unsubscribe?token=${sub.unsubscribeToken}`

    const { data: sendResult, error } = await resend.emails.send({
      from: `PAH <${env.ALERTS_FROM_EMAIL}>`,
      to: [email],
      subject: `Atualização de pontuação: ${politician.name}`,
      html: `<p>A pontuação de integridade de <strong>${politician.name}</strong> foi atualizada para <strong>${newScore}/100</strong>.</p><p><a href="https://autoridade-politica.com.br/politicos/${slug}">Ver perfil</a></p><p><small><a href="${unsubscribeUrl}">Cancelar inscrição</a></small></p>`,
    })

    if (error) {
      logger.error({ code: error.name, politicianId }, `Alert email failed: ${error.message}`)
    } else {
      logger.info({ emailId: sendResult.id, politicianId }, 'Alert email sent')
    }
  }
}
```

**IMPORTS**: `resend` (new package, add to `apps/pipeline/package.json`), `@pah/db/public-schema`, `@pah/db/clients`
**GOTCHA**: Decrypt email (`decryptEmail(sub.emailEncrypted)`) is in-memory only — do NOT log the plaintext email. Log only `emailId` from Resend response.
**GOTCHA**: Resend `{ data, error }` — never throws. Check `error` before using `data`.
**VALIDATE**: `pnpm --filter @pah/pipeline typecheck`

---

### Task 9: UPDATE `apps/pipeline/src/scheduler.ts`

**ACTION**: Register `score-alert` queue on startup and attach worker

**IMPLEMENT**: Add after existing `QUEUES` and `startScheduler`:

```typescript
export async function registerScoreAlertWorker(
  boss: PgBoss,
  db: PipelineDb,
  resend: Resend,
): Promise<void> {
  await boss.createQueue('score-alert', {
    name: 'score-alert',
    retryLimit: 3,
    retryDelay: 60,
    retryBackoff: true,
  })

  await boss.work<ScoreAlertPayload>('score-alert', { batchSize: 5 }, async (jobs) => {
    await Promise.allSettled(
      jobs.map((job) => processScoreAlert(db, resend, job.data)),
    )
  })

  logger.info('Score-alert worker registered')
}
```

**MIRROR**: `apps/pipeline/src/scheduler.ts:21-58` — `createQueue` + `work` pattern
**IMPORTS**: `import { Resend } from 'resend'`, `import type { PipelineDb } from '@pah/db/clients'`, `import { ScoreAlertPayload, processScoreAlert } from './workers/score-alert.worker.js'`
**GOTCHA**: `createQueue` options MUST include `name` field matching first argument (pg-boss v10 quirk)
**GOTCHA**: `boss.send()` third param for schedule must be `{}` not `null` (score-alert uses `boss.send()` directly, no schedule needed)
**VALIDATE**: `pnpm --filter @pah/pipeline typecheck`

---

### Task 10: UPDATE `apps/pipeline/src/index.ts`

**ACTION**: Thread `boss` into `runPipeline`, init Resend client, call `registerScoreAlertWorker`

**IMPLEMENT**:

1. Add Resend initialization after `boss.start()`:

```typescript
const resend = new Resend(env.RESEND_API_KEY)
```
1. Call `registerScoreAlertWorker(boss, db, resend)` after `registerWorkers(boss, {...})`
2. Update all 6 `runPipeline(db, source)` handler calls to `runPipeline(db, boss, source)`

**MIRROR**: `apps/pipeline/src/index.ts` existing initialization pattern
**IMPORTS**: `import { Resend } from 'resend'`, `import { registerScoreAlertWorker } from './scheduler.js'`
**VALIDATE**: `pnpm --filter @pah/pipeline typecheck && pnpm --filter @pah/pipeline build`

---

### Task 11: CREATE `apps/api/src/crypto/email.ts`

**ACTION**: CREATE email encryption module in API (used by confirm endpoint to encrypt on confirmation)

**IMPLEMENT**: Identical implementation to Task 4 but reading from `apps/api/src/config/env.ts`

```typescript
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto'
import { env } from '../config/env.js'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

const encryptionKey = Buffer.from(env.EMAIL_ENCRYPTION_KEY, 'hex')
// ... identical encryptEmail, decryptEmail, hashEmail functions
```

**GOTCHA**: The `EMAIL_ENCRYPTION_KEY` must be the SAME value in both API and pipeline. The API encrypts on confirm; the pipeline decrypts for sending alerts. Different keys = garbled data.
**VALIDATE**: `pnpm --filter @pah/api typecheck`

---

### Task 12: UPDATE `apps/api/src/config/env.ts`

**ACTION**: ADD `RESEND_API_KEY`, `EMAIL_ENCRYPTION_KEY`, `ALERTS_FROM_EMAIL`, `API_BASE_URL` to env schema

**IMPLEMENT**:

```typescript
const envSchema = z.object({
  DATABASE_URL_READER: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_ENCRYPTION_KEY: z.string().regex(/^[0-9a-f]{64}$/),
  ALERTS_FROM_EMAIL: z.string().email(),
  API_BASE_URL: z.string().url().default('http://localhost:3001'),
})
```

**GOTCHA**: `API_BASE_URL` is used to construct the confirmation email URL: `${env.API_BASE_URL}/api/v1/subscribe/confirm?token=xxx`. In production it's `https://api.autoridade-politica.com.br` (or the same domain). Set default to `http://localhost:3001` for local dev.
**VALIDATE**: `pnpm --filter @pah/api typecheck`

---

### Task 13: CREATE `apps/api/src/repositories/subscription.repository.ts`

**ACTION**: CREATE repository with all DB operations for subscription management

**IMPLEMENT** (4 functions):

```typescript
import { eq, and, lt } from 'drizzle-orm'
import { createHash, randomBytes } from 'node:crypto'
import type { PublicDb } from '@pah/db/clients'
import { pendingSubscriptions, alertSubscriptions, politicians } from '@pah/db/public-schema'

export function createSubscriptionRepository(db: PublicDb) {
  return {
    // Find politician by slug (for subscribe endpoint)
    async findPoliticianBySlug(slug: string): Promise<{ id: string; name: string } | undefined> {
      const rows = await db
        .select({ id: politicians.id, name: politicians.name })
        .from(politicians)
        .where(eq(politicians.slug, slug))
      return rows.at(0)
    },

    // Insert pending subscription (or ignore duplicate within 24h)
    async insertPendingSubscription(params: {
      politicianId: string
      email: string
      confirmTokenHash: string
      expiresAt: Date
    }): Promise<void> {
      await db.insert(pendingSubscriptions).values(params).onConflictDoNothing()
    },

    // Find pending subscription by token hash
    async findPendingByTokenHash(tokenHash: string): Promise<{
      id: string
      politicianId: string
      email: string
      expiresAt: Date
    } | undefined> {
      const rows = await db
        .select({
          id: pendingSubscriptions.id,
          politicianId: pendingSubscriptions.politicianId,
          email: pendingSubscriptions.email,
          expiresAt: pendingSubscriptions.expiresAt,
        })
        .from(pendingSubscriptions)
        .where(eq(pendingSubscriptions.confirmTokenHash, tokenHash))
      return rows.at(0)
    },

    // Move from pending to active (encrypt email, generate unsubscribe token)
    async confirmSubscription(params: {
      pendingId: string
      politicianId: string
      emailEncrypted: string
      emailHash: string
      unsubscribeToken: string
      confirmedAt: Date
    }): Promise<void> {
      await db.transaction(async (tx) => {
        await tx.insert(alertSubscriptions).values({
          politicianId: params.politicianId,
          emailEncrypted: params.emailEncrypted,
          emailHash: params.emailHash,
          unsubscribeToken: params.unsubscribeToken,
          confirmedAt: params.confirmedAt,
        }).onConflictDoNothing() // Idempotent: re-confirm is safe

        await tx.delete(pendingSubscriptions)
          .where(eq(pendingSubscriptions.id, params.pendingId))
      })
    },

    // Delete subscription by unsubscribe token
    async deleteByUnsubscribeToken(token: string): Promise<boolean> {
      const result = await db.delete(alertSubscriptions)
        .where(eq(alertSubscriptions.unsubscribeToken, token))
        .returning({ id: alertSubscriptions.id })
      return result.length > 0
    },

    // Cleanup expired pending subscriptions (called periodically)
    async deleteExpiredPending(): Promise<void> {
      await db.delete(pendingSubscriptions)
        .where(lt(pendingSubscriptions.expiresAt, new Date()))
    },
  }
}

export type SubscriptionRepository = ReturnType<typeof createSubscriptionRepository>
```

**MIRROR**: `apps/api/src/repositories/politician.repository.ts:49-162` — factory pattern, `rows.at(0)`, Drizzle query chains
**IMPORTS**: `eq, and, lt` from `drizzle-orm`, `PublicDb` from `@pah/db/clients`, tables from `@pah/db/public-schema`
**GOTCHA**: `onConflictDoNothing()` on `insertPendingSubscription` — if user tries to subscribe again before confirming, silently ignore (security: don't reveal if email is already pending). Return same 202 to caller.
**GOTCHA**: `db.transaction()` for `confirmSubscription` — insert to `alert_subscriptions` + delete from `pending_subscriptions` must be atomic
**GOTCHA**: `result.length > 0` check on deleteByUnsubscribeToken: if false, token was already used or invalid. Return `false` to service which returns 200 anyway (idempotent unsubscribe).
**VALIDATE**: `pnpm --filter @pah/api typecheck`

---

### Task 14: UPDATE `apps/api/src/hooks/error-handler.ts`

**ACTION**: ADD `TokenNotFoundError` class and its handler case

**IMPLEMENT**: Add after existing error classes:

```typescript
export class TokenNotFoundError extends Error {
  constructor() {
    super('Token not found or expired')
    this.name = 'TokenNotFoundError'
  }
}
```

And in `errorHandler` function, add before the generic handler:

```typescript
if (error instanceof TokenNotFoundError) {
  void reply.status(400).send({
    type: 'https://autoridade-politica.com.br/errors/token-not-found',
    title: 'Token not found or expired',
    status: 400,
    detail: error.message,
    instance: request.url,
  })
  return
}
```

**MIRROR**: `apps/api/src/hooks/error-handler.ts` — existing `NotFoundError` pattern (RFC 7807 shape)
**GOTCHA**: Return `400` for BOTH "token not found" AND "token expired" — same response prevents enumeration attacks (attacker cannot tell which case applies)
**VALIDATE**: `pnpm --filter @pah/api typecheck`

---

### Task 15: CREATE `apps/api/src/schemas/subscription.schema.ts`

**ACTION**: CREATE TypeBox schemas for all 3 endpoints

**IMPLEMENT**:

```typescript
import { Type, type Static } from '@sinclair/typebox'

export const SubscribeParamsSchema = Type.Object({
  slug: Type.String({ minLength: 1, maxLength: 255 }),
})
export type SubscribeParams = Static<typeof SubscribeParamsSchema>

export const SubscribeBodySchema = Type.Object({
  email: Type.String({ format: 'email', maxLength: 254 }),
})
export type SubscribeBody = Static<typeof SubscribeBodySchema>

export const SubscribeResponseSchema = Type.Object({
  message: Type.String(),
})

export const TokenQuerySchema = Type.Object({
  token: Type.String({ minLength: 64, maxLength: 64 }),
})
export type TokenQuery = Static<typeof TokenQuerySchema>

export const TokenResponseSchema = Type.Object({
  message: Type.String(),
})
```

**MIRROR**: `apps/api/src/schemas/politician.schema.ts:1-30` — `Type.Object`, `Static<>` pattern
**GOTCHA**: TypeBox's `format: 'email'` provides runtime validation via Fastify's AJV. Enable `allErrors: false` is default — first error stops validation.
**VALIDATE**: `pnpm --filter @pah/api typecheck`

---

### Task 16: CREATE `apps/api/src/services/subscription.service.ts`

**ACTION**: CREATE service with subscribe/confirm/unsubscribe business logic

**IMPLEMENT**:

```typescript
import { randomBytes, createHash } from 'node:crypto'
import { Resend } from 'resend'
import type { SubscriptionRepository } from '../repositories/subscription.repository.js'
import { NotFoundError, TokenNotFoundError } from '../hooks/error-handler.js'
import { encryptEmail, hashEmail } from '../crypto/email.js'
import { env } from '../config/env.js'

const CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export function createSubscriptionService(
  repository: SubscriptionRepository,
  resend: Resend,
): {
  subscribe: (slug: string, email: string) => Promise<void>
  confirm: (token: string) => Promise<void>
  unsubscribe: (token: string) => Promise<void>
} {
  return {
    async subscribe(slug: string, email: string): Promise<void> {
      const politician = await repository.findPoliticianBySlug(slug)
      if (politician === undefined) throw new NotFoundError('Politician', slug)

      // Generate raw token (sent to user) + hash (stored in DB)
      const rawToken = randomBytes(32).toString('hex') // 64-char hex
      const tokenHash = createHash('sha256').update(rawToken).digest('hex')
      const expiresAt = new Date(Date.now() + CONFIRMATION_TTL_MS)

      await repository.insertPendingSubscription({
        politicianId: politician.id,
        email,
        confirmTokenHash: tokenHash,
        expiresAt,
      })

      const confirmUrl = `${env.API_BASE_URL}/api/v1/subscribe/confirm?token=${rawToken}`
      const { error } = await resend.emails.send({
        from: `PAH <${env.ALERTS_FROM_EMAIL}>`,
        to: [email],
        subject: `Confirme sua inscrição: ${politician.name}`,
        html: `<p>Clique <a href="${confirmUrl}">aqui</a> para confirmar sua inscrição de alertas para <strong>${politician.name}</strong>.</p><p>Este link expira em 24 horas.</p>`,
      })
      if (error) {
        throw new Error(`Resend error [${error.name}]: ${error.message}`)
      }
    },

    async confirm(token: string): Promise<void> {
      const tokenHash = createHash('sha256').update(token).digest('hex')
      const pending = await repository.findPendingByTokenHash(tokenHash)

      if (pending === undefined || pending.expiresAt < new Date()) {
        throw new TokenNotFoundError()
      }

      const emailEncrypted = encryptEmail(pending.email)
      const emailHash = hashEmail(pending.email)
      const unsubscribeToken = randomBytes(32).toString('hex')

      await repository.confirmSubscription({
        pendingId: pending.id,
        politicianId: pending.politicianId,
        emailEncrypted,
        emailHash,
        unsubscribeToken,
        confirmedAt: new Date(),
      })
    },

    async unsubscribe(token: string): Promise<void> {
      // Always return success — idempotent (don't reveal if token existed)
      await repository.deleteByUnsubscribeToken(token)
    },
  }
}

export type SubscriptionService = ReturnType<typeof createSubscriptionService>
```

**MIRROR**: `apps/api/src/services/politician.service.ts` — factory function, dependency injection
**GOTCHA**: `confirm` — check BOTH `pending === undefined` AND `pending.expiresAt < new Date()` and throw SAME error (no differentiation — security)
**GOTCHA**: `unsubscribe` — always 200, even if token not found (idempotent; prevents confirmation of subscription existence)
**VALIDATE**: `pnpm --filter @pah/api typecheck`

---

### Task 17: CREATE `apps/api/src/routes/subscriptions.route.ts`

**ACTION**: CREATE Fastify route plugin with 3 endpoints

**IMPLEMENT**:

```typescript
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import {
  SubscribeParamsSchema,
  SubscribeBodySchema,
  SubscribeResponseSchema,
  TokenQuerySchema,
  TokenResponseSchema,
} from '../schemas/subscription.schema.js'
import type { SubscriptionService } from '../services/subscription.service.js'

interface RouteDeps {
  subscriptionService: SubscriptionService
}

export function createSubscriptionsRoute(deps: RouteDeps): FastifyPluginAsyncTypebox {
  // eslint-disable-next-line @typescript-eslint/require-await
  return async (app) => {
    app.post(
      '/politicians/:slug/subscribe',
      {
        schema: {
          params: SubscribeParamsSchema,
          body: SubscribeBodySchema,
          response: { 202: SubscribeResponseSchema },
        },
      },
      async (request, reply) => {
        const { slug } = request.params
        const { email } = request.body
        await deps.subscriptionService.subscribe(slug, email)
        return reply.status(202).send({ message: 'Verifique seu email para confirmar a inscrição.' })
      },
    )

    app.get(
      '/subscribe/confirm',
      {
        schema: {
          querystring: TokenQuerySchema,
          response: { 200: TokenResponseSchema },
        },
      },
      async (request) => {
        await deps.subscriptionService.confirm(request.query.token)
        return { message: 'Inscrição confirmada com sucesso. Você receberá alertas por email.' }
      },
    )

    app.get(
      '/subscribe/unsubscribe',
      {
        schema: {
          querystring: TokenQuerySchema,
          response: { 200: TokenResponseSchema },
        },
      },
      async (request) => {
        await deps.subscriptionService.unsubscribe(request.query.token)
        return { message: 'Inscrição cancelada com sucesso.' }
      },
    )
  }
}
```

**MIRROR**: `apps/api/src/routes/politicians.route.ts:1-72` — exact same route factory pattern
**GOTCHA**: POST endpoint returns `202 Accepted` (not 201 Created) — the subscription is pending confirmation, not yet created
**GOTCHA**: `// eslint-disable-next-line @typescript-eslint/require-await` is needed on outer `return async (app) =>` (Fastify 5 + plugin async requirement — see politician route line 22)
**VALIDATE**: `pnpm --filter @pah/api typecheck`

---

### Task 18: UPDATE `apps/api/src/app.ts`

**ACTION**: ADD Resend client, subscription repository, service, and route registration

**IMPLEMENT**: Following the existing DI pattern at lines 53-77:

```typescript
// Add import at top
import { Resend } from 'resend'
import { createSubscriptionRepository } from './repositories/subscription.repository.js'
import { createSubscriptionService } from './services/subscription.service.js'
import { createSubscriptionsRoute } from './routes/subscriptions.route.js'

// Inside buildApp(), after existing DI setup:
const resend = new Resend(env.RESEND_API_KEY)
const subscriptionRepository = createSubscriptionRepository(db) // db = existing publicDb
const subscriptionService = createSubscriptionService(subscriptionRepository, resend)

// Register route (add after existing politicians route)
void app.register(createSubscriptionsRoute({ subscriptionService }), { prefix: '/api/v1' })
```

**MIRROR**: `apps/api/src/app.ts:53-77` — exact same DI and registration pattern
**GOTCHA**: Resend SDK requires Node.js >=20. Verify runtime with `node --version` before deployment.
**GOTCHA**: Use the existing `db` (`createPublicDb`) — the migration grants INSERT/DELETE to `api_reader` on subscription tables, so no new DB connection needed
**VALIDATE**: `pnpm --filter @pah/api typecheck && pnpm --filter @pah/api build`

---

### Task 19: CREATE `apps/web/src/components/politician/subscribe-form.tsx`

**ACTION**: CREATE Client Component with form states: idle → loading → success/error

**IMPLEMENT**:

```typescript
'use client'

import { useState, type FormEvent } from 'react'

interface SubscribeFormProps {
  slug: string
}

type FormState = 'idle' | 'loading' | 'success' | 'error'

export function SubscribeForm({ slug }: SubscribeFormProps): React.JSX.Element {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<FormState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setState('loading')

    try {
      const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'
      const response = await fetch(`${apiUrl}/politicians/${encodeURIComponent(slug)}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        const body = await response.json() as { title?: string }
        setErrorMsg(body.title ?? 'Erro ao processar inscrição.')
        setState('error')
        return
      }

      setState('success')
    } catch {
      setErrorMsg('Erro de conexão. Tente novamente.')
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <div role="status" aria-live="polite" className="rounded-md border border-border p-4 text-sm">
        <p>Verifique seu email para confirmar a inscrição de alertas.</p>
      </div>
    )
  }

  return (
    <section aria-labelledby="subscribe-heading" className="mt-8 rounded-md border border-border p-4">
      <h2 id="subscribe-heading" className="mb-3 text-sm font-medium">
        Receber alertas de atualização de pontuação
      </h2>
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="subscribe-email" className="sr-only">Email</label>
        <input
          id="subscribe-email"
          type="email"
          required
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          aria-label="Endereço de email para alertas"
          disabled={state === 'loading'}
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={state === 'loading' || email.length === 0}
          aria-busy={state === 'loading'}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {state === 'loading' ? 'Enviando...' : 'Inscrever-se'}
        </button>
      </form>
      {state === 'error' && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {errorMsg}
        </p>
      )}
    </section>
  )
}
```

**MIRROR**: `apps/web/src/components/filters/search-bar.tsx` — `'use client'`, `useState`, form pattern
**MIRROR**: Existing CSS class naming in profile page components (border-border, text-sm, rounded-md)
**GOTCHA**: `void handleSubmit(e)` in `onSubmit` — handles the Promise without `await` at the event level (required for TypeScript strict)
**GOTCHA**: `aria-live="polite"` on success state, `role="alert"` on error — WCAG 2.1 AA live region requirement
**GOTCHA**: `disabled` on input during loading — prevents double-submit
**GOTCHA**: DR-002 compliance — no editorial language; "receber alertas de atualização de pontuação" is factual
**VALIDATE**: `pnpm --filter @pah/web typecheck`

---

### Task 20: UPDATE `apps/web/src/app/politicos/[slug]/page.tsx`

**ACTION**: Import `<SubscribeForm>` and render it before `</main>` (after methodology note at line 192)

**IMPLEMENT**: Add import at top:

```typescript
import { SubscribeForm } from '../../../components/politician/subscribe-form'
```

Add before `</main>` (after the existing methodology version paragraph):

```typescript
{/* Score alert subscription (RF-POST-002) */}
<SubscribeForm slug={politician.slug} />
```

**MIRROR**: Existing component import pattern in the file (line 5-8)
**GOTCHA**: Server Component importing a Client Component — Next.js handles this automatically; `'use client'` in SubscribeForm marks it as a client island
**GOTCHA**: Use `politician.slug` (not the URL `slug` param) — they should be the same but `politician.slug` is the canonical value from the DB
**VALIDATE**: `pnpm --filter @pah/web typecheck && pnpm --filter @pah/web build`

---

### Task 21: UPDATE `.env.example`

**ACTION**: ADD all new environment variables with placeholder values

**IMPLEMENT**: Add to the appropriate sections:

```bash
# RF-POST-002: Email Alerts
RESEND_API_KEY=re_your_resend_api_key_here
EMAIL_ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000
ALERTS_FROM_EMAIL=noreply@autoridade-politica.com.br
API_BASE_URL=https://api.autoridade-politica.com.br
```

**GOTCHA**: `EMAIL_ENCRYPTION_KEY` placeholder must be exactly 64 hex chars (32 bytes). The zero-padded value shown is a valid placeholder — never a real key.
**GOTCHA**: `RESEND_API_KEY` must be set in BOTH `apps/api/.env.local` and `apps/pipeline/.env.local` (two separate processes, same key)
**VALIDATE**: Verify `.env.example` has all new vars; ensure no actual secrets are committed

---

### Task 22: Write Unit Tests

**ACTION**: Create test files for the critical new modules

**22a. CREATE `apps/pipeline/src/crypto/email.test.ts`**:

```typescript
import { describe, it, expect, vi, beforeAll } from 'vitest'

// MUST stub env BEFORE dynamic import (module-level key read)
vi.stubEnv('EMAIL_ENCRYPTION_KEY', 'a'.repeat(64))
vi.stubEnv('DATABASE_URL_WRITER', 'postgresql://test:test@localhost:5432/test')
vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test')
vi.stubEnv('RESEND_API_KEY', 'test-key')
vi.stubEnv('ALERTS_FROM_EMAIL', 'test@test.com')

const { encryptEmail, decryptEmail, hashEmail } = await import('./email.js')

describe('encryptEmail / decryptEmail', () => {
  it('round-trips plaintext email', () => {
    const email = 'user@example.com'
    expect(decryptEmail(encryptEmail(email))).toBe(email)
  })
  it('produces different ciphertexts for same input (random IV)', () => {
    const email = 'user@example.com'
    expect(encryptEmail(email)).not.toBe(encryptEmail(email))
  })
})

describe('hashEmail', () => {
  it('normalizes to lowercase before hashing', () => {
    expect(hashEmail('USER@EXAMPLE.COM')).toBe(hashEmail('user@example.com'))
  })
  it('produces 64-char hex string', () => {
    expect(hashEmail('user@example.com')).toMatch(/^[0-9a-f]{64}$/)
  })
})
```

**22b. CREATE `apps/api/src/services/subscription.service.test.ts`**:

```typescript
import { describe, it, expect, vi, beforeAll } from 'vitest'

// Stub env BEFORE any import that reads process.env at module level
vi.stubEnv('EMAIL_ENCRYPTION_KEY', 'a'.repeat(64))
vi.stubEnv('RESEND_API_KEY', 'test-key')
vi.stubEnv('ALERTS_FROM_EMAIL', 'test@test.com')
vi.stubEnv('API_BASE_URL', 'http://localhost:3001')

// Test subscribe: politician not found → throws NotFoundError
// Test subscribe: sends confirmation email, calls insertPendingSubscription
// Test confirm: token not found → throws TokenNotFoundError
// Test confirm: expired token → throws TokenNotFoundError
// Test confirm: valid token → calls confirmSubscription + encryptEmail
// Test unsubscribe: always returns void (idempotent)
```

**MIRROR**: `apps/api/src/services/politician.service.test.ts:1-50` — build factory pattern, mock repository
**MIRROR**: `apps/pipeline/src/publisher/publisher.test.ts:1-127` — `vi.stubEnv` before imports
**VALIDATE**: `pnpm --filter @pah/pipeline test && pnpm --filter @pah/api test`

---

## Testing Strategy

### Unit Tests to Write

| Test File | Test Cases | Validates |
|---|---|---|
| `apps/pipeline/src/crypto/email.test.ts` | round-trip, random IV, hash normalization | AES-256-GCM crypto |
| `apps/api/src/services/subscription.service.test.ts` | all happy + error paths | Double opt-in logic |
| `apps/pipeline/src/services/scoring.service.test.ts` | needsAlert=true (diff≥5), needsAlert=false (diff<5), first-run (no prev score) | Diff detection |

### Edge Cases Checklist

- [ ] User tries to subscribe twice before confirming → silent 202 (idempotent)
- [ ] User tries to subscribe after confirming → `onConflictDoNothing()` on unique constraint → 202
- [ ] Confirmation token expired (>24h) → 400 same as invalid
- [ ] Invalid token format → 400 (AJV validates `minLength: 64, maxLength: 64`)
- [ ] Resend returns error (daily quota exceeded) → 500 with logged error
- [ ] Pipeline: first-run politician (no existing score) → `needsAlert = false`
- [ ] Pipeline: score changes exactly 5 points → `needsAlert = true` (boundary condition)
- [ ] Pipeline: score changes 4 points → `needsAlert = false`
- [ ] Unsubscribe with already-used token → 200 (idempotent)

---

## Validation Commands

### Level 1: STATIC_ANALYSIS

```bash
pnpm --filter @pah/api typecheck
pnpm --filter @pah/pipeline typecheck
pnpm --filter @pah/web typecheck
pnpm --filter @pah/db typecheck
pnpm lint
```

**EXPECT**: Exit 0, no errors or warnings

### Level 2: UNIT_TESTS

```bash
pnpm --filter @pah/api test
pnpm --filter @pah/pipeline test
pnpm --filter @pah/web test
```

**EXPECT**: All tests pass

### Level 3: FULL_SUITE

```bash
pnpm build
vercel build --yes
```

**EXPECT**: Both pass. `vercel build` catches Next.js-specific issues that `typecheck` misses.

### Level 4: DATABASE_VALIDATION

After `supabase db reset` (local):

- [ ] `SELECT * FROM public.pending_subscriptions LIMIT 1` → returns columns as defined
- [ ] `SELECT * FROM public.alert_subscriptions LIMIT 1` → returns columns as defined
- [ ] `SET ROLE api_reader; INSERT INTO public.pending_subscriptions ...` → succeeds
- [ ] `SET ROLE api_reader; SELECT * FROM internal_data.exclusion_records` → permission denied

### Level 5: BROWSER_VALIDATION (manual flow)

1. Start local stack: `supabase start` + `pnpm --filter @pah/api dev` + `pnpm --filter @pah/web dev`
2. Navigate to `/politicos/{any-slug}` → verify `<SubscribeForm>` renders at bottom
3. Enter email → click "Inscrever-se" → verify success state ("Verifique seu email")
4. Check Resend dashboard (or mock) → verify confirmation email was sent
5. GET `http://localhost:3001/api/v1/subscribe/confirm?token={token}` → verify 200 JSON response
6. GET `http://localhost:3001/api/v1/subscribe/unsubscribe?token={unsubscribeToken}` → verify 200 JSON

### Level 6: MANUAL_VALIDATION

```bash
# Test subscribe endpoint
curl -X POST http://localhost:3001/api/v1/politicians/{slug}/subscribe \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com"}' \
  -w "\nHTTP %{http_code}\n"
# EXPECT: HTTP 202

# Test invalid email
curl -X POST http://localhost:3001/api/v1/politicians/{slug}/subscribe \
  -H 'Content-Type: application/json' \
  -d '{"email":"not-an-email"}' \
  -w "\nHTTP %{http_code}\n"
# EXPECT: HTTP 400 (AJV validation)

# Test invalid token
curl "http://localhost:3001/api/v1/subscribe/confirm?token=invalidtoken" -w "\nHTTP %{http_code}\n"
# EXPECT: HTTP 400 (AJV minLength:64 fails before handler)

# Test unsubscribe (idempotent)
curl "http://localhost:3001/api/v1/subscribe/unsubscribe?token=${'a'.repeat(64)}" -w "\nHTTP %{http_code}\n"
# EXPECT: HTTP 200
```

---

## Acceptance Criteria

- [ ] `POST /api/v1/politicians/:slug/subscribe` returns 202, inserts pending subscription, sends Resend confirmation email
- [ ] `GET /api/v1/subscribe/confirm?token=` returns 200, moves pending → active (encrypted), deletes pending
- [ ] `GET /api/v1/subscribe/unsubscribe?token=` returns 200 always (idempotent)
- [ ] `<SubscribeForm>` renders on politician profile page with correct states (idle/loading/success/error)
- [ ] Pipeline: `scorePolitician()` returns `needsAlert: true` when diff ≥ 5 or exclusion_flag changes
- [ ] Pipeline: `boss.send('score-alert', ...)` called when `needsAlert = true`
- [ ] Score-alert worker: decrypts emails, sends via Resend, never logs plaintext email
- [ ] Level 1-3 validation commands pass with exit 0
- [ ] axe-core: zero violations on `/politicos/[slug]` (SubscribeForm is accessible)
- [ ] DB: `api_reader` has INSERT/DELETE on `pending_subscriptions`, INSERT/UPDATE/DELETE on `alert_subscriptions`
- [ ] DB: `api_reader` cannot SELECT from `internal_data.*` (regression check)
- [ ] No CPF or plaintext email in logs or API responses (DR-005 / LGPD)

---

## Completion Checklist

- [ ] All 22 tasks completed in dependency order
- [ ] Each task validated immediately after completion
- [ ] Level 1: `pnpm lint && pnpm typecheck` passes
- [ ] Level 2: `pnpm test` passes (pipeline + API + web)
- [ ] Level 3: `pnpm build && vercel build --yes` passes
- [ ] Level 4: Database validation passes
- [ ] Level 5: Browser manual flow works end-to-end
- [ ] All acceptance criteria met

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `api_reader` write grants on subscription tables break existing security model | LOW | HIGH | Migration is targeted (specific tables only); `internal_data` remains inaccessible; regression check in AC |
| Resend free tier (3.000 emails/month) exceeded with high subscription volume | MEDIUM | MEDIUM | Rate-limit subscribe endpoint via `@fastify/rate-limit` (3 req/IP/hour); Resend quota alert at 80% |
| Email ENCRYPTION_KEY mismatch between API (encrypts) and pipeline (decrypts) | LOW | HIGH | Same env var name in both; documented in .env.example; Level 4 validation includes encrypt+decrypt cycle |
| pg-boss v10 `boss.send` called before `createQueue` → job silently dropped | MEDIUM | MEDIUM | Task 9 explicitly calls `createQueue('score-alert', ...)` during startup before any workers |
| `scoring.service.ts` extra query (fetch prev score) adds latency to pipeline | LOW | LOW | Single indexed query per politician; pipeline runs daily; +5ms per politician is acceptable |
| `decryptEmail` throws `ERR_CRYPTO_GCM_AUTH_TAG_MISMATCH` if DB record is corrupted | LOW | MEDIUM | Wrap `processScoreAlert` in try/catch; log error with jobId; skip corrupted record; pg-boss retries |
| Resend `from` domain not verified in production | MEDIUM | HIGH | Must verify `autoridade-politica.com.br` in Resend dashboard BEFORE first production deploy |

---

## Notes

### Critical Architecture Decision: api_reader Write Grants

The existing architecture grants `api_reader` SELECT-only on all `public.*` tables. For subscription management, we **extend** `api_reader` with targeted INSERT/UPDATE/DELETE on `pending_subscriptions` and `alert_subscriptions` only. This is architecturally sound because:

1. Both tables are in `public` schema (user-facing, LAI-compliant data)
2. No sensitive internal data (exclusion records, CPF hashes) are exposed
3. The security boundary (ADR-001) protects `internal_data` — subscription tables don't cross this boundary
4. This avoids adding a second DB connection to the API

### EMAIL_ENCRYPTION_KEY in Both API and Pipeline

The email must be encrypted by the API on confirmation and decrypted by the pipeline on alert sending. Both processes need the SAME key. The key is set as `EMAIL_ENCRYPTION_KEY` in both process environments. In Supabase production, set this in the API's Supabase Edge Function secrets AND in the pipeline's GitHub Actions secrets. They MUST match.

### Token Security Model

- **Confirmation token**: raw 32-byte hex → user email link; SHA-256 hash → stored in DB. If DB is compromised, attacker cannot replay tokens (same model as password reset best practices).
- **Unsubscribe token**: 32-byte hex stored as plaintext. Unsubscribing is a low-privilege operation; the worst case is someone unsubscribes a user. Acceptable risk for MVP.

### Resend Production Setup

Before deploying Phase 4 to production:

1. Create Resend account and verify `autoridade-politica.com.br` domain
2. Set up DNS records (DKIM, SPF, DMARC) for `autoridade-politica.com.br`
3. Create API key in Resend dashboard
4. Set `RESEND_API_KEY` in both Vercel env vars (API) and GitHub Actions secrets (pipeline)
5. Free tier: 100 emails/day, 3.000/month — sufficient for MVP post; upgrade to Pro ($20/mo) when needed
