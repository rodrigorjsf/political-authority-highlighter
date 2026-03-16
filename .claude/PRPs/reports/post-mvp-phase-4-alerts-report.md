# Implementation Report

**Plan**: `.claude/PRPs/plans/completed/post-mvp-phase-4-alerts.plan.md`
**Branch**: `development`
**Date**: 2026-03-15
**Status**: COMPLETE

---

## Summary

Implemented the complete RF-POST-002 Email Score Alerts system: double opt-in email subscription flow with AES-256-GCM encrypted email storage, SHA-256 token hashing for security, score diff detection in the pipeline, a pg-boss `score-alert` worker using Resend for delivery, and a React `SubscribeForm` component on the politician profile page.

---

## Assessment vs Reality

| Metric     | Predicted | Actual   | Reasoning                                                             |
| ---------- | --------- | -------- | --------------------------------------------------------------------- |
| Complexity | HIGH      | HIGH     | Multiple integration points across db, pipeline, api, web as expected |
| Confidence | 8/10      | 8/10     | Root cause and architecture matched plan exactly                      |

**Deviations from plan:**

- `apps/api/src/crypto/email.ts` omits `decryptEmail` (API only encrypts on confirm; pipeline handles decrypt for alert sending) — reduces unnecessary code
- `createSubscriptionRepository` return type is inline (explicit), not via `SubscriptionRepository` alias, to avoid circular `ReturnType<typeof ...>` reference in lint rule `explicit-function-return-type`
- `buildRepository()` and `buildResend()` in tests use `MockRepository`/`MockResend` interfaces + `as unknown as T` cast pattern to satisfy `explicit-function-return-type` and `unbound-method` lint rules
- Pipeline `runOrchestrator` signature extended with `boss: PgBoss` param; all 6 call sites in `index.ts` updated accordingly

---

## Tasks Completed

| #  | Task                                                | File                                                    | Status |
| -- | --------------------------------------------------- | ------------------------------------------------------- | ------ |
| 1  | DB schema: pending_subscriptions table              | `packages/db/src/public-schema.ts`                      | ✅     |
| 2  | DB schema: alert_subscriptions table                | `packages/db/src/public-schema.ts`                      | ✅     |
| 3  | Supabase migration                                  | `supabase/migrations/0010_add_alert_subscriptions.sql`  | ✅     |
| 4  | Drizzle mirror migration                            | `packages/db/migrations/0009_add_alert_subscriptions.sql` | ✅   |
| 5  | Pipeline email crypto module                        | `apps/pipeline/src/crypto/email.ts`                     | ✅     |
| 6  | Pipeline env schema update                          | `apps/pipeline/src/config/env.ts`                       | ✅     |
| 7  | Score diff detection in scoring service             | `apps/pipeline/src/services/scoring.service.ts`         | ✅     |
| 8  | Orchestrator boss param + score-alert job dispatch  | `apps/pipeline/src/orchestrator.ts`                     | ✅     |
| 9  | score-alert worker                                  | `apps/pipeline/src/workers/score-alert.worker.ts`       | ✅     |
| 10 | Scheduler: registerScoreAlertWorker                 | `apps/pipeline/src/scheduler.ts`                        | ✅     |
| 11 | Pipeline index: wire Resend + worker                | `apps/pipeline/src/index.ts`                            | ✅     |
| 12 | Pipeline resend dependency                          | `apps/pipeline/package.json`                            | ✅     |
| 13 | API email crypto module                             | `apps/api/src/crypto/email.ts`                          | ✅     |
| 14 | API env schema update                               | `apps/api/src/config/env.ts`                            | ✅     |
| 15 | Subscription repository                             | `apps/api/src/repositories/subscription.repository.ts` | ✅     |
| 16 | TokenNotFoundError in error handler                 | `apps/api/src/hooks/error-handler.ts`                   | ✅     |
| 17 | TypeBox subscription schemas                        | `apps/api/src/schemas/subscription.schema.ts`           | ✅     |
| 18 | Subscription service                                | `apps/api/src/services/subscription.service.ts`         | ✅     |
| 19 | Subscriptions route                                 | `apps/api/src/routes/subscriptions.route.ts`            | ✅     |
| 20 | Wire route into app.ts                              | `apps/api/src/app.ts`                                   | ✅     |
| 21 | API resend dependency                               | `apps/api/package.json`                                 | ✅     |
| 22 | SubscribeForm React component                       | `apps/web/src/components/politician/subscribe-form.tsx` | ✅     |
| 23 | Wire SubscribeForm into profile page                | `apps/web/src/app/politicos/[slug]/page.tsx`            | ✅     |
| 24 | .env.example update                                 | `.env.example`                                          | ✅     |
| 25 | Pipeline email crypto tests                         | `apps/pipeline/src/crypto/email.test.ts`                | ✅     |
| 26 | API subscription service tests                      | `apps/api/src/services/subscription.service.test.ts`    | ✅     |
| 27 | Fix pipeline existing tests (new env vars)          | `apps/pipeline/src/crypto/cpf.test.ts` + 2 others      | ✅     |

