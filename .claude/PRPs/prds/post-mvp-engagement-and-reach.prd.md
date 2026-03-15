# RF-POST — Engajamento Cidadão & Alcance da Plataforma

> **PRD Reference:** `docs/prd/PRD.md` § 2.2 RF-POST-001 a RF-POST-004
> **Status:** DRAFT — Tracker de Implementação (0 completo, 5 pendentes)
> **Generated:** 2026-03-15
> **Prerequisite:** Todos os 11 fases do `rf-mvp-remaining-features.prd.md` estão `complete`

---

## Problem Statement

O MVP entregou a plataforma core: 594 políticos com perfis completos, pipeline de ingestão de 6 fontes governamentais, pontuação de integridade calculada e SEO implementado. No entanto, a plataforma ainda possui lacunas críticas que impedem o crescimento sustentável do produto e limitam o cumprimento dos KPIs do PRD principal (≥ 3 páginas/sessão, 50k MAU):

- **Métricas cegas:** Não existe analytics de produção. Sem dados reais de uso, é impossível medir o KPI de pages/session, identificar páginas com alta taxa de rejeição ou justificar prioridades de produto.
- **Ausência de retorno:** O cidadão engajado não tem mecanismo para retornar à plataforma quando a situação de um político muda (novo escore, mudança em registro anticorrupção). Isso limita a retenção e o MAU de longo prazo.
- **Isolamento de perfis:** O cidadão não pode comparar dois políticos lado a lado — a única opção é abrir duas abas manualmente, aumentando a fricção cognitiva e reduzindo o tempo de sessão.
- **Acessibilidade incompleta:** O PRD principal define WCAG 2.1 Nível AA como requisito (RNF-A11Y-001 a 005), mas nenhuma fase do MVP incluiu auditoria sistemática com axe-core nem testes de navegação por teclado. A dívida técnica de acessibilidade cresce a cada nova página adicionada.
- **API opaca para pesquisadores:** A API interna existe e está funcional, mas não é documentada publicamente, não tem sistema de chaves e não tem limites de taxa diferenciados por perfil de uso. ONGs, jornalistas e pesquisadores acadêmicos não podem integrar os dados de forma sustentável.

## Evidence

- `apps/web/src/app/layout.tsx` — zero scripts de analytics, nenhuma instrumentação de métricas
- `docs/prd/PRD.md` § 3.4 — Observability define Vercel Analytics como solução, mas não foi implementado; nenhuma alternativa LGPD-compliant foi configurada
- `docs/prd/PRD.md` § 3.6 — RNF-A11Y-001 a 005 definidos mas sem nenhum teste axe-core nos specs existentes
- `apps/web/src/app/` — não existe rota `/comparar`; `apps/api/src/routes/` — sem endpoint de comparação
- `apps/api/src/app.ts:49` — rate limit único global de 60 req/min para todos os clientes; sem autenticação por chave; sem swagger registrado
- `packages/db/src/public-schema.ts` — sem tabela `alert_subscriptions`, `pending_subscriptions` ou `api_keys`
- `docs/prd/PRD.md` § 2.2 — RF-POST-001 a RF-POST-004 listados como post-MVP sem data de implementação

## Proposed Solution

Implementar 5 capacidades pós-MVP em 5 fases sequenciais com paralelismo nas fases iniciais, ordenadas por prioridade estratégica:

1. **Analytics LGPD-compliant (Plausible)** — instrumentação passiva, zero cookie banner, dados reais de uso em 24h
2. **Acessibilidade WCAG 2.1 AA** — auditoria axe-core + correções em todos os componentes e páginas existentes
3. **Comparação de Políticos (RF-POST-001)** — página `/comparar` com até 2 políticos, tabela comparativa responsiva, links para fontes oficiais
4. **Alertas de Pontuação por Email (RF-POST-002)** — subscrição por email com double opt-in, AES-256-GCM para storage LGPD-compliant, job pg-boss para detecção de variação ≥ 5 pontos e envio via Resend
5. **API Pública Documentada (RF-POST-003)** — chaves `X-API-Key` self-service, Scalar UI em `/docs`, rate limit diferenciado por tier (`anonymous`: 60/min, `research`: 600/min)

