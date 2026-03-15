---
title: Post-MVP — Engajamento Cidadão & Alcance da Plataforma
created: 2026-03-15T01:18:00-03:00
status: active
author: rodrigorjsf
---

# PRD: Post-MVP — Engajamento Cidadão & Alcance da Plataforma

> **Referência PRD Principal:** `docs/prd/PRD.md` § 2.2 RF-POST-001 a RF-POST-004
> **Pré-requisito:** Todos os 11 fases do `rf-mvp-remaining-features.prd.md` estão `complete`
> **Gerado:** 2026-03-15

---

## Problem Statement

O MVP entregou a plataforma core: 594 políticos com perfis completos, pipeline de ingestão de 6 fontes, pontuação de integridade calculada e páginas com SEO. No entanto, a plataforma ainda tem três lacunas críticas de engajamento:

**1. Isolamento de perfis:** O cidadão não pode comparar dois políticos lado a lado — a única forma de comparação é abrir duas abas manualmente, o que aumenta a fricção cognitiva e reduz o tempo de sessão.

**2. Ausência de retorno:** Não existe mecanismo para trazer o cidadão engajado de volta à plataforma quando a situação de um político muda (novo escore, novo projeto, mudança no registro anticalorruption). Isso limita o MAU de longo prazo.

**3. Opacidade para desenvolvedores e pesquisadores:** A API interna existe mas não é documentada publicamente, não tem sistema de chaves e não tem limites de taxa diferenciados por perfil de uso. ONGs, jornalistas e pesquisadores acadêmicos não podem integrar os dados.

**4. Métricas cegas:** A plataforma não tem analytics de produção. Sem dados de uso real, é impossível priorizar melhorias, medir KPIs (≥3 páginas/sessão) ou justificar decisões de produto para stakeholders.

**5. Acessibilidade incompleta:** O PRD Principal define WCAG 2.1 Nível AA como requisito (RNF-A11Y-001 a 005), mas nenhuma fase do MVP incluiu auditoria sistemática com axe-core nem testes de navegação por teclado.

---

## User Stories

| Como... | Quero... | Para... |
|---------|----------|---------|
| Cidadão Engajado | Comparar dois políticos do mesmo estado lado a lado | Decidir em qual votar com base em comparação objetiva |
| Jornalista | Receber alerta por email quando a pontuação de um político mudar | Cobrir mudanças relevantes sem monitorar manualmente |
| Pesquisador Acadêmico | Acessar a API publicamente com chave própria | Integrar dados em estudos sem depender de scraping |
| Desenvolvedor Civic Tech | Ler documentação interativa OpenAPI da plataforma | Construir aplicações derivadas sem contato com a equipe |
| Usuário com Deficiência Visual | Navegar toda a plataforma pelo teclado e leitor de tela | Exercer o direito de acesso à informação política |
| Produto/Stakeholder | Ver métricas reais de uso (pages/session, bounce rate) | Validar hipóteses de produto e priorizar próximas features |

---

## Proposed Solution

Implementar 5 capacidades pós-MVP em fases sequenciais com paralelismo onde possível:

1. **Analytics LGPD-Compliant (Plausible)** — instrumentação passiva, zero cookie banner, dados reais em 24h
2. **Acessibilidade WCAG 2.1 AA** — auditoria axe-core + correções em todos os componentes existentes
3. **Comparação de Políticos (RF-POST-001)** — página `/comparar` com até 2 políticos, layout colunar, links para fontes
4. **Alertas de Pontuação (RF-POST-002)** — subscrição por email sem autenticação completa (email único como identificador); job pg-boss para detecção de variação e envio via Resend
5. **API Pública Documentada (RF-POST-003)** — chaves `X-API-KEY` com `api_keys` table, Swagger UI em `/api/docs`, rate limit diferenciado (free: 60 req/min, research: 600 req/min)

> **RF-POST-004 (Comentários/Social):** Explicitamente fora de escopo deste PRD — requer autenticação completa, moderação e prevenção de abuso. Será tratado em PRD separado.

---

## Success Metrics

