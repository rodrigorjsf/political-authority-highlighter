# RF-013 Data Ingestion Pipeline — Stack Documentation

> Last updated: 2026-03-10
> Covers: pg-boss 10.4.2 | Drizzle ORM upsert/transactions | csv-parse 6.1.0 | fast-xml-parser 5.4.2 | Node.js crypto (AES-256-GCM) | p-limit 7.3.0 | axios-retry 4.5.0

---

## Critical Version Note

The project specifies **pg-boss 10.x** (CLAUDE.md, ARCHITECTURE.md, ADR-003). The npm **latest** tag is v12.14.0. Install explicitly:

```bash
pnpm add pg-boss@^10.4.2
```

Key engine requirements: Node >=20 (pg-boss v10), Node >=20 (p-limit v7).

---

## 1. pg-boss v10.4.2 — Job Queue

**Source:** [GitHub timgit/pg-boss](https://github.com/timgit/pg-boss) | [npm pg-boss](https://www.npmjs.com/package/pg-boss)
**Types:** Full TypeScript definitions in `types.d.ts`
**Dependencies:** `pg` (node-postgres), `cron-parser`, `serialize-error`

> IMPORTANT: pg-boss v10 connects using `pg` (node-postgres), NOT `postgres-js`. This means pg-boss needs its own connection separate from the Drizzle `createPipelineDb()` client which uses `postgres-js`. Pass a connection string and pg-boss manages its own pool (default `max: 10`).

### 1.1 Constructor

```typescript
import PgBoss from 'pg-boss'

const boss = new PgBoss({
  connectionString: process.env['DATABASE_URL_WRITER'],  // port 5432, direct (not pooler)
  schema: 'pgboss',                // dedicated schema, separate from public/internal_data
  schedule: true,                  // enable cron scheduling (default true)
  supervise: true,                 // enable maintenance (default true)
  migrate: true,                   // run schema migrations on start() (default true)
  retryLimit: 3,                   // default retry limit for all queues
  retryDelay: 30,                  // seconds between retries
  retryBackoff: true,              // exponential backoff (retryDelay * 2^retryCount)
  deleteAfterDays: 7,              // retain completed jobs 7 days
})

await boss.start()
```

**Gotcha — Supabase connection:** pg-boss must use the **direct URL** (port 5432), never the pooler (port 6543). pg-boss requires long-lived connections for its maintenance supervisor. See `supabase-best-practices.md`.

**Gotcha — Schema isolation:** pg-boss creates its own `pgboss` schema with job tables. This is distinct from the project's `public` and `internal_data` schemas. The `pipeline_admin` role must have `CREATE` privilege on the `pgboss` schema (or it must pre-exist).

### 1.2 Queue Creation (Required Before send/work)

In v10, queues **must be created** before jobs can be sent. This is a breaking change from v9.

```typescript
// Create queues at app startup, before registering workers
await boss.createQueue('pipeline:camara', {
  policy: 'singleton',       // only 1 active job at a time (one run per adapter)
  retryLimit: 3,
  retryDelay: 60,            // 60s between retries
  retryBackoff: true,        // exponential: 60s, 120s, 240s
  deadLetter: 'pipeline:dlq', // failed jobs go here after exhausting retries
  expireInSeconds: 3600,     // 1 hour max per run
})

// Dead letter queue for manual inspection
await boss.createQueue('pipeline:dlq', {
  policy: 'standard',
  retryLimit: 0,             // never auto-retry DLQ jobs
})
```

**Queue policy `singleton`** is the right choice for data pipeline adapters: ensures only one adapter run is active at any time, even if the cron fires again before the previous run completes.

### 1.3 Scheduling — Multiple Independent Jobs

`schedule(name, cron, data?, options?)` — if the schedule already exists, it's updated.

```typescript
// Register 6 independent cron schedules — one per source adapter
// Schedules are stored in the DB and survive process restarts
const SCHEDULES: Array<{ name: string; cron: string; tz: string }> = [
  { name: 'pipeline:camara',        cron: '0 2 * * *', tz: 'America/Sao_Paulo' },  // 02:00 BRT
  { name: 'pipeline:senado',        cron: '0 3 * * *', tz: 'America/Sao_Paulo' },  // 03:00 BRT
  { name: 'pipeline:transparencia', cron: '0 4 * * *', tz: 'America/Sao_Paulo' },  // 04:00 BRT
  { name: 'pipeline:tse',           cron: '0 5 * * *', tz: 'America/Sao_Paulo' },  // 05:00 BRT (weekly on Sunday)
  { name: 'pipeline:tcu',           cron: '0 6 * * *', tz: 'America/Sao_Paulo' },  // 06:00 BRT
  { name: 'pipeline:cgu',           cron: '0 7 * * *', tz: 'America/Sao_Paulo' },  // 07:00 BRT
]

for (const { name, cron, tz } of SCHEDULES) {
  await boss.schedule(name, cron, null, { tz })
}
```

**Gotcha — Cron format:** pg-boss uses 5-placeholder minute-level format. Do NOT use 6-placeholder second-level format — it's discouraged and may run unreliably.

**Gotcha — Minimum interval:** Schedules are checked every 30 seconds. Sub-minute scheduling is unreliable. All pipeline adapters run daily, so this is fine.

**Gotcha — `schedule()` vs `createSchedule()`:** v10 uses `schedule()`. The `createSchedule()` name appears in v12 docs. Do not confuse them.

### 1.4 Workers — Consuming Jobs

```typescript
// v10 handler receives an ARRAY of jobs (always)
await boss.work<void>(
  'pipeline:camara',
  { batchSize: 1, pollingIntervalSeconds: 10 },
  async ([job]) => {
    // job.data is void/null (cron jobs send null data)
    await runCamaraAdapter()
  },
)
```

**`work()` options in v10:**

| Option | Default | Notes |
|--------|---------|-------|
| `batchSize` | 1 | Jobs fetched per poll. Keep at 1 for pipeline adapters. |
| `pollingIntervalSeconds` | 2 | How often to poll. 10s is fine for daily pipelines. |
| `priority` | true | Respect job priority. |
| `includeMetadata` | false | Set true to access retry counts, etc. |

**Removed in v10 (from v9):** `teamSize`, `teamConcurrency`, `teamRefill` are **gone**. The new concurrency model uses `localConcurrency` (v12 feature — not available in v10.4.2). In v10, concurrency is controlled by calling `work()` multiple times or using the `batchSize` option.

**Handler receives array:** Always destructure `([job])` for single-job processing. For batch, iterate over the array.

### 1.5 Retry Configuration

Retries are **opt-out** in v10 (default `retryLimit: 2`). Non-idempotent handlers must explicitly set `retryLimit: 0` — but all pipeline adapters should be idempotent via upsert.

```typescript
// Exponential backoff formula (from source):
// delay = Math.min(retryDelayMax, retryDelay * (2^min(16,retryCount)/2 + 2^min(16,retryCount)/2 * Math.random()))
// Example with retryDelay=60: ~60s, ~180s, ~480s (with jitter)
```

### 1.6 Error Handling

```typescript
boss.on('error', (error) => {
  logger.error({ err: error }, 'pg-boss error')
})

// Unhandled errors in work() handlers automatically call fail() on the job
// Failed jobs route to deadLetter queue after exhausting retryLimit
```

### 1.7 Graceful Shutdown

```typescript
process.on('SIGTERM', async () => {
  await boss.stop({ graceful: true, timeout: 30_000 })  // wait up to 30s for active jobs
  process.exit(0)
})
```

---

## 2. Drizzle ORM — Upsert & Transaction Patterns

**Version:** `drizzle-orm@^0.36.0` | **Driver:** `postgres-js` (NOT `pg`)

> Full Drizzle reference: `docs/stack/drizzle-orm.md`. This section covers upsert and transaction patterns specific to the pipeline.

### 2.1 Composite Upsert (Idempotency Key Pattern)

The pipeline's idempotency key is a composite of `source` + `external_id`. Use `onConflictDoUpdate` with an array target:

```typescript
import { sql } from 'drizzle-orm'

// Upsert a single record
await db
  .insert(rawSourceData)
  .values({
    source: 'camara',
    externalId: '12345',
    politicianSlug: 'joao-silva-sp',
    rawJson: JSON.stringify(data),
    fetchedAt: new Date(),
  })
  .onConflictDoUpdate({
    target: [rawSourceData.source, rawSourceData.externalId],  // composite unique constraint
    set: {
      rawJson: sql`excluded.raw_json`,          // use excluded.column_name for the new value
      fetchedAt: sql`excluded.fetched_at`,
      updatedAt: new Date(),
    },
  })
```

**Gotcha — `excluded` keyword:** PostgreSQL's `excluded` refers to the row that would have been inserted. Use `sql`excluded.column_name`` (snake_case column name from DB, not camelCase Drizzle field name).

**Gotcha — composite target array:** Pass `[table.col1, table.col2]` as an array. This requires a `UNIQUE` constraint (or unique index) on `(source, external_id)` in the migration.

**Gotcha — `setWhere` for conditional updates:** Use when you only want to update if the new value is actually different:

```typescript
.onConflictDoUpdate({
  target: [rawSourceData.source, rawSourceData.externalId],
  set: { rawJson: sql`excluded.raw_json`, fetchedAt: sql`excluded.fetched_at` },
  setWhere: sql`excluded.fetched_at > ${rawSourceData.fetchedAt}`,  // only update if newer
})
```

### 2.2 Batch Upsert (Multiple Rows)

Pass an array to `.values()` — Drizzle generates a single `INSERT ... VALUES (...), (...), ...` statement:

```typescript
// Batch upsert 100 records in one SQL statement
const batch = politicians.map((p) => ({
  source: 'camara' as const,
  externalId: p.id,
  name: p.name,
  // ...
}))

await db
  .insert(publicPoliticians)
  .values(batch)  // single INSERT with N value rows
  .onConflictDoUpdate({
    target: publicPoliticians.slug,
    set: {
      name: sql`excluded.name`,
      party: sql`excluded.party`,
      photoUrl: sql`excluded.photo_url`,
      active: sql`excluded.active`,
    },
  })
```

**Performance note:** For large batches (>500 rows), split into chunks of 200-500 to avoid exceeding PostgreSQL's parameter limit ($1..$65535). The postgres-js driver may also impose limits.

```typescript
// Chunk helper
function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size),
  )
}

for (const rows of chunk(batch, 200)) {
  await db.insert(table).values(rows).onConflictDoUpdate({ ... })
}
```

### 2.3 Transactions for Multi-Table Pipeline Writes

When a single pipeline run writes to multiple tables (e.g., politicians + integrity_scores + data_source_status), wrap in a transaction:

```typescript
await db.transaction(async (tx) => {
  // 1. Upsert politicians
  await tx.insert(politicians).values(politicianRows).onConflictDoUpdate({ ... })

  // 2. Upsert integrity scores
  await tx.insert(integrityScores).values(scoreRows).onConflictDoUpdate({ ... })

  // 3. Mark source as successfully ingested
  await tx.insert(dataSourceStatus).values({
    source: 'camara',
    lastSuccessAt: new Date(),
    recordCount: politicianRows.length,
  }).onConflictDoUpdate({
    target: dataSourceStatus.source,
    set: { lastSuccessAt: sql`excluded.last_success_at`, recordCount: sql`excluded.record_count` },
  })
})
// If any step throws, the entire transaction rolls back automatically
```

**Gotcha — `db.batch()` is NOT for postgres-js:** The Drizzle batch API (`db.batch([...])`) only works with LibSQL, Neon, and D1 drivers. For postgres-js, use `db.transaction()` instead.

### 2.4 Numeric Type Handling — CRITICAL GOTCHA

PostgreSQL's `numeric` / `decimal` type is returned as a **string** by the `postgres-js` driver (and `pg`). This is a known issue:

- [Issue #1042](https://github.com/drizzle-team/drizzle-orm/issues/1042)
- [Issue #570](https://github.com/drizzle-team/drizzle-orm/issues/570)

**For expense amounts (financial data — `numeric(12,2)`):**

```typescript
// Schema definition — use mode: 'string' (default) to preserve precision
// DO NOT use mode: 'number' for financial data — floating-point precision loss
amount: numeric('amount', { precision: 12, scale: 2 }),
// TypeScript type: string (correct — avoids float rounding errors like 1.1 + 2.2 = 3.3000000000000003)

// When computing aggregates in application code, use a decimal library or parse carefully:
import Decimal from 'decimal.js'  // or use parseFloat only for display formatting
const total = rows.reduce((sum, row) => sum.plus(new Decimal(row.amount ?? '0')), new Decimal(0))

// For score components (integers 0-25), integer fields are fine:
overallScore: integer('overall_score').notNull()
```

**For non-financial numeric aggregation in SQL (preferred):**

```typescript
// Let PostgreSQL do the aggregation — avoids string conversion entirely
const [{ totalExpenses }] = await db
  .select({ totalExpenses: sql<string>`sum(${expenses.amount})::text` })
  .from(expenses)
  .where(eq(expenses.politicianId, id))
// Parse the string result once at the boundary
const total = parseFloat(totalExpenses ?? '0')
```

---

## 3. csv-parse v6.1.0 — Streaming CSV for TSE and CGU-PAD

**Source:** [csv.js.org/parse](https://csv.js.org/parse) | [npm csv-parse](https://www.npmjs.com/package/csv-parse)
**Module type:** ESM (`"type": "module"`)
**Engine:** Node.js (no specific minimum stated)

### 3.1 Async Iterator Pattern (Preferred for Large Files)

TSE and CGU-PAD export CSV files that can be 50–200MB. Use async iterator with `fs.createReadStream` to avoid loading into memory:

```typescript
import { createReadStream } from 'node:fs'
import { parse } from 'csv-parse'

interface TseRecord {
  cpf: string
  name: string
  party: string
  state: string
  role: string
}

async function* parseTseCsv(filePath: string): AsyncGenerator<TseRecord> {
  const parser = createReadStream(filePath).pipe(
    parse({
      columns: true,            // use first row as header → objects, not arrays
      delimiter: ';',           // TSE uses semicolons
      encoding: 'latin1',       // TSE files are ISO-8859-1 / latin1
      bom: true,                // strip BOM if present
      skip_empty_lines: true,   // ignore blank rows
      trim: true,               // strip whitespace around field values
      relax_quotes: true,       // handle improperly quoted fields
      cast: false,              // keep all values as strings (parse manually)
      from_line: 1,             // skip no lines (header is row 1 with columns:true)
    }),
  )

  for await (const record of parser) {
    yield record as TseRecord
  }
}

// Usage in adapter:
for await (const record of parseTseCsv('/tmp/tse-candidatos.csv')) {
  await processRecord(record)
}
```

**Gotcha — Brazilian government CSV encodings:** TSE uses ISO-8859-1 (latin1). CGU-PAD may use UTF-8 with BOM. Always set `encoding` explicitly and `bom: true`.

**Gotcha — Delimiter:** TSE uses `;` as delimiter. Camara/Senado JSON APIs don't produce CSV. Check each source's documentation.

**Gotcha — `cast: false`:** Keep as strings for government data. Never auto-cast CPF fields to numbers (leading zeros are lost). Parse numeric fields explicitly where needed.

**Gotcha — Backpressure:** The async iterator automatically handles backpressure. Do NOT use `data` events + unbounded `Promise.all()` inside them — this defeats backpressure and can OOM on large files.

### 3.2 stream.pipeline() for Node.js Pipeline Composition

For writing parsed rows directly to a transform:

```typescript
import { pipeline } from 'node:stream/promises'
import { createReadStream } from 'node:fs'
import { parse } from 'csv-parse'
import { Transform } from 'node:stream'

await pipeline(
  createReadStream('/tmp/cgu-pad.csv'),
  parse({ columns: true, delimiter: ';', encoding: 'latin1', bom: true }),
  new Transform({
    objectMode: true,
    async transform(record, _enc, callback) {
      try {
        await upsertExclusionRecord(record)
        callback()
      } catch (err) {
        callback(err instanceof Error ? err : new Error(String(err)))
      }
    },
  }),
)
```

---

## 4. fast-xml-parser v5.4.2 — Senado REST/XML Parsing

**Source:** [GitHub NaturalIntelligence/fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser)
**npm:** [fast-xml-parser](https://www.npmjs.com/package/fast-xml-parser)

### 4.1 Security-Hardened Configuration (REQUIRED)

Two CVEs affect entity processing in fast-xml-parser:

- **CVE-2023-34104** (GHSA-6w63-h3fj-q4vw): Regex injection via DOCTYPE entities. Fixed in **v4.2.4**.
- **CVE-2026-25896** (GHSA-m7jm-9gc2-mpf2): Entity encoding bypass via regex injection. Affects recent versions; patched in **v5.3.6**.
- **CVE-2026-26278**: XML entity expansion (DoS). Fixed in **v5.3.5+**.

**Use v5.4.2** (latest) and disable entity processing for all government XML:

```typescript
import { XMLParser } from 'fast-xml-parser'

// Secure parser factory — use for ALL Senado XML responses
function createSecureXmlParser(): XMLParser {
  return new XMLParser({
    processEntities: false,        // CRITICAL: disables all entity expansion (CVE mitigation)
    ignoreDeclaration: true,       // strip <?xml version="1.0"?> declaration
    ignorePiTags: true,            // strip processing instructions
    allowBooleanAttributes: false, // strict attribute parsing
    parseTagValue: true,           // convert "123" → number in tag text (useful for IDs)
    parseAttributeValue: false,    // keep attributes as strings (safer for untrusted data)
    trimValues: true,              // normalize whitespace
    ignoreAttributes: false,       // parse attributes (needed for Senado XML)
    attributeNamePrefix: '@_',     // prefix to distinguish attributes from children
    isArray: (_name, _jpath, _isLeafNode, isAttribute) => !isAttribute,
    // ^ treat all non-attribute values as arrays to normalize single vs. multiple element responses
  })
}

// Usage:
const parser = createSecureXmlParser()
const xmlString = await fetchSenadoXml('/senadores')
const result = parser.parse(xmlString) as SenadoResponse
```

**Gotcha — `isArray` callback:** Senado API returns single elements as objects and multiple elements as arrays. Use `isArray` to normalize to always-array for consistent typing:

```typescript
// Without isArray: result.Parlamentares.Parlamentar might be object OR array
// With isArray: always array

interface SenadoParlamentar {
  IdentificacaoParlamentar: {
    CodigoParlamentar: number
    NomeParlamentar: string
    SiglaPartidoParlamentar: string
    UfParlamentar: string
    // ...
  }
}
```

**Gotcha — `parseTagValue: true`:** Senado IDs like `<CodigoParlamentar>12345</CodigoParlamentar>` will become numbers (fine). But CPF-like strings with leading zeros would be corrupted — keep `parseTagValue: false` if any field has leading-zero strings. For Senado, IDs are safe to parse as numbers.

### 4.2 Validation Pattern

```typescript
import { XMLValidator } from 'fast-xml-parser'

function validateAndParseXml<T>(xmlString: string, parser: XMLParser): T {
  const validationResult = XMLValidator.validate(xmlString, {
    allowBooleanAttributes: false,
  })

  if (validationResult !== true) {
    throw new Error(`Invalid XML from Senado API: ${JSON.stringify(validationResult)}`)
  }

  return parser.parse(xmlString) as T
}
```

---

## 5. Node.js `crypto` — AES-256-GCM for CPF Encryption (DR-005)

**Module:** Node.js built-in `node:crypto` (no npm package needed)

### 5.1 CPF Encryption Implementation Pattern

Per DR-005 and ADR-007: CPFs are encrypted with AES-256-GCM at the application layer before any DB write. The key **never reaches the database process**.

```typescript
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm' as const
const IV_LENGTH = 12   // 96-bit IV — recommended for GCM (NIST SP 800-38D)
const TAG_LENGTH = 16  // 128-bit auth tag — standard GCM tag

interface EncryptedCpf {
  ciphertext: string  // base64
  iv: string          // base64
  authTag: string     // base64
}

/**
 * Encrypts a CPF string using AES-256-GCM.
 * The key is loaded once from CPF_ENCRYPTION_KEY env var (32 bytes, hex-encoded).
 * Never log or expose the plaintext CPF.
 */
function encryptCpf(cpf: string, keyHex: string): EncryptedCpf {
  const key = Buffer.from(keyHex, 'hex')  // 32 bytes
  const iv = randomBytes(IV_LENGTH)       // new random IV per encryption

  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH })
  // Optional AAD: bind ciphertext to a context (e.g., 'cpf-field') to prevent misuse
  cipher.setAAD(Buffer.from('cpf-field'))

  const encrypted = Buffer.concat([cipher.update(cpf, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()  // MUST call after final()

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  }
}

function decryptCpf(encrypted: EncryptedCpf, keyHex: string): string {
  const key = Buffer.from(keyHex, 'hex')
  const iv = Buffer.from(encrypted.iv, 'base64')
  const authTag = Buffer.from(encrypted.authTag, 'base64')
  const ciphertext = Buffer.from(encrypted.ciphertext, 'base64')

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH })
  decipher.setAAD(Buffer.from('cpf-field'))
  decipher.setAuthTag(authTag)  // MUST call before final()

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
  // decipher.final() throws if authTag verification fails — tampered ciphertext
}

/**
 * SHA-256 hash of CPF for cross-source lookup (public identifier, one-way).
 * Used in internal_data.politician_identifiers for matching across sources
 * without exposing the plaintext CPF.
 */
function hashCpfForLookup(cpf: string): string {
  return createHash('sha256').update(cpf, 'utf8').digest('hex')
}
```

**Critical implementation rules:**

1. **IV uniqueness:** Always `randomBytes(12)` per encryption. Never reuse an IV with the same key — breaks GCM security.
2. **Auth tag order:** Get tag AFTER `cipher.final()`. Set tag BEFORE `decipher.final()`.
3. **`decipher.final()` throws on tamper:** Wrap in try/catch — treat auth failure as a fatal error, not a recoverable one.
4. **Key loading:** Load `CPF_ENCRYPTION_KEY` once at startup via Zod env validation. Never pass as a function argument through request chains.
5. **Storage format:** Store `{ ciphertext, iv, authTag }` as separate columns in `internal_data.politician_identifiers`, or as a single JSON blob. Never store only the ciphertext without the IV and tag.
6. **No logs:** Never log `cpf`, `ciphertext`, `keyHex`, or any field that could reconstruct the CPF. Use structured logging and exclude these fields.

---

## 6. p-limit v7.3.0 — Concurrency Control for API Calls

**Source:** [GitHub sindresorhus/p-limit](https://github.com/sindresorhus/p-limit) | [npm p-limit](https://www.npmjs.com/package/p-limit)
**Module type:** ESM only (`"type": "module"`)
**Engine:** Node >=20

### 6.1 Rate Limiting API Calls (Portal da Transparência: 90 req/min)

```typescript
import pLimit from 'p-limit'

// Portal da Transparencia: 90 req/min = 1.5 req/sec
// Conservative limit: 1 request per 700ms = ~85 req/min (leaves buffer)
const limit = pLimit(1)  // 1 concurrent request at a time

// Process 594 politicians with a single shared limiter:
const results = await Promise.all(
  politicians.map((politician) =>
    limit(async () => {
      await delay(700)  // inter-request delay within the limiter
      return fetchTransparenciaExpenses(politician.cpfHash)
    }),
  ),
)
```

**For adapters without rate limits (Camara, Senado):** Use higher concurrency:

```typescript
const limit = pLimit(5)  // 5 concurrent requests to Camara API
```

**p-limit v7 is ESM only.** Ensure `apps/pipeline/package.json` has `"type": "module"` or use dynamic import in CJS contexts.

### 6.2 Chunked Processing Pattern for 594 Politicians

For adapters that return data per politician, process in chunks:

```typescript
import pLimit from 'p-limit'

async function fetchAllPoliticiansData<T>(
  politicians: Array<{ id: string; slug: string }>,
  fetcher: (p: { id: string; slug: string }) => Promise<T>,
  concurrency: number,
): Promise<Array<{ slug: string; data: T | null; error: string | null }>> {
  const limit = pLimit(concurrency)

  return Promise.all(
    politicians.map((p) =>
      limit(async () => {
        try {
          const data = await fetcher(p)
          return { slug: p.slug, data, error: null }
        } catch (err) {
          // Never throw — collect errors and continue
          return { slug: p.slug, data: null, error: String(err) }
        }
      }),
    ),
  )
}

// Usage for Camara adapter (no rate limit stated → 5 concurrent)
const results = await fetchAllPoliticiansData(politicians, fetchCamaraExpenses, 5)
const errors = results.filter((r) => r.error !== null)
if (errors.length > 0) {
  logger.warn({ count: errors.length, samples: errors.slice(0, 3) }, 'Partial fetch failures')
}
```

---

## 7. axios-retry v4.5.0 — Flaky Government API Resilience

**Source:** [npm axios-retry](https://www.npmjs.com/package/axios-retry)
**Note:** axios-retry v4.5.0 does **not** automatically respect the `Retry-After` header. You must implement that manually (see below).

### 7.1 Axios Instance with Retry and Rate Limit Handling

```typescript
import axios from 'axios'
import axiosRetry, { isNetworkOrIdempotentRequestError } from 'axios-retry'
import ms from 'ms'

export function createGovernmentApiClient(baseURL: string, apiKey?: string) {
  const client = axios.create({
    baseURL,
    timeout: ms('30s'),
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'PAH-Pipeline/1.0 (contato@example.com)',
      ...(apiKey ? { 'chave-api-dados': apiKey } : {}),  // Transparencia header
    },
  })

  axiosRetry(client, {
    retries: 3,
    retryDelay: (retryCount, error) => {
      // Respect Retry-After header if present (government APIs may return it on 429)
      const retryAfter = error.response?.headers['retry-after']
      if (retryAfter != null) {
        const seconds = parseInt(String(retryAfter), 10)
        if (!isNaN(seconds)) return seconds * 1000
      }
      // Exponential backoff: 1s, 2s, 4s + jitter
      return axiosRetry.exponentialDelay(retryCount) + Math.random() * 1000
    },
    retryCondition: (error) => {
      // Retry on network errors, 5xx, and 429 (rate limited)
      if (error.response?.status === 429) return true
      if (error.response?.status === 503) return true
      return isNetworkOrIdempotentRequestError(error)
    },
    shouldResetTimeout: true,  // reset timeout on each retry attempt
  })

  return client
}
```

**Gotcha — Transparencia API key header:** Portal da Transparência uses `chave-api-dados` as the header name (not `Authorization`). Rate limit is 90 requests/minute. Use `p-limit(1)` + 700ms delay alongside axios-retry.

**Gotcha — Senado XML Accept header:** Senado REST API returns XML by default. Set `Accept: application/xml` or omit `Accept` header. The response `Content-Type` will be `application/xml; charset=UTF-8`.

**Gotcha — Camara JSON:** Camara API (api.camara.leg.br) returns JSON by default. No API key required.

**Gotcha — TCU CADIRREG:** TCU's CADIRREG endpoint returns JSON. Check if it requires an API key or certificate — may require institutional access.

---

## 8. Idempotent Pipeline Architecture Patterns

### 8.1 Source Adapter Contract

Every source adapter must implement this interface:

```typescript
interface SourceAdapter<TRaw, TDomain> {
  source: 'camara' | 'senado' | 'transparencia' | 'tse' | 'tcu' | 'cgu'
  fetch(): Promise<TRaw[]>          // fetch raw data from government API/file
  transform(raw: TRaw): TDomain     // normalize to shared domain type
  upsert(records: TDomain[]): Promise<void>  // write to DB idempotently
}
```

### 8.2 Idempotency Key Design

Per CLAUDE.md: `source + external_id` is the composite idempotency key. This means:

- The same politician fetched from Camara twice → same `(source='camara', external_id='12345')` → upsert, no duplicate
- Running the full pipeline daily is safe: all writes are idempotent
- If a run fails mid-way, re-running from the start is safe

```sql
-- Required unique constraint in internal_data migration:
CREATE UNIQUE INDEX uq_raw_source_data_idempotency
  ON internal_data.raw_source_data (source, external_id);
```

### 8.3 Pipeline Run Lifecycle

```
1. pg-boss cron fires → sends job to queue
2. work() handler starts
3. createQueue('pipeline:camara') was called at startup (required)
4. Adapter fetches data (with retries via axios-retry)
5. Transform to domain types
6. Batch upsert via Drizzle (onConflictDoUpdate)
7. Compute integrity scores (pure function, no I/O)
8. Upsert scores to public schema (wrapped in transaction with step 6)
9. Update data_source_status
10. Job completes → pg-boss marks as completed
11. On error → pg-boss retries (retryLimit=3, retryBackoff=true) → DLQ after exhaustion
```

---

## 9. Summary: Gotchas Quick Reference

| Library | Gotcha | Mitigation |
|---------|--------|-----------|
| pg-boss v10 | `teamSize`/`teamConcurrency` removed | Use `batchSize` for batch processing; call `work()` once per queue |
| pg-boss v10 | Queues must be created with `createQueue()` before use | Create all queues at startup before registering workers |
| pg-boss v10 | Uses `pg` driver, not `postgres-js` | Pass connection string directly; pg-boss manages its own pool |
| pg-boss v10 | `schedule()` not `createSchedule()` | v12 renamed it; v10 uses `schedule()` |
| pg-boss v10 | Default `retryLimit: 2` (opt-out) | All pipeline adapters are idempotent, so this is fine |
| Drizzle | `excluded.column_name` uses DB column name (snake_case) | Double-check migration column names vs. Drizzle field names |
| Drizzle | `db.batch()` unavailable for postgres-js | Use `db.transaction()` for multi-table atomicity |
| Drizzle | `numeric` returns `string` from postgres-js | Use `mode: 'string'` (default) for financial data; `decimal.js` for arithmetic |
| csv-parse | Brazilian files often ISO-8859-1 | Set `encoding: 'latin1'`; also set `bom: true` |
| csv-parse | `cast: true` corrupts CPF leading zeros | Always `cast: false` for government identity data |
| fast-xml-parser | CVE-2026-25896 entity bypass | Use v5.4.2 + `processEntities: false` |
| fast-xml-parser | Single vs. array element inconsistency | Use `isArray` callback to normalize always-array |
| Node.js crypto | IV reuse breaks AES-GCM | Always `randomBytes(12)` per encryption call |
| Node.js crypto | Auth tag order | `getAuthTag()` AFTER `final()`; `setAuthTag()` BEFORE `final()` |
| p-limit | ESM only in v7 | Ensure `"type": "module"` in pipeline package.json |
| axios-retry | Does not auto-respect `Retry-After` header | Manually parse in `retryDelay` callback |
| axios-retry | Default does not retry 429 | Add `retryCondition` to include status 429 |