## Key Hypothesis

Acreditamos que fornecer comparação direta entre políticos, alertas de monitoramento e uma API pública documentada irá converter visitantes esporádicos em usuários recorrentes engajados.
Saberemos que estamos certos quando a média de páginas por sessão atingir ≥ 3 e o MAU retornante (via alertas) superar 5% dos inscritos ativos dentro de 60 dias da ativação das fases 3 e 4.

## What We're NOT Building

- **Comentários e features sociais (RF-POST-004)** — requer autenticação completa, moderação e prevenção de abuso; alto custo operacional; PRD separado
- **Comparação de mais de 2 políticos** — adiciona complexidade de UI sem validação de demanda
- **Dashboard de analytics para usuários finais** — analytics é interno (produto), não feature de usuário
- **SDKs para API pública** — apenas REST + OpenAPI spec; SDKs são pós-pós-MVP
- **App nativo (iOS/Android)** — responsive web cobre o caso de uso mobile confirmado pelo PRD principal
- **Autenticação completa (login/sessão)** — necessária para alertas avançados e perfis de usuário; PRD separado
- **Ambiente staging** — continua pós-MVP conforme definido no PRD principal § 6.1

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Páginas por sessão | ≥ 3 (KPI PRD principal) | Plausible Analytics dashboard |
| Taxa de rejeição | < 60% | Plausible Analytics |
| MAU retornante via alertas | ≥ 5% dos inscritos ativos/mês | Query em `alert_subscriptions` |
| Chamadas à API pública | > 100/dia após 30 dias de go-live | Logs `api_keys.last_used_at` |
| Score Lighthouse Accessibility | ≥ 95 em todas as rotas | Lighthouse CI no GitHub Actions |
| Violações axe-core críticas/sérias | 0 em todas as rotas | `@axe-core/playwright` em CI |
| `pnpm lint && pnpm typecheck && pnpm test && vercel build` passa | 100% | CI/CD em cada PR |

## Open Questions

- [ ] **Phase 1:** Plausible Cloud (€9/mês) vs. self-hosted (infraestrutura própria). Dado custo alvo < $100/mês (RNF-COST-001), Plausible Cloud cabe no orçamento — confirmar antes de criar conta.
- [ ] **Phase 4:** Resend free tier: 100 emails/dia, 3.000/mês. Suficiente para MVP post? Se houver mais de 3.000 inscrições ativas, upgrade para plano pago necessário.
- [ ] **Phase 4:** Threshold de variação de score de ≥ 5 pontos — agressiva demais (spam) ou conservadora demais (invisível)? Considerar também alertar se `exclusion_flag` mudar de `false → true`.
- [ ] **Phase 5:** Self-service de chave via email automático (Resend) ou formulário manual (Google Forms) como intermediário para tier `research`? Formulário tem custo zero mas não escala.
- [ ] **Phase 5:** URL da API pública: `api.autoridade-politica.com.br` (subdomínio via Cloudflare, mais profissional) ou `autoridade-politica.com.br/api` (mesma origem, sem CORS adicional)?

---

## Implementation Audit (as of 2026-03-15)

### Completed Features

| RF | Feature | Branch/PR |
|----|---------|-----------|
| RF-001 | Politician Catalog Listing | merged: main |
| RF-002 | Filter by Political Role | merged: main |
| RF-003 | Filter by State/UF | merged: main |
| RF-004 | Integrity Score Calculation | merged: main |
| RF-005 | Methodology Page | merged: main |
| RF-006 | Anti-Corruption Exclusion Filter | merged: main |
| RF-007 | Politician Profile Overview | merged: main |
| RF-008 | Profile Section — Bills | merged: main |
| RF-009 | Profile Section — Voting Record | merged: main |
| RF-010 | Profile Section — Proposals | merged: main |
| RF-011 | Profile Section — Agenda | merged: main |
| RF-012 | Profile Section — Expenses | merged: main |
| RF-013 | Data Ingestion Pipeline | merged: main |
| RF-014 | Data Freshness Indicator | merged: main |
| RF-015 | Search Politician by Name | merged: main |
| RF-016 | Responsive Mobile Web Layout | merged: main |
| RF-017 | SEO and Social Sharing Metadata | merged: main |

