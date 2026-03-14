## Summary

<!-- Descreva o que este PR faz e por quê. Inclua o contexto do PRD quando aplicável. -->

## Type of Change

- [ ] `feat` — nova funcionalidade
- [ ] `fix` — correção de bug
- [ ] `refactor` — melhoria de código sem mudança de comportamento
- [ ] `perf` — melhoria de performance
- [ ] `test` — adição ou correção de testes
- [ ] `chore` — infraestrutura, CI/CD, dependências, documentação

## Changes

<!-- Liste as mudanças por camada. Remova as que não se aplicam. -->

**Database / Migrations**
-

**API (`apps/api/`)**
-

**Pipeline (`apps/pipeline/`)**
-

**Frontend (`apps/web/`)**
-

**Shared (`packages/shared/`, `packages/db/`)**
-

**Infra / CI / Docs**
-

## Testing

- [ ] `pnpm lint` — zero warnings
- [ ] `pnpm typecheck` — zero errors
- [ ] `pnpm test` — all tests pass
- [ ] `pnpm build` — builds successfully
- [ ] Novos testes escritos para código novo
- [ ] Verificação manual realizada

## Architecture & Domain Rules

- [ ] Nenhum tipo `any` introduzido
- [ ] Fronteiras de importação respeitadas (API não importa `internal-schema`)
- [ ] CPF nunca exposto em logs, respostas ou mensagens de erro
- [ ] Dados politicamente neutros e factuais (DR-002)
- [ ] Sem URLs, segredos ou valores hardcoded (novas vars em `.env.example`)
- [ ] Migrações de banco são reversíveis (up e down)
- [ ] Novos endpoints têm schemas TypeBox de request/response
- [ ] Novos componentes são acessíveis (navegação por teclado, ARIA)

## Related Issues / PRD

<!-- Ex: Completa RF-016 e RF-017 do PRD rf-mvp-remaining-features -->
<!-- Ex: PAH-N (branch); RF-X (PRD) -->
