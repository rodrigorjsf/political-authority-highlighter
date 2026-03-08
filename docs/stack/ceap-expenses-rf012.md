# CEAP Parliamentary Expenses — RF-012 Research Notes

> Researched: 2026-03-07
> Scope: RF-012 (Profile Expenses section)
> Sources: Câmara Dados Abertos API, Drizzle ORM docs, TypeBox GitHub, Next.js 15 docs, MDN

---

## 1. CEAP API Endpoint

**Endpoint:** `GET https://dadosabertos.camara.leg.br/api/v2/deputados/{id}/despesas`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `ano` | integer | Filter by year |
| `mes` | integer | Filter by month (1–12) |
| `codTipoDocumento` | integer | Document type filter |
| `itens` | integer | Page size (default 15, max 100) |
| `pagina` | integer | Page number |
| `ordem` | string | `ASC` or `DESC` |
| `ordenarPor` | string | Field to sort by (e.g., `ano`, `mes`, `valorDocumento`) |

**Live example:** `https://dadosabertos.camara.leg.br/api/v2/deputados/73441/despesas?ano=2024&itens=5`

### Response: `dados[]` fields (confirmed via live API call)

| API Field (v2) | DB Column Suggestion | Type | Description |
|----------------|---------------------|------|-------------|
| `ano` | `ano` | integer | Competency year |
| `mes` | `mes` | integer | Competency month (1–12) |
| `tipoDespesa` | `tipo_despesa` | text | Expense category name (e.g. "MANUTENÇÃO DE ESCRITÓRIO") |
| `codDocumento` | `cod_documento` | text | Document identifier |
| `tipoDocumento` | `tipo_documento` | text | Document type name (e.g. "Nota Fiscal") |
| `codTipoDocumento` | `cod_tipo_documento` | integer | Document type code (0–5 scale) |
| `dataDocumento` | `data_documento` | timestamp | Document issue date (ISO 8601: "2024-03-11T00:00:00") |
| `numDocumento` | `num_documento` | text | Fiscal receipt/document number |
| `valorDocumento` | `valor_documento` | numeric(12,2) | Face value of the document |
| `urlDocumento` | `url_documento` | text | Link to scanned/digital document |
| `nomeFornecedor` | `nome_fornecedor` | text | Supplier/vendor name |
| `cnpjCpfFornecedor` | `cnpj_cpf_fornecedor` | text | Supplier tax ID (CNPJ 14 digits or CPF 11 digits) — NOTE: this is SUPPLIER CPF, not politician CPF — DR-005 does not restrict it, but treat carefully |
| `valorLiquido` | `valor_liquido` | numeric(12,2) | Net amount deducted from quota |
| `valorGlosa` | `valor_glosa` | numeric(12,2) | Amount withheld/disallowed |
| `numRessarcimento` | `num_ressarcimento` | text | Reimbursement identifier (often empty string "") |
| `codLote` | `cod_lote` | integer | Document batch code |
| `parcela` | `parcela` | integer | Installment number (0 = not installment) |

### Bulk download fields (CEAP CSV/JSON — different field names)

The bulk files at `http://www.camara.leg.br/cotas/Ano-{ano}.csv` use **different column names** than the REST API. These are the canonical CEAP field names from the tutorial:

| Bulk File Field | REST API Equivalent | Description |
|----------------|--------------------|----|
| `txtDescricao` | `tipoDespesa` | Expense subcategory title |
| `numSubCota` | (no direct match) | Numeric code for expense category |
| `numEspecificacaoSubcota` | (no direct match) | Sub-category code |
| `txtDescricaoEspecificacao` | (no direct match) | Sub-category description |
| `txtFornecedor` | `nomeFornecedor` | Supplier name |
| `txtCNPJCPF` | `cnpjCpfFornecedor` | Supplier tax ID |
| `txtNumero` | `numDocumento` | Document number |
| `indTipoDocumento` | `codTipoDocumento` | Document type indicator |
| `datEmissao` | `dataDocumento` | Emission date |
| `vlrDocumento` | `valorDocumento` | Document face value |
| `vlrGlosa` | `valorGlosa` | Withheld amount |
| `vlrLiquido` | `valorLiquido` | Net quota deduction |
| `numMes` | `mes` | Month |
| `numAno` | `ano` | Year |
| `numParcela` | `parcela` | Installment |
| `txtPassageiro` | (airline only) | Passenger name |
| `txtTrecho` | (airline only) | Flight route |
| `numLote` | `codLote` | Batch number |
| `numRessarcimento` | `numRessarcimento` | Reimbursement ID |
| `urlDocumento` | `urlDocumento` | Document URL |
| `nuDeputadoId` | (correlates to API `id`) | Deputy internal ID |
| `ideDocumento` | `codDocumento` | Document identifier |