### Partial Implementations (estrutura existe, funcionalidade ausente)

| RF | What Exists | What's Missing |
|----|-------------|----------------|
| RNF-A11Y | Semantic HTML em componentes, `aria-label` em alguns elementos | Auditoria axe-core em CI, `skip to content` link, WCAG 2.1 AA comprova análise de contraste, labels ARIA em filtros dinâmicos |
| RF-POST-003 | API Fastify funcional com todos os endpoints, rate limit global de 60 req/min | Sistema de chaves `X-API-Key`, Swagger/Scalar UI, rate limit por tier, documentação OpenAPI |

### Not Started

RF-POST-001 (Comparação), RF-POST-002 (Alertas), Analytics LGPD-compliant

---

## Users & Context

**Primary User**

- **Who:** Cidadão Engajado — eleitor brasileiro que já visitou a listagem e perfis de políticos e quer ir mais fundo
- **Current behavior:** Abre duas abas para comparar políticos manualmente; não retorna à plataforma após a primeira visita; não consegue monitorar mudanças sem re-visitar periodicamente
- **Trigger:** Quer comparar dois candidatos do mesmo estado antes da eleição, ou quer saber se um político que acompanha teve mudança de score
- **Success state:** Usa `/comparar` para decisão de voto, assina alertas de 1-2 políticos, compartilha comparação nas redes sociais

**Persona secundária: Pesquisador / Jornalista**

- **Who:** Jornalista de dados ou pesquisador acadêmico que quer integrar dados da plataforma em ferramentas próprias
- **Current behavior:** Faz scraping manual dos perfis ou usa a API interna sem documentação oficial
- **Trigger:** Precisa de acesso programático estável com rate limits previsíveis e documentação de contratos de API
- **Success state:** Gera chave `research` self-service, lê Scalar UI, integra `/politicians` endpoint em pipeline de dados próprio

**Job to Be Done**
Quando eu acompanho um político e quero saber se sua situação mudou, quero receber uma notificação automática quando o score variar, para me manter informado sem ter que entrar na plataforma toda semana.

**Non-Users**
Usuários que querem comentar ou interagir socialmente com conteúdo (pós-MVP separado). Usuários que precisam de bulk data export (post-MVP API avançada).

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | RF | Capability | Rationale |
|----------|----|------------|-----------|
| Must | Analytics | Plausible LGPD-compliant | Sem métricas reais, impossível validar KPIs do PRD; quick win de 1 dia |
| Must | RNF-A11Y | Acessibilidade WCAG 2.1 AA | Requisito não-funcional do PRD principal pendente; dívida técnica crescente |
| Must | RF-POST-001 | Comparação de 2 políticos | Feature mais demandada após listagem; aumenta pages/session diretamente |
| Should | RF-POST-002 | Alertas por email de variação de score | Único mecanismo de retenção sem autenticação completa |
| Should | RF-POST-003 | API pública documentada (Scalar UI + chaves) | Habilita ecossistema civic tech; dados já existem, falta apenas exposição estruturada |
| Won't | RF-POST-004 | Comentários/Social Features | Requer autenticação, moderação, prevenção de abuso — PRD separado |

---

## Technical Approach

**Feasibility:** HIGH — stack e patterns já estabelecidos. Nenhuma nova tecnologia de infraestrutura. Pipeline pg-boss já suporta jobs de alertas. `fetchPoliticianBySlug` existente é suficiente para comparação. API TypeBox/Fastify já gera tipos para OpenAPI.

**Architecture Notes**

