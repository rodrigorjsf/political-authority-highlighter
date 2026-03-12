# Feature: Stack local com Supabase local

## Summary

Migrar toda a stack local para usar **Supabase local** como única forma de subir o banco em desenvolvimento. Docker Compose (PostgreSQL na porta 5433) deixa de ser o método padrão; passa a ser opcional ou documentado como fallback. Definição e aplicação de migrations ficam alinhadas ao Supabase CLI (`supabase start`, `supabase db reset`, `supabase db push`). Roles (`api_reader`, `pipeline_admin`) e schema `internal_data` passam a ser criados via `supabase/roles.sql`. Configurações, documentação (CLAUDE.md, README, PRD, skills) e CI/CD são atualizadas para refletir o fluxo local (só `--local` na fase inicial) e o preparo para ambiente de desenvolvimento remoto e deploy.

## User Story

Como **desenvolvedor** do Political Authority Highlighter  
quero **usar o Supabase local como único ambiente de banco em dev**  
para **ter paridade com produção (Supabase), um único fluxo de migrations e menos manutenção (sem Docker Compose obrigatório)**.

## Problem Statement

- Hoje existem **dois** meios de subir o banco local: Docker Compose (porta 5433, `init-schemas.sql`) e Supabase CLI (porta 54322). A documentação já cita Supabase CLI, mas o README e exemplos ainda orientam Docker + `drizzle-kit migrate`.
- `supabase/config.toml` usa `schema_paths` apontando para `packages/db/migrations/*.sql`; paths são **relativos ao diretório `supabase/`**, então o CLI procura `supabase/packages/db/migrations/` (inexistente). O seed referencia `./seed.sql`, que não existe em `supabase/`.
- Roles e grants (`api_reader`, `pipeline_admin`, `internal_data`) estão apenas em `infrastructure/init-schemas.sql`, usado só pelo Docker. No Supabase local não há equivalente (ex.: `supabase/roles.sql`).
- O pacote `@pah/db` exporta `"./migrate": "./src/migrate.ts"`, mas o arquivo **não existe**.
- CI não sobe Postgres; deploy já usa `supabase link` + `supabase db push`. É necessário deixar explícito: operações locais sempre com `--local` quando aplicável e preparar variáveis/segredos para desenvolvimento remoto e deploy.

## Solution Statement

- **Local (fase inicial):** Único fluxo de dev = `supabase start` (e quando necessário `supabase db reset`). Connection string local: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`. Todas as operações do Supabase CLI em contexto local usam a flag `--local` quando o comando a suportar.
- **Migrations:** Manter Drizzle como gerador em `packages/db/migrations`. Garantir que o Supabase CLI aplique as mesmas migrations: ou configurando paths relativos ao `supabase/` que apontem para `../packages/db/migrations`, ou mantendo `supabase/migrations/` em sync com `packages/db/migrations` e usando o diretório padrão do CLI.
- **Roles e schema:** Criar `supabase/roles.sql` com o conteúdo essencial de `init-schemas.sql` (extensions, schema `internal_data`, função `unaccent_immutable`, roles `api_reader` e `pipeline_admin`, grants). Assim `supabase start` e `supabase db reset` recriam o ambiente de roles/grants localmente.
- **Seed:** Criar `supabase/seed.sql` (ou symlink/cópia de `infrastructure/seed.sql`) e ajustar `config.toml` para apontar para ele.
- **Env e apps:** Atualizar `.env.example` (e documentação) com URLs locais para Supabase (porta 54322). API e pipeline já usam `DATABASE_URL_READER`, `DATABASE_URL_WRITER` e `DATABASE_URL`; apenas os valores de exemplo e a doc mudam para o formato Supabase local.
- **Docker Compose:** Manter opcional ou como fallback; README/CLAUDE passam a recomendar Supabase local como padrão.
- **Deploy e preparo para dev remoto:** Manter `deploy.yml` com `supabase db push` (sem `--local`) para produção; documentar secrets e passos para ambiente de desenvolvimento remoto (e staging, se aplicável). Usar Supabase MCP e CLI para validações quando disponível.
- **Docs e skills:** Atualizar CLAUDE.md (raiz e infrastructure), README.md, docs/prd (se houver referências a Docker/5433), e skills (project-architecture, project-cicd, etc.) para refletir Supabase local e fluxo de migrations via CLI.
- **Correção de export:** Remover ou implementar o export `@pah/db/migrate` (arquivo `src/migrate.ts` inexistente).

## Metadata

| Field | Value |
|-------|--------|
| Type | REFACTOR |
| Complexity | MEDIUM |
| Systems Affected | packages/db, apps/api, apps/pipeline, infrastructure, supabase/, .github/workflows, .env*, CLAUDE.md, README.md, docs/prd, .agents/skills |
| Dependencies | supabase CLI ^2.77.0, Drizzle ORM 0.36, postgres driver 3.4 |
| Estimated Tasks | 16 |

---

## UX Design

### Before State

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Developer      │────▶│  docker compose  │────▶│  PostgreSQL     │
│  Setup          │     │  up -d          │     │  :5433          │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
        │                                                      │
        │  pnpm --filter @pah/db migrate (DATABASE_URL=...5433) │
        └──────────────────────────────────────────────────────┘
        │
        ▼
  .env.local: DATABASE_URL* → localhost:5433/authority_highlighter
  init-schemas.sql: roles + internal_data (só no primeiro init do container)

  PAIN: Dois fluxos (Docker vs Supabase); config.toml aponta para paths inexistentes;
        roles não aplicados no Supabase local; migrate.ts exportado e ausente.
```