> **IMPORTANT:** The bulk files "do not follow the same naming standards as the REST API." Use the REST API for ingestion — it has stable field names and supports pagination.

### Pagination in API response

The response includes a `links` array with `rel` and `href` for pagination:

- `rel: "self"` — current page URL
- `rel: "next"` — next page URL
- `rel: "first"` — first page URL
- `rel: "last"` — last page URL

Use offset pagination via `pagina` parameter. No cursor-based pagination available on this endpoint.

---

## 2. Drizzle ORM: Numeric Column for Monetary Amounts

**Source:** <https://orm.drizzle.team/docs/column-types/pg>

```typescript
import { numeric } from 'drizzle-orm/pg-core'

// Default: returns string in TypeScript
valorDocumento: numeric('valor_documento', { precision: 12, scale: 2 })

// With mode: returns number (use with caution — floating point for currency)
valorDocumento: numeric('valor_documento', { precision: 12, scale: 2, mode: 'number' })

// With mode: returns bigint
valorDocumento: numeric('valor_documento', { precision: 12, scale: 2, mode: 'bigint' })
```

**Generates SQL:**

```sql
"valor_documento" numeric(12, 2)
```

### GOTCHA: numeric returns string by default

`$inferSelect` on a `numeric(...)` column gives `string`, not `number`. This means:

- In services, parse with `parseFloat(row.valorDocumento)` before arithmetic
- Or use `mode: 'number'` — but beware floating-point precision loss for display
- **Recommended pattern for currency:** store as `numeric` (string), parse to `number` only for math, format with `Intl.NumberFormat` for display

`decimal` is a direct alias for `numeric` — identical behavior.

---

## 3. Drizzle ORM: Aggregations (SUM grouped by year)

**Source:** <https://orm.drizzle.team/docs/select#aggregations-helpers>

### Native aggregation helpers (import from `drizzle-orm`)

```typescript
import { sum, sumDistinct, avg, count, countDistinct, min, max } from 'drizzle-orm'
```

### Return types

| Function | TypeScript return type | Notes |
|----------|----------------------|-------|
| `count()` | `number` | `.mapWith(Number)` applied internally |
| `countDistinct()` | `number` | `.mapWith(Number)` applied internally |
| `sum()` | `string \| null` | `.mapWith(String)` — null when no rows |
| `sumDistinct()` | `string \| null` | Same |
| `avg()` | `string \| null` | Same |
| `min()` | `string \| null` | Same |
| `max()` | `string \| null` | Same |

### Yearly totals example (for expenses)

```typescript
import { sum } from 'drizzle-orm'

// Compute total net expenses per year for a politician
const yearlyTotals = await db
  .select({
    ano: expenses.ano,
    totalLiquido: sum(expenses.valorLiquido),  // returns string | null
    totalDocumento: sum(expenses.valorDocumento), // returns string | null
    count: count(),
  })
  .from(expenses)
  .where(eq(expenses.politicianId, id))
  .groupBy(expenses.ano)
  .orderBy(desc(expenses.ano))

// Parse at service boundary:
const parsed = yearlyTotals.map(row => ({
  ano: row.ano,
  totalLiquido: row.totalLiquido ? parseFloat(row.totalLiquido) : 0,
  count: row.count,
}))
```

### Raw SQL template approach (when you need cast)

```typescript
import { sql } from 'drizzle-orm'

// Cast to avoid string — useful if you need number type directly
totalLiquido: sql<number>`cast(sum(${expenses.valorLiquido}) as float8)`
```

---

## 4. TypeBox v0.33: Type.Nullable and Type.Number constraints

**Source:** <https://github.com/sinclairzx81/typebox>, <https://github.com/fastify/fastify-type-provider-typebox>

### Type.Number() with constraints