- Analytics: `next-plausible` instrumenta o `layout.tsx` raiz — uma mudança, todas as páginas cobertas. Script Plausible tem SRI hash obrigatório (RNF-SEC-016).
- Comparação: Zero novo endpoint de API — 2x `fetchPoliticianBySlug()` em paralelo via `Promise.all()` no Server Component. Estado via URL params `/comparar?a={slug1}&b={slug2}` para shareabilidade e `generateMetadata()`.
- Alertas — storage LGPD: email armazenado como `AES-256-GCM encrypted bytea` + `SHA-256 hash` para unicidade, usando a mesma infraestrutura de cripto do CPF (`apps/pipeline/src/crypto/cpf.ts`). Email plaintext processado apenas em memória durante envio via Resend.
- API pública: `@fastify/swagger` gera spec OpenAPI 3.1 automaticamente a partir dos schemas TypeBox existentes. Scalar serve UI em `/docs`. Middleware `api-key.hook.ts` faz SHA-256 lookup em `api_keys` table e injeta `request.apiTier` para rate limit diferenciado no `@fastify/rate-limit`.
- Acessibilidade: `@axe-core/playwright` estende os testes E2E existentes — não é passo separado de CI, é assertion adicional nos specs Playwright.

**Technical Risks**

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Plausible script bloqueado por ad-blockers (imprecisão de métricas) | HIGH | Proxy de analytics pelo próprio domínio via Next.js rewrites — padrão documentado no `next-plausible` |
| Resend free tier (3.000 emails/mês) insuficiente com volume de inscrições | MEDIUM | Rate limit de 1 email por subscritor por semana; upgrade automático de plano documentado como trigger |
| axe-core encontrar violações bloqueantes em componentes com design system fixo | LOW | Auditoria preview antes de CI gate; violações de baixa severidade como warning, não erro |
| Scalar UI adicionar peso ao bundle da API | LOW | Scalar é servido como rota separada `/docs`, não bundleado no código da API |
| Comparação de slugs inválidos causa 2x 404 — UX confusa | MEDIUM | Error state dedicado na página `/comparar` com mensagem clara e redirect para listagem |

---

## Implementation Phases

<!--
  STATUS: pending | in-progress | complete
  PARALLEL: phases que podem rodar simultaneamente (ex: "with 2")
  DEPENDS: phases que devem completar primeiro
-->

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | Analytics LGPD-Compliant (Plausible) | Script Plausible em layout.tsx, SRI hash, custom events nos Client Components existentes, env var para desativar em CI | pending | with 2 | - | `.claude/PRPs/plans/post-mvp-phase-1-analytics.plan.md` |
| 2 | Acessibilidade WCAG 2.1 AA | axe-core via @axe-core/playwright, auditoria de todas as rotas, correção de contraste/ARIA/foco, skip link, Lighthouse CI ≥ 95 | pending | with 1 | - | `.claude/PRPs/plans/post-mvp-phase-2-accessibility.plan.md` |
| 3 | Comparação de Políticos (RF-POST-001) | Rota /comparar com URL state, 2x fetchPoliticianBySlug paralelo, tabela comparativa responsiva, OG metadata, botão compartilhar | pending | - | 2 | `.claude/PRPs/plans/post-mvp-phase-3-comparison.plan.md` |
| 4 | Alertas de Pontuação por Email (RF-POST-002) | Tabelas alert_subscriptions + pending_subscriptions, double opt-in, AES-256-GCM para email, job pg-boss score-alert, worker Resend | pending | - | 3 | `.claude/PRPs/plans/post-mvp-phase-4-alerts.plan.md` |
| 5 | API Pública Documentada (RF-POST-003) | Tabela api_keys, @fastify/swagger + Scalar UI em /docs, middleware X-API-Key, rate limit por tier, self-service de chave via email | pending | - | 4 | `.claude/PRPs/plans/post-mvp-phase-5-public-api.plan.md` |

### Phase Details

**Phase 1: Analytics LGPD-Compliant (Plausible)**