### After State

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Developer      │────▶│  supabase start │────▶│  Supabase local  │
│  Setup          │     │  (--local impl.)│     │  Postgres :54322 │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
        │                                                      │
        │  roles.sql + supabase/migrations aplicados no start   │
        │  supabase db reset quando precisar reaplicar          │
        └──────────────────────────────────────────────────────┘
        │
        ▼
  .env.local: DATABASE_URL* → 127.0.0.1:54322/postgres
  supabase/roles.sql: api_reader, pipeline_admin, internal_data, extensions
  supabase/seed.sql (ou link para infrastructure/seed.sql)

  VALUE: Um único fluxo local; paridade com produção; migrations e roles versionados no repo.
```

### Interaction Changes

| Location | Before | After | User Impact |
|----------|--------|--------|-------------|
| README "Getting Started" | docker compose up -d, pnpm migrate | supabase start (e opcional db reset) | Desenvolvedor sobe apenas Supabase local |
| .env.example | URLs com :6543 / 5433 | URLs locais 54322 + comentário para remoto | Copy-paste correto para local |
| supabase/config.toml | schema_paths quebrados, seed.sql inexistente | schema_paths válidos, seed correto | supabase start/db reset aplicam migrations e seed |
| packages/db | export "./migrate" → arquivo ausente | Export removido ou migrate.ts implementado | Sem referência quebrada |
| deploy.yml | supabase db push (já correto) | Idem + doc/comment sobre --local só para local | Deploy remoto explícito |
| CLAUDE.md / infrastructure/CLAUDE.md | Mistura Docker + Supabase | Supabase local como padrão, Docker opcional | Doc alinhada ao fluxo único |
| Skills (architecture, cicd) | Podem citar Docker/5433 | Citam Supabase local e porta 54322 | Skills corretas para decisões |

---

## Mandatory Reading

**CRITICAL: Implementation agent MUST read these files before starting any task:**

| Priority | File | Lines | Why Read This |
|----------|------|-------|----------------|
| P0 | `packages/db/src/clients.ts` | 1-35 | Padrão createPublicDb/createPipelineDb e uso de usePooling |
| P0 | `infrastructure/init-schemas.sql` | 1-47 | Conteúdo a extrair para supabase/roles.sql (extensions, schema, roles, grants) |
| P0 | `supabase/config.toml` | 28-75 | [db], [db.migrations], [db.seed]; paths relativos a supabase/ |
| P1 | `packages/db/drizzle.config.ts` | 1-26 | DATABASE_URL e out: './migrations' |
| P1 | `apps/api/src/app.ts` | 51-54 | Uso de DATABASE_URL_READER e usePooling (:6543) |
| P1 | `apps/pipeline/src/index.ts` | 11-17 | DATABASE_URL_WRITER e DATABASE_URL (pg-boss) |
| P1 | `.github/workflows/deploy.yml` | 1-36 | supabase link e db push (remoto) |
| P2 | `packages/db/package.json` | 1-27 | Script migrate e export "./migrate" |
| P2 | `infrastructure/CLAUDE.md` | 56-90 | Fluxo Supabase CLI e migrations já descritos |

**Documentação externa:**

| Source | Section | Why Needed |
|--------|---------|------------|
| [Supabase CLI Introduction](https://supabase.com/docs/reference/cli/introduction) | Comandos locais e db push | Garantir uso correto de --local e remoto |
| [Supabase db push](https://supabase.com/docs/reference/cli/supabase-db-push) | --local vs sem --local | Aplicar migrations no local vs remoto |
| [Supabase db reset](https://supabase.com/docs/reference/cli/supabase-db-reset) | Reset local | Reaplicar migrations + seeds |
| [Supabase config](https://supabase.com/docs/guides/local-development/cli/config) | [db], schema_paths, sql_paths | Paths relativos a supabase/ |
| [Postgres Roles (Supabase)](https://supabase.com/docs/guides/database/postgres/roles) | roles.sql / custom roles | Criar api_reader e pipeline_admin |

---

## Patterns to Mirror

**DB client creation (API):**

```typescript
// SOURCE: apps/api/src/app.ts:51-54
const usePooling = env.DATABASE_URL_READER.includes(':6543')
const db = createPublicDb(env.DATABASE_URL_READER, usePooling)
```

**DB client creation (Pipeline):**

```typescript
// SOURCE: apps/pipeline/src/index.ts:11-16
const db = createPipelineDb(env.DATABASE_URL_WRITER)
const boss = new PgBoss(env.DATABASE_URL)
await boss.start()
```

**Env validation (fail-fast):**

```typescript
// SOURCE: apps/api/src/config/env.ts (objeto Zod com DATABASE_URL_READER)
// SOURCE: apps/pipeline/src/config/env.ts (DATABASE_URL, DATABASE_URL_WRITER)
export const env = envSchema.parse(process.env)
```

**Drizzle config load:**

```typescript
// SOURCE: packages/db/drizzle.config.ts:6-16
config({ path: resolve(__dir, '../../.env.local') })
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL environment variable is required...')
```

**Roles e grants (init-schemas.sql):**

```sql
-- SOURCE: infrastructure/init-schemas.sql:19-47
-- CREATE SCHEMA internal_data; extensions; CREATE ROLE api_reader/pipeline_admin;
-- GRANT USAGE/SELECT em public para api_reader; REVOKE em internal_data para api_reader;
-- GRANT ALL em public e internal_data para pipeline_admin; DEFAULT PRIVILEGES
```

---

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `supabase/roles.sql` | CREATE | Roles, schema internal_data, extensions, grants (extrair de init-schemas.sql) |
| `supabase/seed.sql` | CREATE ou LINK | Seed local; pode ser symlink para `../infrastructure/seed.sql` ou cópia |
| `supabase/config.toml` | UPDATE | Corrigir [db.migrations] schema_paths (usar ./migrations ou path válido); [db.seed] sql_paths; alinhar major_version ao remoto (16 ou 17) |
| `supabase/migrations/` | SYNC | Garantir que contenha as mesmas migrations que packages/db/migrations (sync ou path em config) |
| `.env.example` | UPDATE | URLs locais Supabase (127.0.0.1:54322/postgres) e comentários para remoto |
| `README.md` | UPDATE | Getting Started com supabase start; remover ou tornar opcional docker compose + migrate |
| `CLAUDE.md` | UPDATE | Tabela de env e referências a local dev (Supabase, porta 54322) |
| `infrastructure/CLAUDE.md` | UPDATE | Reforçar Supabase local como padrão; Docker opcional; detalhes de roles.sql e migrations |
| `packages/db/package.json` | UPDATE | Remover export "./migrate" ou adicionar src/migrate.ts (recomendado: remover export) |
| `docker-compose.yml` | UPDATE ou KEEP | Manter como opcional; comentar que o padrão é supabase start |
| `.github/workflows/deploy.yml` | UPDATE | Comentários ou step opcional para staging; garantir que db push seja sem --local para remoto |
| `docs/prd/PRD.md` | UPDATE | Se houver menção a Docker/5433 como setup padrão, alinhar a Supabase local |
| `.agents/skills/project-architecture/SKILL.md` | UPDATE | Referência a Supabase local e porta 54322 |
| `.agents/skills/project-cicd/SKILL.md` | UPDATE | Supabase CLI local vs remoto; deploy db push |
| `supabase/README.md` | UPDATE | Fluxo: Drizzle generate → sync ou path → supabase start / db reset / db push |

---

## NOT Building (Scope Limits)

- **Autenticação Supabase (Auth):** Não configurar Auth, apenas DB local. Sem mudanças em login/OAuth.
- **Supabase Edge Functions:** Não adicionar ou alterar Edge Functions neste plano.
- **Testcontainers em CI:** Não adicionar job de integração com Postgres em CI neste plano (mencionado como futuro em project-cicd).
- **Ambiente de staging remoto:** Apenas preparar documentação e variáveis; criação real de projeto Supabase de staging fica fora do escopo.
- **Alteração de schema Drizzle:** Não mudar tabelas nem colunas; apenas onde e como migrations e roles são aplicados.

---

## Step-by-Step Tasks

Execute em ordem. Cada tarefa é atômica e verificável.

### Task 1: Criar `supabase/roles.sql` (roles, schema, extensions, grants)

- **ACTION:** Criar arquivo com o conteúdo necessário para o Supabase local espelhar `init-schemas.sql`.
- **IMPLEMENT:** Copiar/adaptar de `infrastructure/init-schemas.sql`: CREATE EXTENSION unaccent, pgcrypto; CREATE SCHEMA internal_data; função public.unaccent_immutable; CREATE ROLE api_reader e pipeline_admin (com LOGIN PASSWORD para dev); GRANTs para api_reader (USAGE + SELECT em public, REVOKE em internal_data); GRANTs para pipeline_admin (USAGE, CREATE, ALL em public e internal_data + DEFAULT PRIVILEGES).
- **MIRROR:** `infrastructure/init-schemas.sql:1-47`
- **GOTCHA:** Supabase local usa usuário `postgres` e senha `postgres`; roles podem usar senhas fixas para dev (ex.: reader_password_dev, admin_password_dev) como no init-schemas atual.
- **VALIDATE:** `supabase start` (ou `supabase db reset --local`) e em seguida conectar com psql ou Studio e verificar: `\du` (roles), `\dn` (schemas), permissões em public e internal_data.

### Task 2: Garantir migrations aplicadas pelo Supabase local

- **ACTION:** Fazer com que `supabase db reset` / `supabase start` apliquem as migrations do projeto.
- **OPÇÃO A:** Se o CLI aceitar path fora de supabase/, em `supabase/config.toml` em `[db.migrations]` usar `schema_paths = ["../packages/db/migrations/*.sql", "../packages/db/migrations/internal/*.sql"]` (ou equivalente) e testar. **OPÇÃO B (recomendada):** Manter migrations no diretório padrão do Supabase. Garantir que `supabase/migrations/` contenha os mesmos arquivos que `packages/db/migrations/` (incl. `internal/`). Criar script `packages/db/scripts/sync-migrations-to-supabase.sh` (ou npm script) que copie `packages/db/migrations/*.sql` e `packages/db/migrations/internal/*.sql` para `supabase/migrations/` preservando estrutura; documentar que após `drizzle-kit generate` deve rodar o sync antes de `supabase db push` ou `supabase db reset`. Em config.toml não usar schema_paths custom se for usar o diretório padrão `supabase/migrations/`.
- **VALIDATE:** `supabase db reset --local` e verificar tabelas em public e internal_data (ex.: politicians, integrity_scores, internal_data.politician_identifiers).

### Task 3: Configurar seed em `supabase/`

- **ACTION:** Garantir que o seed seja executado no `supabase db reset` local.
- **IMPLEMENT:** Se existir `infrastructure/seed.sql`, criar `supabase/seed.sql` como cópia ou symlink (ex.: `../infrastructure/seed.sql`). Ajustar `supabase/config.toml` em `[db.seed]` para `sql_paths = ["./seed.sql"]` (já está assim; só garantir que o arquivo exista).
- **VALIDATE:** `supabase db reset --local` e checar se dados de seed existem nas tabelas esperadas.

### Task 4: Ajustar `supabase/config.toml`

- **ACTION:** Revisar [db], [db.migrations], [db.seed].
- **IMPLEMENT:** [db]: confirmar `port = 54322`; alinhar `major_version` ao banco remoto (16 ou 17). [db.migrations]: se tiver adotado OPÇÃO B (supabase/migrations em sync), remover ou comentar schema_paths que apontem para packages/db (evitar path inexistente). [db.seed]: sql_paths = ["./seed.sql"] com supabase/seed.sql presente.
- **VALIDATE:** `supabase start` sem erros e logs indicando aplicação de migrations e seed.

### Task 5: Atualizar `.env.example` para Supabase local

- **ACTION:** Valores de exemplo para desenvolvimento local com Supabase.
- **IMPLEMENT:** DATABASE_URL, DATABASE_URL_READER, DATABASE_URL_WRITER com `postgresql://postgres:postgres@127.0.0.1:54322/postgres`. Comentário indicando que para remoto/staging usam-se URLs do dashboard (pooler 6543, etc.).
- **VALIDATE:** Copiar para .env.local e rodar API e pipeline contra `supabase start` (ambos devem conectar).

### Task 6: Atualizar `README.md` (Getting Started)

- **ACTION:** Substituir instruções de Docker + migrate por Supabase local.
- **IMPLEMENT:** Prerequisites: Node 20+, pnpm 9+, Supabase CLI (opcional Docker). Setup: `pnpm install`, `cp .env.example .env.local`, `supabase start` (e se necessário `supabase db reset`), `pnpm dev`. Remover ou marcar como opcional "docker compose up -d" e "pnpm --filter @pah/db migrate". Nota de porta: 54322 para DB local.
- **VALIDATE:** Seguir os passos do README em ambiente limpo e confirmar que a API responde.

### Task 7: Atualizar `CLAUDE.md` (raiz)

- **ACTION:** Alinhar tabela de env e descrição de stack local ao Supabase.
- **IMPLEMENT:** Na tabela Required Variables, indicar que para local as URLs usam 127.0.0.1:54322/postgres. Na seção de monorepo ou ambiente, referenciar Supabase CLI como padrão para desenvolvimento local (supabase start, db reset). Manter referência a 12-Factor e env.
- **VALIDATE:** Leitura cruzada com README e infrastructure/CLAUDE.md.

### Task 8: Atualizar `infrastructure/CLAUDE.md`

- **ACTION:** Supabase local como único fluxo padrão; Docker opcional.
- **IMPLEMENT:** Seção "Local Development Environment" com supabase start, stop, db reset; connection string 127.0.0.1:54322/postgres; menção a supabase/roles.sql e supabase/migrations. Migrations: gerar com Drizzle; aplicar local com supabase db reset (ou start); aplicar remoto com supabase db push. Manter docker-compose e init-schemas como fallback opcional.
- **VALIDATE:** Consistência com README e supabase/README.md.

### Task 9: Corrigir export `@pah/db/migrate`

- **ACTION:** Remover referência ao arquivo inexistente.
- **IMPLEMENT:** Em `packages/db/package.json`, remover a linha `"./migrate": "./src/migrate.ts"` do objeto `exports`. Se algum consumidor usar `@pah/db/migrate`, atualizar para usar o script `pnpm --filter @pah/db migrate` (drizzle-kit migrate) ou criar `src/migrate.ts` mínimo que chame drizzle-kit programaticamente (recomendado: só remover o export).
- **VALIDATE:** `pnpm typecheck` e busca por `@pah/db/migrate` no repo (grep); nenhum import quebrado.

### Task 10: Ajustar `docker-compose.yml` e documentação

- **ACTION:** Deixar Docker como opcional.
- **IMPLEMENT:** No topo de docker-compose.yml ou em README/infrastructure, comentário: "Opcional: uso quando não for usar Supabase local. Padrão: supabase start." Manter serviço postgres e init-schemas para quem quiser usar Docker.
- **VALIDATE:** Doc coerente; supabase start continua sendo o fluxo recomendado.

### Task 11: Revisar `.github/workflows/deploy.yml`

- **ACTION:** Garantir que deploy use apenas remoto; preparar para staging se aplicável.
- **IMPLEMENT:** Confirmar que não há `--local` no `supabase db push` (já está assim). Adicionar comentário no job deploy-db: "Push runs against linked remote project; for local use: supabase db push --local." Opcional: documentar variáveis SUPABASE_PROJECT_ID (staging) para futuro.
- **VALIDATE:** Workflow válido; leitura do deploy.yml clara.

### Task 12: Atualizar `docs/prd/PRD.md` (se aplicável)

- **ACTION:** Substituir referências a Docker/5433 como setup padrão por Supabase local.
- **IMPLEMENT:** Buscar "5433", "docker", "Docker Compose", "init-schemas" em docs/prd; ajustar para "Supabase local (supabase start, porta 54322)" onde for descrição de ambiente de desenvolvimento.
- **VALIDATE:** PRD coerente com README e CLAUDE.

### Task 13: Atualizar skill `project-architecture`

- **ACTION:** Refletir Supabase local e porta 54322.
- **IMPLEMENT:** Em `.agents/skills/project-architecture/SKILL.md`, na parte de Two-Schema Database ou Local Dev, indicar que o ambiente local usa Supabase CLI (supabase start), Postgres na porta 54322, e roles aplicados via supabase/roles.sql.
- **VALIDATE:** Skill não menciona mais 5433 como padrão.

### Task 14: Atualizar skill `project-cicd`

- **ACTION:** Alinhar à CLI Supabase (local vs remoto) e deploy.
- **IMPLEMENT:** Em `.agents/skills/project-cicd/SKILL.md`, na tabela Current Stack ou em Deploy: supabase/setup-cli para deploy; migrations aplicadas com `supabase db push` (remoto); local: `supabase start` e `supabase db reset --local`. Manter que não há Postgres em CI para unit tests.
- **VALIDATE:** Skill consistente com deploy.yml e infrastructure/CLAUDE.

### Task 15: Atualizar `supabase/README.md`

- **ACTION:** Fluxo claro Drizzle → Supabase.
- **IMPLEMENT:** 1) Gerar migrations: `pnpm --filter @pah/db drizzle-kit generate`. 2) (Se usar sync) Sincronizar para supabase/migrations conforme script/docs. 3) Local: `supabase start` ou `supabase db reset --local`. 4) Remoto: `supabase link` + `supabase db push`. Roles em supabase/roles.sql. Seed em supabase/seed.sql.
- **VALIDATE:** Seguir passos e conseguir subir local e aplicar migrations.

### Task 16: Verificar e documentar uso do Supabase MCP

- **ACTION:** Garantir que o plano e a doc mencionem o MCP do Supabase quando útil.
- **IMPLEMENT:** Em infrastructure/CLAUDE ou README, uma linha indicando que o Supabase MCP pode ser usado para consultar docs ou estado do projeto (conforme disponibilidade no ambiente). Não obrigatório para o fluxo mínimo; apenas preparação.
- **VALIDATE:** Nenhuma referência quebrada ao MCP; comandos CLI continuam sendo a fonte de verdade para execução.

---

## Testing Strategy

### Comandos de validação local

| Comando | Objetivo |
|---------|----------|
| `supabase start` | Stack sobe; DB em 54322; roles e migrations aplicados |
| `supabase db reset --local` | Reaplica migrations e seed |
| `pnpm dev` (com .env.local com 54322) | API e pipeline conectam ao Supabase local |
| `pnpm typecheck` | Sem erros após remoção do export migrate |
| `pnpm lint` | Sem erros |

### Edge Cases

- [ ] .env.local com porta 54322 e supabase rodando: API e pipeline conectam.
- [ ] supabase stop; apps falham ao conectar (comportamento esperado).
- [ ] Após drizzle-kit generate, sync para supabase/migrations (se OPÇÃO B) e supabase db reset: novas migrations aplicadas.
- [ ] deploy.yml em branch main: supabase db push executa contra projeto linkado (sem --local).

---

## Validation Commands

### Level 1: Static

```bash
pnpm lint && pnpm typecheck
```

**EXPECT:** Exit 0.

### Level 2: Local Supabase

```bash
supabase start
# Usar .env.local com DATABASE_URL* = postgresql://postgres:postgres@127.0.0.1:54322/postgres
pnpm dev
# Em outro terminal: curl http://localhost:3001/health (ou porta da API)
supabase stop
```

**EXPECT:** Health OK; depois stop limpo.

### Level 3: Full suite

```bash
pnpm test && pnpm build
```

**EXPECT:** Todos os testes passam; build OK.

### Level 4: Deploy workflow (dry-run ou em branch)

Garantir que `.github/workflows/deploy.yml` está correto (supabase link + supabase db push sem --local). Execução real depende de secrets no GitHub.

---

## Acceptance Criteria

- [ ] Desenvolvedor consegue subir o ambiente local apenas com `supabase start` e .env.local com 54322.
- [ ] Roles api_reader e pipeline_admin e schema internal_data existem após supabase start (via roles.sql).
- [ ] Migrations em supabase/migrations (ou via path válido) são aplicadas no start/reset.
- [ ] Seed é aplicado no db reset (supabase/seed.sql presente e config correta).
- [ ] README e CLAUDE.md (raiz + infrastructure) descrevem Supabase local como padrão.
- [ ] .env.example contém URLs locais para 54322.
- [ ] Export quebrado @pah/db/migrate removido (ou migrate.ts implementado).
- [ ] deploy.yml aplica migrations no remoto (sem --local); comentários claros.
- [ ] Skills project-architecture e project-cicd atualizadas.
- [ ] Nenhum teste existente quebrado; typecheck e lint passam.

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| schema_paths com path fora de supabase/ não ser suportado | MED | MED | Usar OPÇÃO B: sync de packages/db/migrations para supabase/migrations e diretório padrão do CLI |
| major_version (17) diferente do remoto (16) | LOW | MED | Verificar versão remota com SHOW server_version; alinhar config.toml |
| Consumidores do export @pah/db/migrate | LOW | LOW | Grep no repo; remover export; se houver uso, migrar para script pnpm |
| CI sem Postgres continuar quebrando testes que precisem de DB | LOW | LOW | Testes atuais usam stub/mock; integration tests com Testcontainers ficam para tarefa futura |

---

## Notes

- **Supabase CLI:** Todas as operações locais que suportam `--local` devem usá-la explicitamente na documentação (ex.: `supabase db push --local` para aplicar no local). No deploy, `supabase db push` sem flag aplica no projeto linkado.
- **Single source of migrations:** Drizzle continua sendo o gerador; o repositório de arquivos SQL pode ser packages/db/migrations (com sync para supabase/migrations) ou apenas supabase/migrations com script que chame drizzle-kit e mova arquivos. O plano recomenda sync para evitar path relativo não documentado.
- **Skills:** Além de project-architecture e project-cicd, outras skills em .agents (project-compliance, project-domain-rules, project-guardian, docs-stack) podem ser revisadas em passagem rápida para não citarem Docker como único fluxo local; não é obrigatório alterar todas se não mencionarem ambiente de banco.
- **MCP Supabase:** Usar para consultas à documentação ou estado do projeto quando disponível; não substitui a execução dos comandos do CLI pelo desenvolvedor ou CI.