| Métrica | Atual | Meta | Como Medir |
|---------|-------|------|------------|
| Pages por sessão | Não medido | ≥ 3 (KPI PRD) | Plausible Analytics |
| Taxa de rejeição | Não medida | < 60% | Plausible Analytics |
| MAU retornante (via alertas) | 0 | ≥ 5% dos inscritos/mês | Contagem `alert_subscriptions` ativos |
| Chamadas API pública/dia | 0 | > 100 após 30 dias | Logs `api_keys` usage |
| Score axe-core (zero violations) | Desconhecido | 0 violações críticas | Playwright + axe-core em CI |
| Lighthouse Accessibility | Desconhecido | ≥ 95 | Lighthouse CI |

---

## Scope

### In Scope

- Plausible Analytics: script no `<head>` via `next-plausible`, domínio configurado, zero cookies
- Auditoria WCAG 2.1 AA: axe-core em CI, correção de contraste, labels ARIA, foco de teclado em todos os componentes existentes
- Página `/comparar`: seleção de 2 políticos via search-as-you-type, tabela comparativa com 4 componentes de score + top 3 projetos + despesa total do ano corrente
- Subscrição de alertas: formulário simples (só email), confirmação double opt-in, hash do email para LGPD (não armazenar email plaintext — apenas SHA-256), envio via Resend quando `overall_score` variar ≥ 5 pontos, cancelamento via link único no email
- API pública: chaves `X-API-KEY` com prefixo `pah_`, documentação Swagger UI em `/api/docs` (Scalar ou swagger-ui), rate limiting diferenciado por tier (`api_reader` mantém 60 req/min, chave `research`: 600/min)
- CI: axe-core no pipeline de testes, `pnpm audit` no fluxo de segurança

### Out of Scope

- Autenticação completa (login, sessão, JWT) — necessária para alertas avançados, post-MVP diferente
- Comentários e features sociais (RF-POST-004) — PRD separado
- Comparação de mais de 2 políticos simultaneamente
- Dashboard de analytics para usuários finais
- SDKs para API pública (apenas REST + OpenAPI spec)
- App nativo (iOS/Android)
- Staging environment — continua pós-MVP conforme PRD principal §6.1

---

## Technical Notes

### Contexto do Codebase

**API atual** (`apps/api/src/`) — Fastify 5 com TypeBox, rate limit global de 60 req/min via `@fastify/rate-limit` (`app.ts:49`). Nenhum sistema de chaves existe ainda. Todos os endpoints são públicos sem autenticação.

**Frontend atual** (`apps/web/src/`) — Next.js 15 App Router, ISR, zero JavaScript de analytics. O `api-client.ts` tem pattern de `apiFetch` com `next.revalidate` e tags, reutilizável para comparação. `fetchPoliticians` aceita `search` param — base para search-as-you-type na comparação.

**Banco de dados** (`packages/db/src/public-schema.ts`) — `politicians` + `integrity_scores` já têm todos os campos necessários para comparação. Nenhuma tabela de usuários, subscrições ou chaves API existe.

**Pipeline** (`apps/pipeline/src/`) — pg-boss scheduler já configurado, padrão para alertas via detecção de diff no scoring.

### Decisões Técnicas

- **Analytics:** `next-plausible` (não `@plausible/tracker`) — compatível com App Router e turbopack. Script via `<PlausibleProvider>` no `layout.tsx` raiz. Zero cookies → zero banner LGPD. Self-hosted Plausible não necessário para MVP post — usar Plausible Cloud (GDPR/LGPD compliant).
- **Alertas — email como identificador:** Armazenar APENAS `SHA-256(email)` na tabela `alert_subscriptions` + um token aleatório para unsubscribe. O email plaintext é enviado para Resend na API edge (nunca persistido). Isso respeita LGPD minimização de dados.
- **Alertas — double opt-in:** Linha de `pending_subscriptions` com TTL de 24h via pg-boss job `subscription-confirm-expiry`.
- **API pública — sem PostgreSQL por chave:** Rate limit diferenciado via header `X-API-Tier` injetado pelo middleware de autenticação de chave após lookup em `api_keys` table. Chaves armazenadas como `SHA-256(key)` + prefix para display.
- **Comparação — sem nova rota API:** `GET /api/v1/politicians/:slug` já existe e retorna perfil completo. A página `/comparar` faz 2 fetches paralelos em Server Components — sem endpoint específico de comparação necessário.
- **Acessibilidade — axe-core em CI:** Usar `@axe-core/playwright` integrado nos testes E2E existentes (`pnpm test:e2e`). Não um passo separado — extender os testes Playwright que o projeto já tem.