- **Goal:** Instrumentar toda a plataforma com Plausible Analytics para medir KPIs reais do PRD principal (pages/session, MAU, bounce rate) sem violar LGPD — zero cookies, zero banner obrigatório.
- **Scope:** Instalar `next-plausible` em `apps/web`. Adicionar `<PlausibleProvider>` no `apps/web/src/app/layout.tsx` com `domain="autoridade-politica.com.br"`. Adicionar SRI hash do script Plausible (RNF-SEC-016). Configurar `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` e `NEXT_PUBLIC_PLAUSIBLE_ENABLED` (desativado em CI/dev). Custom events via `usePlausible()`: `comparar_click`, `tab_click`, `filtro_aplicado`, `busca_realizada` nos Client Components existentes. Rewrite proxy em `next.config.ts` para mitigar ad-blockers.
- **DB changes:** Nenhuma
- **Success signal:** Page views visíveis no dashboard Plausible. DevTools → Application → Cookies: zero cookies de rastreamento. `vercel build` passa.
- **Parallel with:** Phase 2 (completamente independente)

**Phase 2: Acessibilidade WCAG 2.1 AA**

- **Goal:** Garantir que todos os componentes e páginas existentes atendam WCAG 2.1 Nível AA (RNF-A11Y-001 a 005) antes de adicionar novas páginas, eliminando a dívida técnica de acessibilidade.
- **Scope:** Instalar `@axe-core/playwright` em `apps/web`. Criar `apps/web/e2e/accessibility.spec.ts` que audita todas as rotas: `/`, `/politicos`, `/politicos/[slug]`, `/politicos/[slug]/projetos`, `/politicos/[slug]/votacoes`, `/politicos/[slug]/despesas`, `/politicos/[slug]/propostas`, `/politicos/[slug]/atividades`, `/metodologia`, `/fontes`. Corrigir violações encontradas em: contraste de cores, `aria-label` em botões de filtro, foco visível nos cards, `role` correto nas tabs de perfil, `alt` em imagens de foto. Adicionar `skip to content` link no layout raiz. Verificar `min-height: 44px` em todos os touch targets (filtros, pagination, tabs). Adicionar Lighthouse CI step ao `.github/workflows/ci.yml` com threshold `accessibility: 95`.
- **DB changes:** Nenhuma
- **Success signal:** `pnpm test:e2e` passa com zero violações axe-core críticas/sérias. Lighthouse Accessibility ≥ 95 em CI.
- **Parallel with:** Phase 1 (completamente independente)

**Phase 3: Comparação de Políticos (RF-POST-001)**

- **Goal:** Permitir que cidadãos comparem dois políticos lado a lado em uma única página, com dados de score, legislativo e financeiro, mantendo links para fontes oficiais e neutralidade editorial (DR-002).
- **Scope:** Nova rota `apps/web/src/app/comparar/page.tsx` — Server Component, ISR `revalidate=0` (dados personalizados por seleção via URL). URL pattern: `/comparar?a={slug1}&b={slug2}` para shareabilidade. Dois `<ComboboxSearch>` Client Components reutilizando `fetchPoliticians({search})` com debounce 300ms. `Promise.all([fetchPoliticianBySlug(a), fetchPoliticianBySlug(b)])` para busca paralela no Server Component. Tabela comparativa: 4 linhas de score components (transparência, legislativo, financeiro, anticorrupção) + participação em votações + número de projetos — 2 colunas (um por político). Mobile: scroll horizontal com nome do político sticky na primeira coluna. `generateMetadata()`: `og:title = "Compare {Nome1} vs {Nome2} — Autoridade Política"`. Empty state quando nenhum político selecionado. Botão "Compartilhar" que copia a URL para clipboard (Client Component). Sem novo endpoint de API — reutiliza endpoints existentes.
- **DB changes:** Nenhuma
- **Success signal:** `/comparar?a=slug1&b=slug2` carrega com dados reais em < 2s LCP. Sem highlighting editorial de "melhor/pior" (DR-002). axe-core: zero violações na nova rota.
- **Depends on:** Phase 2 (acessibilidade garantida antes de nova página)