---

## Validation Results

| Check       | Result | Details                             |
| ----------- | ------ | ----------------------------------- |
| Type check  | ✅     | `pnpm typecheck` — no errors        |
| Lint        | ✅     | `pnpm lint` — 0 errors, 0 warnings  |
| Unit tests  | ✅     | Pipeline: 49 tests; API: 54 tests   |
| Build       | ✅     | `pnpm build` — all packages compile |
| Vercel      | ✅     | `vercel build --yes` — succeeded    |

---

## Files Changed

| File                                                          | Action | Notes                                          |
| ------------------------------------------------------------- | ------ | ---------------------------------------------- |
| `packages/db/src/public-schema.ts`                            | UPDATE | +2 tables                                      |
| `supabase/migrations/0010_add_alert_subscriptions.sql`        | CREATE | DDL + GRANT statements                         |
| `packages/db/migrations/0009_add_alert_subscriptions.sql`     | CREATE | Drizzle mirror DDL                             |
| `apps/pipeline/src/crypto/email.ts`                           | CREATE | AES-256-GCM email encrypt/hash                 |
| `apps/pipeline/src/crypto/email.test.ts`                      | CREATE | 9 tests                                        |
| `apps/pipeline/src/config/env.ts`                             | UPDATE | +4 env vars                                    |
| `apps/pipeline/src/services/scoring.service.ts`               | UPDATE | needsAlert diff detection                      |
| `apps/pipeline/src/orchestrator.ts`                           | UPDATE | boss param + score-alert dispatch              |
| `apps/pipeline/src/workers/score-alert.worker.ts`             | CREATE | pg-boss worker + Resend delivery               |
| `apps/pipeline/src/scheduler.ts`                              | UPDATE | registerScoreAlertWorker                       |
| `apps/pipeline/src/index.ts`                                  | UPDATE | wire Resend + worker + boss to runPipeline     |
| `apps/pipeline/package.json`                                  | UPDATE | +resend dep                                    |
| `apps/pipeline/src/crypto/cpf.test.ts`                        | UPDATE | stub new env vars                              |
| `apps/pipeline/src/matching/cpf.test.ts`                      | UPDATE | stub new env vars                              |
| `apps/pipeline/src/publisher/publisher.test.ts`               | UPDATE | stub new env vars                              |
| `apps/api/src/crypto/email.ts`                                | CREATE | encryptEmail + hashEmail (no decrypt)          |
| `apps/api/src/config/env.ts`                                  | UPDATE | +4 env vars                                    |
| `apps/api/src/repositories/subscription.repository.ts`        | CREATE | 6 repository methods                           |
| `apps/api/src/hooks/error-handler.ts`                         | UPDATE | TokenNotFoundError + handler                   |
| `apps/api/src/schemas/subscription.schema.ts`                 | CREATE | TypeBox schemas for 3 routes                   |
| `apps/api/src/services/subscription.service.ts`               | CREATE | subscribe/confirm/unsubscribe                  |
| `apps/api/src/services/subscription.service.test.ts`          | CREATE | 8 tests                                        |
| `apps/api/src/routes/subscriptions.route.ts`                  | CREATE | 3 routes (POST subscribe, GET confirm, GET unsub) |
| `apps/api/src/app.ts`                                         | UPDATE | DI + route registration                        |
| `apps/api/package.json`                                       | UPDATE | +resend dep                                    |
| `apps/web/src/components/politician/subscribe-form.tsx`       | CREATE | Client component, a11y roles                   |
| `apps/web/src/app/politicos/[slug]/page.tsx`                  | UPDATE | SubscribeForm wired in                         |
| `.env.example`                                                | UPDATE | +EMAIL_ENCRYPTION_KEY, RESEND_API_KEY, etc.    |

---

## Tests Written

| Test File                                          | Test Cases                                                               |
| -------------------------------------------------- | ------------------------------------------------------------------------ |
| `apps/pipeline/src/crypto/email.test.ts`           | encryptEmail round-trip, random IV, base64, special chars; hashEmail normalization (4 cases) |
| `apps/api/src/services/subscription.service.test.ts` | subscribe: not found, sends email, Resend error; confirm: token not found, expired, valid; unsubscribe: idempotent x2 |

---

## Deviations from Plan

1. **API email crypto**: `decryptEmail` excluded (API never decrypts emails — that's the pipeline's job). Reduces surface area.
2. **Repository return type**: Uses inline explicit return type on `createSubscriptionRepository` instead of `SubscriptionRepository` alias to avoid circular `ReturnType<...>` reference that would break `explicit-function-return-type` rule.
3. **Test factory types**: Used `MockRepository`/`MockResend` interfaces with `as unknown as T` cast pattern (allowed by CLAUDE.md for test factories) to satisfy both `explicit-function-return-type` and `unbound-method` lint rules.

---

## Next Steps

- [ ] Review implementation
- [ ] Create PR: `gh pr create`
- [ ] Continue with Phase 5: Public API (RF-POST-003): `/prp-plan .claude/PRPs/prds/post-mvp-engagement-and-reach.prd.md`