### Domain Rules Mantidas

- **DR-001 (Silent Exclusion):** A comparação exibe apenas `exclusion_flag` boolean — nunca detalhes das exclusões.
- **DR-002 (Neutralidade Política):** Na tabela comparativa, nenhuma coluna é destacada como "melhor" — valores neutros sem highlighting editorial.
- **DR-005 (CPF):** Alertas usam slug (não CPF) para identificar políticos. O email é processado apenas em memória via API.
- **DR-008 (Frontend Security):** Plausible é o único script externo adicionado — deve ter SRI hash conforme RNF-SEC-016.

---

## Implementation Phases

### Phase 1: Analytics LGPD-Compliant
**Goal:** Instrumentar a plataforma com Plausible Analytics para medir KPIs reais do PRD principal (pages/session, MAU, bounce rate) sem violar LGPD.
**Deliverable:** Script Plausible ativo em produção em `autoridade-politica.com.br`, page views e custom events visíveis no dashboard Plausible. Zero cookies. CI verifica que nenhum cookie de rastreamento é definido.
**Scope:**
- Instalar `next-plausible` em `apps/web`
- Adicionar `<PlausibleProvider>` no `apps/web/src/app/layout.tsx` com `domain="autoridade-politica.com.br"` e `selfHosted={false}`
- Adicionar SRI hash do script Plausible conforme RNF-SEC-016
- Configurar `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` como env var (único `NEXT_PUBLIC_` permitido além de `NEXT_PUBLIC_API_URL`)
- Custom events: `comparar_click`, `tab_click`, `filtro_aplicado`, `busca_realizada` via `usePlausible()` nos Client Components existentes
- Variável `NEXT_PUBLIC_PLAUSIBLE_ENABLED=false` para desativar em desenvolvimento/CI
**Dependencies:** None
**Status:** pending

### Phase 2: Acessibilidade WCAG 2.1 AA
**Goal:** Garantir que todos os componentes e páginas existentes atendam WCAG 2.1 Nível AA (RNF-A11Y-001 a 005) com zero violações críticas no axe-core.
**Deliverable:** `pnpm test:e2e` inclui verificação axe-core em todas as rotas principais. Lighthouse Accessibility ≥ 95 em CI. Todos os elementos interativos têm labels ARIA. Contraste ≥ 4.5:1 em todos os textos.
**Scope:**
- Instalar `@axe-core/playwright` em `apps/web`
- Criar teste Playwright `accessibility.spec.ts` que audita: `/`, `/politicos`, `/politicos/[slug]`, `/politicos/[slug]/projetos`, `/metodologia`, `/fontes`
- Corrigir violações encontradas em: contraste de cores, `aria-label` em botões de filtro, foco visível nos cards de políticos, `role` correto nas tabs de navegação do perfil, `alt` nas imagens de foto
- Adicionar `skip to content` link no layout raiz
- Verificar `min-height: 44px` em todos os touch targets (filtros, pagination, tabs)
- Adicionar Lighthouse CI step ao `.github/workflows/ci.yml` com threshold `accessibility: 95`
**Dependencies:** None (pode rodar em paralelo com Phase 1)
**Status:** pending