**Phase 4: Alertas de Pontuação por Email (RF-POST-002)**

- **Goal:** Permitir que cidadãos engajados recebam notificação por email quando a pontuação de integridade de um político que acompanham mudar significativamente (variação ≥ 5 pontos ou mudança de `exclusion_flag`), sem autenticação completa e em conformidade com LGPD.
- **Scope:**
  - **DB:** Nova tabela `alert_subscriptions` (`id`, `politician_id` FK, `email_encrypted` bytea AES-256-GCM, `email_hash` SHA-256 único por politician, `unsubscribe_token` 32 bytes hex, `status` pending|active|unsubscribed, `created_at`, `confirmed_at`). Nova tabela `pending_subscriptions` (`id`, `email` plaintext temporário, `politician_id` FK, `confirm_token`, `expiry_at` TTL 24h). Migration: `0009_add_alert_subscriptions.sql`.
  - **API:** `POST /api/v1/politicians/:slug/subscribe` — recebe `{email}`, valida, insere em `pending_subscriptions`, envia email de confirmação via Resend, retorna 202. `GET /api/v1/subscribe/confirm?token={token}` — move de `pending` para `alert_subscriptions` (encripta email com AES-256-GCM + SHA-256), retorna 200. `GET /api/v1/subscribe/unsubscribe?token={token}` — marca `status=unsubscribed` e deleta `email_encrypted`, retorna 200.
  - **Pipeline:** Após scoring em `scoring.service.ts`, comparar `overall_score` novo vs. anterior; se `abs(novo - anterior) >= 5` ou `exclusion_flag` mudou, inserir job `score-alert` no pg-boss. Novo worker `apps/pipeline/src/alerts/score-alert.worker.ts`: busca `alert_subscriptions` ativos, para cada um decripta `email_encrypted` em memória, envia email via Resend com score anterior/novo, descarta email da memória.
  - **Frontend:** Componente `<SubscribeForm slug={slug} />` (Client Component) no rodapé de `apps/web/src/app/politicos/[slug]/page.tsx`. Estados: idle → loading → success ("Verifique seu email") → error.
  - **Env vars novas:** `RESEND_API_KEY` em `apps/api` e `apps/pipeline`. `EMAIL_ENCRYPTION_KEY` (AES-256-GCM, 32 bytes) em `apps/pipeline`.
- **DB changes:** `packages/db/migrations/0009_add_alert_subscriptions.sql`
- **Success signal:** Fluxo completo: subscrição → email de confirmação → confirmação → score varia ≥ 5 → email de alerta enviado. Unsubscribe funcional via link. DevTools: nenhum email em texto plano no banco de dados.
- **Depends on:** Phase 3

**Phase 5: API Pública Documentada (RF-POST-003)**

- **Goal:** Abrir a API da plataforma para pesquisadores, jornalistas e developers civic tech com documentação interativa, sistema de chaves self-service e rate limiting diferenciado por tier, sem comprometer a segurança da camada interna (DR-001, DR-006).
- **Scope:**
  - **DB:** Nova tabela `api_keys` (`id`, `key_prefix` 8 chars para display, `key_hash` SHA-256, `tier` free|research, `owner_email_hash` SHA-256, `created_at`, `last_used_at`, `revoked_at`). Migration: `0010_add_api_keys.sql`.
  - **API:** Instalar `@fastify/swagger` + `@scalar/fastify-api-reference`. Registrar `@fastify/swagger` com OpenAPI 3.1 spec gerada dos schemas TypeBox existentes. Scalar UI em `GET /docs`. Middleware `apps/api/src/hooks/api-key.hook.ts`: lê `X-API-Key` header, SHA-256 lookup em `api_keys`, injeta `request.apiTier` (anonymous|free|research). Rate limit diferenciado: `anonymous` = 60 req/min, `free` = 120 req/min, `research` = 600 req/min via `keyGenerator` baseado em `request.apiTier + request.ip`. `POST /api/v1/api-keys`: recebe `{email, tier, purpose}`, gera chave `pah_{random32hex}`, armazena hash, envia chave por email via Resend (exibida UMA vez), retorna `{prefix, createdAt, tier}`.
  - **OpenAPI:** Tags por recurso nos TypeBox schemas: `politicians`, `bills`, `votes`, `expenses`, `proposals`, `committees`, `sources`. Exemplos de request/response em todos os schemas. Campo `last_updated` documentado explicitamente em todas as responses.
  - **Docs:** Seção "Para Desenvolvedores" no `README.md` raiz linkando para `/docs`.
