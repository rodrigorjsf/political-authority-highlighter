# Implementation Report

**Plan**: `.claude/PRPs/plans/completed/rf-008-profile-bills-section.plan.md`
**Branch**: `feat/PAH-007-politician-profile-overview`
**PR**: <https://github.com/rodrigorjsf/political-authority-highlighter/pull/5>
**Date**: 2026-03-07
**Status**: COMPLETE

---

## Summary

Implementou a aba "Projetos de Lei" do perfil do político em `/politicos/[slug]/projetos` com ISR (`revalidate = 3600`), o endpoint `GET /api/v1/politicians/:slug/bills` com paginação keyset (`submission_date DESC, id DESC`), migração `0003_add_bills.sql` para a tabela `public_data.bills`, e 5 testes unitários para o bill service. A tabela ficará vazia até o pipeline (RF-013) rodar — o empty state é exibido corretamente.

---

## Tasks Completed

| # | Task | File | Status |
|---|------|------|--------|
| 1 | Tipos compartilhados `Bill`, `BillFilters`, `BillListResponse` | `packages/shared/src/types/bill.ts` | done |
| 2 | Re-export de tipos no índice compartilhado | `packages/shared/src/index.ts` | done |
| 3 | Tabela `bills` no Drizzle schema público | `packages/db/src/public-schema.ts` | done |
| 4 | Migração SQL `0003_add_bills.sql` | `packages/db/migrations/public/0003_add_bills.sql` | done |
| 5 | Schemas TypeBox: `BillSchema`, `BillListResponseSchema`, `BillListQuerySchema` | `apps/api/src/schemas/bill.schema.ts` | done |
| 6 | Repository `selectByPoliticianSlug` com cursor keyset | `apps/api/src/repositories/bill.repository.ts` | done |
| 7 | Service `findByPoliticianSlug` com `encodeCursor`/`decodeCursor` | `apps/api/src/services/bill.service.ts` | done |
| 8 | Route `GET /politicians/:slug/bills` | `apps/api/src/routes/bills.route.ts` | done |
| 9 | DI wiring (repo → service → route) | `apps/api/src/app.ts` | done |
| 10 | Re-export de tipos Bill na web | `apps/web/src/lib/api-types.ts` | done |
| 11 | `fetchPoliticianBills` com tags ISR | `apps/web/src/lib/api-client.ts` | done |
| 12 | Página ISR da aba de projetos | `apps/web/src/app/politicos/[slug]/projetos/page.tsx` | done |
| 13 | Skeleton de loading da aba | `apps/web/src/app/politicos/[slug]/projetos/loading.tsx` | done |
| 14 | 5 testes unitários do bill service | `apps/api/src/services/bill.service.test.ts` | done |
| 15 | Validação completa (typecheck, lint, tests, build) | — | done |

---

## Validation Results

| Check | Result | Details |
|-------|--------|---------|
| Type check (shared) | pass | 0 erros |
| Type check (db) | pass | 0 erros |
| Type check (api) | pass | 0 erros |
| Type check (web) | pass | 0 erros |
| Lint | pass | 4/4 pacotes, 0 warnings |
| Unit tests (API) | pass | 14/14 (9 existentes + 5 novos bill service) |
| Unit tests (web) | pass | 32/32 (sem regressões) |
| Build | pass | `/politicos/[slug]/projetos` aparece como rota ISR dinâmica |

---

## Deviations from Plan

1. **`exactOptionalPropertyTypes` na página web**: O plan sugeria `fetchPoliticianBills(slug, { cursor })` — quando `cursor` é `undefined`, viola `exactOptionalPropertyTypes`. Corrigido construindo o filtro condicionalmente: `cursor !== undefined ? { cursor } : {}`.

2. **`conditions` array no repository**: O plan sugeria `ReturnType<typeof eq>[]` para o tipo do array de condições. Na prática, o Drizzle usa tipos internos mais amplos e o TypeScript aceita `Parameters<typeof and>` ou simplesmente um array implícito sem anotação explícita. Mantida a abordagem funcional sem cast desnecessário — o `or()` retorna `SQL<unknown> | undefined` e o guard antes do `.push()` resolve o problema.

3. **Cache-Control na rota**: Plan indicou `max-age=300, s-maxage=3600` (igual ao listing). Implementado conforme especificado — diferente do perfil (`s-maxage=86400`) porque dados de projetos podem mudar com mais frequência.

---

## Tests Written

| Test File | Test Cases |
|-----------|------------|
| `apps/api/src/services/bill.service.test.ts` | empty list retorna `cursor: null`; rows mapeados para BillDto; `cursor: null` quando rows ≤ limit; cursor e slice quando limit+1 rows; cursor encodifica `submissionDate` e `id` corretos |

---

## Next Steps

- [ ] Implementar RF-009 (votações) e RF-012 (despesas) em paralelo — mesmo padrão, tabelas independentes