### Phase 3: Comparação de Políticos (RF-POST-001)
**Goal:** Permitir que cidadãos comparem dois políticos lado a lado em uma única página, com dados de score, legislativo e financeiro, mantendo links para fontes oficiais.
**Deliverable:** Página `/comparar` acessível, com seleção de 2 políticos via search-as-you-type, tabela comparativa responsiva (colunas no desktop, cards empilhados no mobile), zero labels editoriais de "melhor/pior" (DR-002).
**Scope:**
- Nova rota `apps/web/src/app/comparar/page.tsx` — SSR sem cache (dados são personalizados por seleção)
- Dois `<ComboboxSearch>` Client Components reutilizando `fetchPoliticians({search})` — debounce 300ms
- URL pattern: `/comparar?a={slug1}&b={slug2}` — state na URL para shareabilidade e OG metadata
- Tabela de comparação: 4 linhas de score components + participação em votações + despesa total do ano corrente + número de projetos — 2 colunas (um por político)
- Mobile: scroll horizontal com nome do político fixo na primeira coluna (sticky)
- `generateMetadata()`: `og:title = "Compare {Nome1} vs {Nome2} — Autoridade Política"`
- Empty state quando nenhum político selecionado: instrução clara sobre como usar
- Botão "Compartilhar" que copia a URL `/comparar?a=...&b=...` para o clipboard (Client Component)
- Sem novo endpoint de API — 2x `fetchPoliticianBySlug()` em paralelo via `Promise.all()`
**Dependencies:** Phase 2 (acessibilidade já garantida antes de adicionar nova página)
**Status:** pending

### Phase 4: Alertas de Pontuação por Email (RF-POST-002)
**Goal:** Permitir que cidadãos engajados recebam notificação por email quando a pontuação de integridade de um político que acompanham mudar significativamente (variação ≥ 5 pontos).
**Deliverable:** Formulário de subscrição no perfil do político. Double opt-in funcional. Job pg-boss detecta variação de score após cada ciclo de ingestão e envia email via Resend. Unsubscribe via link único. Nenhum email armazenado em plaintext (LGPD minimização).
**Scope:**

**DB (packages/db/src/public-schema.ts):**
- Nova tabela `alert_subscriptions`: `id`, `politician_id` (FK), `email_hash` (SHA-256, único por politician), `unsubscribe_token` (random 32 bytes hex), `status` (`pending|active|unsubscribed`), `created_at`, `confirmed_at`
- Nova tabela `pending_subscriptions`: `id`, `email` (plaintext, somente aqui, TTL via expiry_at), `politician_id` (FK), `confirm_token`, `expiry_at`
- Migration: `packages/db/migrations/0009_add_alert_subscriptions.sql`

**API (apps/api/src/):**
- `POST /api/v1/politicians/:slug/subscribe` — recebe `{email}`, valida formato, insere em `pending_subscriptions`, envia email de confirmação via Resend, retorna 202
- `GET /api/v1/subscribe/confirm?token={token}` — move de `pending_subscriptions` para `alert_subscriptions` (hash do email), retorna 200 com mensagem de confirmação
- `GET /api/v1/subscribe/unsubscribe?token={token}` — marca `status = unsubscribed`, retorna 200
- Novo env var: `RESEND_API_KEY` no `apps/api/.env`

**Pipeline (apps/pipeline/src/):**
- Após scoring (`scoring.service.ts`): comparar novo `overall_score` com score anterior; se `abs(novo - anterior) >= 5`, inserir job `score-alert` no pg-boss
- Novo worker `apps/pipeline/src/alerts/score-alert.worker.ts`: busca `alert_subscriptions` ativos para o político, para cada um constrói email com score anterior/novo e envia via Resend API usando o email plaintext (buscado de `pending_subscriptions`... não, usar pattern diferente — ver nota abaixo)

> **Nota técnica sobre email:** O email precisa ser recuperável para envio mas não deve ser armazenado indefinidamente. Solução: criptografar email com AES-256-GCM (mesma infraestrutura do CPF em `apps/pipeline/src/crypto/cpf.ts`) armazenando `email_encrypted` + `email_hash` (SHA-256 para unicidade). O pipeline decripta apenas em memória durante o envio. Após `unsubscribe`, o `email_encrypted` é deletado mas o hash permanece para evitar re-subscrição acidental.

**Frontend (apps/web/):**
- Componente `<SubscribeForm slug={slug} />` (Client Component) no rodapé de `apps/web/src/app/politicos/[slug]/page.tsx`
- Estados: idle → loading → success (mensagem "Verifique seu email") → error
- Sem armazenar nada no frontend — só POST para a API

**Dependencies:** Phase 3
**Status:** pending