- **DB changes:** `packages/db/migrations/0010_add_api_keys.sql`
- **Success signal:** Scalar UI acessível em `/docs` sem autenticação. Chave `pah_xxx` com tier `research` recebe 600 req/min; `anonymous` recebe 60 req/min. `next build` + `vercel build` passam. DR-001: `internal_data` schema sem exposição via API documentada.
- **Depends on:** Phase 4

### Parallelism Notes

- Phases 1 e 2 podem rodar em worktrees simultâneas — ambas são independentes de novas APIs e tabelas de banco de dados
- Phase 3 depende de Phase 2 (acessibilidade garantida antes de adicionar nova página `/comparar`)
- Phase 4 depende de Phase 3 (componente `<SubscribeForm>` integrado ao perfil do político que pode ter sido ajustado em Phase 3)
- Phase 5 depende de Phase 4 (reutiliza Resend e padrão de email para self-service de chaves)
- Phase 7 (pipeline scoring) já existe — Phase 4 apenas adiciona o step de detecção de diff e job pg-boss

---

## Technical Infrastructure Notes

### New API Endpoints Required

| Endpoint | RF/Phase | Returns |
|----------|----------|---------|
| `POST /api/v1/politicians/:slug/subscribe` | RF-POST-002 / Phase 4 | 202 Accepted |
| `GET /api/v1/subscribe/confirm?token={token}` | RF-POST-002 / Phase 4 | 200 confirmation message |
| `GET /api/v1/subscribe/unsubscribe?token={token}` | RF-POST-002 / Phase 4 | 200 unsubscribed message |
| `POST /api/v1/api-keys` | RF-POST-003 / Phase 5 | `{prefix, createdAt, tier}` |
| `GET /docs` | RF-POST-003 / Phase 5 | Scalar UI (HTML) |

### New DB Tables Required

| Table | Schema | RF/Phase | Migration |
|-------|--------|----------|-----------|
| `public.alert_subscriptions` | public | RF-POST-002 / Phase 4 | 0009_add_alert_subscriptions.sql |
| `public.pending_subscriptions` | public | RF-POST-002 / Phase 4 | 0009_add_alert_subscriptions.sql |
| `public.api_keys` | public | RF-POST-003 / Phase 5 | 0010_add_api_keys.sql |

### New Next.js Routes Required

| Route | RF/Phase | Type |
|-------|----------|------|
| `/comparar` | RF-POST-001 / Phase 3 | ISR `revalidate=0` (data driven by URL params) |

### New Packages Required

| Package | App | Phase | Motivo |
|---------|-----|-------|--------|
| `next-plausible` | `apps/web` | 1 | Plausible Analytics compatível com App Router e Turbopack |
| `@axe-core/playwright` | `apps/web` | 2 | WCAG 2.1 audit em testes E2E Playwright existentes |
| `resend` | `apps/api`, `apps/pipeline` | 4 | Email transacional — confirmação double opt-in e alertas de score |
| `@fastify/swagger` | `apps/api` | 5 | Geração automática de OpenAPI 3.1 a partir dos schemas TypeBox |
| `@scalar/fastify-api-reference` | `apps/api` | 5 | Scalar UI moderno (alternativa ao swagger-ui, zero jQuery) |