```typescript
import { Type } from '@sinclair/typebox'

// With minimum (e.g., non-negative monetary amount)
const Amount = Type.Number({ minimum: 0 })

// With exclusiveMinimum
const PositiveAmount = Type.Number({ exclusiveMinimum: 0 })

// With multipleOf (cent precision — for validation, not storage)
const CentAmount = Type.Number({ minimum: 0, multipleOf: 0.01 })
```

All standard JSON Schema numeric keywords are supported: `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `multipleOf`.

### Type.Nullable — NO first-class function in v0.33

There is **no `Type.Nullable()` in @sinclair/typebox 0.33**. Use Union:

```typescript
// Nullable string
const NullableString = Type.Union([Type.String(), Type.Null()])
// TypeScript infers: string | null ✓

// Nullable number
const NullableNumber = Type.Union([Type.Number(), Type.Null()])

// Reusable Nullable helper (define once, use everywhere)
const Nullable = <T extends TSchema>(schema: T) => Type.Union([schema, Type.Null()])

// Usage
const NullableUrl = Nullable(Type.String({ format: 'uri' }))
const NullableAmount = Nullable(Type.Number({ minimum: 0 }))
```

> **NOTE:** `@fastify/type-provider-typebox` does NOT add a `Nullable` helper either. The Union pattern is the canonical approach across all TypeBox versions through 0.33.

> **GOTCHA with Fastify serialization:** When `Type.Union([Type.String(), Type.Null()])` is used in a response schema, Fastify's fast-json-stringify will serialize `null` correctly. However, `undefined` is **not** the same as `null` — if a field can be absent, use `Type.Optional(Type.Union([Type.String(), Type.Null()]))` to express `string | null | undefined`.

---

## 5. Intl.NumberFormat for BRL

**Source:** [MDN Intl.NumberFormat](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)

### Basic usage

```typescript
// Format R$ 1.234,56
new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
}).format(1234.56)
// → "R$ 1.234,56"

// Large number
new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
}).format(1234567.89)
// → "R$ 1.234.567,89"
```

### Reusable formatter (singleton — avoids repeated construction)

```typescript
// In packages/shared/src/utils/formatCurrency.ts
const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatBRL(value: number): string {
  return brlFormatter.format(value)
}

// Usage:
formatBRL(779.68)  // → "R$ 779,68"
formatBRL(0)       // → "R$ 0,00"
```

### currencyDisplay options

```typescript
// Symbol (default): "R$ 1.234,56"
{ currencyDisplay: 'symbol' }

// Code: "BRL 1.234,56"
{ currencyDisplay: 'code' }

// Name: "1.234,56 reais brasileiros"
{ currencyDisplay: 'name' }
```

### GOTCHA: Node.js full-icu requirement

`Intl.NumberFormat` with `pt-BR` locale requires full ICU data. Verify with:

```bash
node -e "console.log(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(1234.56))"
```

If output is `BRL 1,234.56` instead of `R$ 1.234,56`, Node.js was built with small-icu. Fix: use `NODE_ICU_DATA` env var pointing to full-icu package, or ensure Node 18+ (ships full-icu by default).

---

## 6. Next.js 15: searchParams Must Be Awaited

**Source:** <https://nextjs.org/docs/app/api-reference/file-conventions/page> (v15, updated 2026-02-27)

### searchParams is a Promise in Next.js 15

```typescript
// CORRECT — Next.js 15 app router page
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { page = '1', ano, mes } = await searchParams
  // ...
}
```

### Using PageProps helper (recommended for type safety)

```typescript
// Type-generated helper — no manual Promise<{...}> needed
export default async function Page(props: PageProps<'/politicos/[slug]/despesas'>) {
  const { slug } = await props.params
  const { page, ano } = await props.searchParams
}
```

### Client Component pattern (use React.use)

```typescript
'use client'
import { use } from 'react'

export default function ExpensesClient({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { page = '1', ano } = use(searchParams)
  // ...
}
```

### GOTCHA: searchParams opts page into dynamic rendering

Using `searchParams` makes the page **dynamically rendered** at request time (no ISR caching). For the expenses tab:

- This is acceptable since expenses data changes with pipeline runs
- However, if you want ISR, move filter state to client-side state (useSearchParams in a Client Component) and keep the page Server Component with static params only

### Version history

| Version | Change |
|---------|--------|
| v15.0.0-RC | `params` and `searchParams` became Promises |
| v14 and earlier | synchronous props (still works in v15 for backward compat, but deprecated) |

A codemod is available: `npx @next/codemod@canary next-async-request-api .`