### Phase 5: API Pública Documentada (RF-POST-003)
**Goal:** Abrir a API da plataforma para pesquisadores, jornalistas e developers civic tech com documentação interativa, sistema de chaves e rate limiting diferenciado por tier, mantendo a segurança da camada interna.
**Deliverable:** Swagger UI acessível em `https://api.autoridade-politica.com.br/docs` (ou `/api/docs`). Fluxo de self-service de geração de chave documentado. Rate limit de 600 req/min para chaves `research`. Zero acesso à schema `internal_data` (DR-001 mantida).
**Scope:**

**DB:**
- Nova tabela `api_keys`: `id`, `key_prefix` (primeiros 8 chars para display), `key_hash` (SHA-256 da chave completa), `tier` (`free|research`), `owner_email_hash`, `created_at`, `last_used_at`, `revoked_at`
- Migration: `packages/db/migrations/0010_add_api_keys.sql`

**API:**
- Instalar `@fastify/swagger` + Scalar (alternativa moderna ao Swagger UI) em `apps/api`
- Registrar `@fastify/swagger` com OpenAPI 3.1 spec gerada a partir dos schemas TypeBox existentes
- Servir Scalar UI em `GET /docs`
- Middleware de autenticação de chave: `apps/api/src/hooks/api-key.hook.ts` — lê `X-API-Key` header, faz SHA-256, lookup em `api_keys`, injeta `request.apiTier` (`anonymous|free|research`)
- Rate limit diferenciado: `anonymous` = 60 req/min (mantém atual), `free` = 120 req/min, `research` = 600 req/min — configurado via `@fastify/rate-limit` com função `keyGenerator` baseada em `request.apiTier + request.ip`
- `POST /api/v1/api-keys` — recebe `{email, tier, purpose}`, valida, gera chave `pah_{random32hex}`, armazena hash, envia chave por email via Resend (exibida UMA vez), retorna `{prefix, createdAt}`
- Adicionar `x-api-key` como parâmetro de header em todos os routes' TypeBox schemas para aparecer na documentação
- Adicionar `last_updated` field nas responses de recursos (já existe via `updatedAt`) — documentar explicitamente

**Documentação:**
- `README.md` na raiz com seção "Para Desenvolvedores" linkando para `/api/docs`
- OpenAPI tags por recurso: `politicians`, `bills`, `votes`, `expenses`, `proposals`, `committees`, `sources`
- Adicionar exemplos de request/response nos schemas TypeBox

**Dependencies:** Phase 4
**Status:** pending

---

## Technical Infrastructure

### Novos Pacotes

| Pacote | App | Motivo |
|--------|-----|--------|
| `next-plausible` | `apps/web` | Plausible Analytics App Router compatible |
| `@axe-core/playwright` | `apps/web` | WCAG 2.1 audit em testes E2E |
| `resend` | `apps/api` | Transactional email (alertas + confirmação) |
| `@fastify/swagger` | `apps/api` | OpenAPI spec generation a partir de TypeBox schemas |
| `@scalar/fastify-api-reference` | `apps/api` | Scalar UI (alternativa moderna ao Swagger UI) |

### Novos DB Tables

| Tabela | Schema | Phase | Migration |
|--------|--------|-------|-----------|
| `alert_subscriptions` | public | 4 | 0009_add_alert_subscriptions.sql |
| `pending_subscriptions` | public | 4 | 0009_add_alert_subscriptions.sql |
| `api_keys` | public | 5 | 0010_add_api_keys.sql |

### Novas Variáveis de Ambiente

| Var | App | Phase | Descrição |
|-----|-----|-------|-----------|
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | `apps/web` | 1 | Domínio para Plausible (ex: `autoridade-politica.com.br`) |
| `NEXT_PUBLIC_PLAUSIBLE_ENABLED` | `apps/web` | 1 | Flag para desativar em CI/dev (`true`/`false`) |
| `RESEND_API_KEY` | `apps/api`, `apps/pipeline` | 4 | Chave da API Resend para envio de emails |
| `EMAIL_ENCRYPTION_KEY` | `apps/pipeline` | 4 | AES-256-GCM key para criptografar emails (similar a `CPF_ENCRYPTION_KEY`) |