### New Environment Variables Required

| Variable | App | Phase | Description |
|----------|-----|-------|-------------|
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | `apps/web` | 1 | Domínio Plausible (`autoridade-politica.com.br`) |
| `NEXT_PUBLIC_PLAUSIBLE_ENABLED` | `apps/web` | 1 | Flag para desativar em CI/dev (`true`/`false`) |
| `RESEND_API_KEY` | `apps/api`, `apps/pipeline` | 4 | Chave Resend para envio de emails transacionais |
| `EMAIL_ENCRYPTION_KEY` | `apps/pipeline` | 4 | AES-256-GCM key para criptografar emails armazenados (similar a `CPF_ENCRYPTION_KEY`) |

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Analytics | Plausible Cloud | GA4, Mixpanel, self-hosted Plausible | LGPD-compliant por design, zero cookies → zero banner, €9/mês cabe no orçamento, `next-plausible` tem suporte nativo App Router |
| Email provider | Resend | SendGrid, Mailgun, AWS SES | DX superior (SDK TypeScript first-class), free tier (3.000/mês) suficiente para MVP post, onboarding < 1 hora |
| Storage de email para alertas | AES-256-GCM encrypted + SHA-256 hash | Email plaintext, hash-only | Mesma infraestrutura do CPF (`crypto/cpf.ts`) — LGPD minimização de dados, padrão DR-005 aplicado a emails |
| Swagger UI | Scalar | swagger-ui-express, Redoc | Mais moderno (sem jQuery), menor bundle, suporte nativo TypeBox + Fastify, manutenção ativa |
| Endpoint de comparação | Sem endpoint dedicado (2x `fetchPoliticianBySlug`) | Endpoint `/compare?a=slug1&b=slug2` | Dados já existem no endpoint de perfil; YAGNI; menos surface de API para documentar e manter |
| Fase order | Analytics → A11y → Comparação → Alertas → API | Por complexidade, por RF ID | Analytics entrega valor imediato (sem risco); A11y resolve dívida técnica antes de adicionar páginas; Alertas reutilizados pela API de chaves |

---

## Research Summary

**Web Research (2026-03-15)**

Comparação de políticos (UX): Layout colunar com sticky label column para mobile e scroll horizontal é o padrão de scannabilidade para comparação. Limitar a 2 políticos em mobile. Valores devem ser normalizados (mesmo período para despesas). Links para fonte oficial em cada atributo (LAI compliant).

API pública (civic tech): `X-API-Key` header como padrão de autenticação. HTTP 429 + `Retry-After` para rate limiting. Open States API e ProPublica Congress API como referências: `{status, results, num_results}` envelope, `last_updated` em cada record. 5.000 req/dia como free tier inicial.

Analytics LGPD-compliant: `next-plausible` é compatível com App Router e Turbopack. Plausible não usa cookies por design — zero cookie banner obrigatório no Brasil. Suporte a proxy de analytics pelo próprio domínio para mitigar ad-blockers.

Alertas por email: Trigger em pg-boss após diff de score (não trigger de banco de dados — mantém consistência com arquitetura existente). "Alert fatigue" prevention via throttle de 1 email/semana por subscritor. Resend como provider moderno TypeScript-first com free tier suficiente para MVP post.

**Codebase Audit (2026-03-15)**

`apps/api/src/app.ts:49` — rate limit global único, sem middleware de chave. `packages/db/src/public-schema.ts` — sem tabelas de alertas ou API keys. `apps/web/src/lib/api-client.ts` — `fetchPoliticianBySlug()` e `fetchPoliticians({search})` existentes são suficientes para comparação (zero novo endpoint necessário). `apps/pipeline/src/scoring/engine.ts` — scoring engine como pure function; diff pode ser calculado após cada run. `apps/pipeline/src/crypto/cpf.ts` — infraestrutura AES-256-GCM reutilizável para criptografia de email.

---

*Generated: 2026-03-15*
*Status: DRAFT — pronto para implementação por fases*