### Novas Rotas Next.js

| Rota | Phase | Tipo |
|------|-------|------|
| `/comparar` | 3 | SSR (no cache — state via URL params) |

---

## Open Questions

- [ ] **Phase 1:** Plausible Cloud (€9/mês) vs. self-hosted. Dado custo alvo < $100/mês, Plausible Cloud cabe no orçamento. Confirmar antes de criar conta.
- [ ] **Phase 4:** Rate limit de envio de email — Resend free tier: 100 emails/dia, 3000/mês. Suficiente para MVP post? Se houver mais de 3000 inscrições, upgrade para plano pago necessário.
- [ ] **Phase 4:** Variação de score ≥ 5 pontos como threshold — muito agressiva (spam) ou muito conservadora (invisível)? Considerar também alertar se `exclusion_flag` mudar de `false → true`.
- [ ] **Phase 5:** Self-service key generation email via Resend ou formulário manual (Google Forms) como intermediário seguro para tier `research`? O formulário manual tem custo zero mas não é escalável.
- [ ] **Phase 5:** A URL da API pública deve ser `api.autoridade-politica.com.br` (subdomínio separado via Cloudflare) ou `autoridade-politica.com.br/api`? Subdomínio é mais profissional para API pública mas requer configuração de CORS adicional.

---

## Decisions Log

| Decisão | Escolha | Alternativas | Racional |
|---------|---------|--------------|---------|
| Analytics | Plausible Cloud | GA4, Mixpanel, self-hosted Plausible | LGPD-compliant por design, zero cookies, ≤ €9/mês, App Router nativo |
| Email provider | Resend | SendGrid, Mailgun, AWS SES | DX superior, SDK TypeScript first-class, free tier suficiente para MVP post |
| Alertas — storage de email | AES-256-GCM encrypted + SHA-256 hash | Email plaintext, hash-only | Mesmo padrão do CPF (DR-005 equivalente para LGPD) |
| Swagger UI | Scalar | swagger-ui-express, Redoc | Mais moderno, zero jQuery, menor bundle, suporte nativo TypeBox |
| Comparação | Sem endpoint de comparação | Endpoint dedicado `/compare` | 2x `fetchPoliticianBySlug` em paralelo já retorna todos os dados necessários — YAGNI |
| Fase ordem | Analytics → A11y → Comparação → Alertas → API | Alfabética, por complexidade | Analytics entrega valor imediato sem risco; A11y resolve dívida técnica antes de adicionar páginas; Alertas antes da API (reusa Resend) |

---

## Parallelism Notes

- **Phase 1 e Phase 2** podem rodar em worktrees simultâneas — ambas são independentes de novas APIs e tabelas.
- **Phase 3** depende de Phase 2 (acessibilidade garantida antes de nova página).
- **Phase 4** depende de Phase 3 (botão "Assinar alertas" aparece na página de perfil que pode ser afetada pela comparação).
- **Phase 5** depende de Phase 4 (reutiliza Resend e padrão de email para self-service de chaves).

---

## Acceptance Criteria (Global)

- [ ] `pnpm lint && pnpm typecheck && pnpm test && vercel build` passam em todas as fases
- [ ] Zero violações axe-core críticas/sérias em todas as rotas após Phase 2
- [ ] Plausible registra page views em produção sem cookies (verificável via DevTools → Application → Cookies)
- [ ] `/comparar?a=slug1&b=slug2` carrega com dados reais em < 2s LCP
- [ ] Double opt-in funcional: subscrição não ativa sem confirmação por email
- [ ] `X-API-Key: pah_xxx` com tier `research` recebe rate limit de 600 req/min, `anonymous` recebe 60 req/min
- [ ] Swagger/Scalar UI acessível em `/docs` sem autenticação
- [ ] DR-001, DR-002, DR-005, DR-008 todas mantidas em todas as fases
- [ ] Nenhuma chave API, email, ou token armazenado em plaintext no banco de dados

---

*Gerado: 2026-03-15*
*Status: DRAFT — aguardando revisão antes de criar planos de implementação por fase*
