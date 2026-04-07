# Dashboard SaaS Multi-tenant

Aplicação SaaS completa com suporte a múltiplas organizações, RBAC, autenticação segura, faturamento via Stripe e uma interface moderna construída com Next.js 15.

## Stack

| Camada | Tecnologias |
|--------|------------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Auth | Auth.js v4 (NextAuth) — JWT, bcryptjs, TOTP 2FA |
| Backend | Prisma 7 + PrismaPg adapter, PostgreSQL 16 |
| Pagamentos | Stripe (checkout, portal, webhooks) |
| Email | Resend (transacional) |
| Validação | Zod, React Hook Form |
| Testes | Jest (unit + UI + integração), Playwright (E2E) |

## Funcionalidades

- **Autenticação completa** — signup com verificação de email, login, esqueci senha, bloqueio progressivo por tentativas, alertas de segurança, sessões gerenciáveis, 2FA via TOTP
- **Multi-tenancy** — cada usuário pode pertencer a várias organizações; dados completamente isolados por org
- **RBAC** — 4 roles (OWNER, ADMIN, MEMBER, VIEWER) com permissões granulares em todas as operações
- **Convites por email** — link com token, validade de 7 dias, revogação, idempotência
- **Projetos e tarefas** — CRUD com filtros, paginação, edição inline, bulk actions, Kanban com drag & drop, responsável por tarefa
- **Faturamento** — planos FREE/PRO/BUSINESS, Stripe checkout/portal, webhooks com idempotência, grace period em inadimplência, cron de reconciliação
- **Admin Console** — painel interno com allowlist por email, ações de moderação (unlock, force plan, etc.) e audit log imutável
- **Export/Import** — exportação e importação de dados da org em JSON com validação, dry-run e rollback transacional
- **Segurança** — rate limiting por IP/email, CSRF, CSP, Turnstile anti-bot, auditoria de ações

## Como rodar localmente

**Pré-requisitos:** Node.js 20+, pnpm, Docker Desktop

```bash
pnpm install
cp .env.example .env.local    # preencher as variáveis obrigatórias
pnpm db:up                    # sobe Postgres via Docker
pnpm db:migrate               # aplica as migrations
pnpm db:seed                  # popula com dados de exemplo
pnpm dev
```

Acesse **http://localhost:3000**

## Credenciais de exemplo (seed)

| Role | Email | Senha |
|------|-------|-------|
| Owner | `owner@example.com` | `senha123` |
| Member | `member@example.com` | `senha123` |
| Viewer | `viewer@example.com` | `senha123` |

## Testes

```bash
pnpm test           # unitários (sem banco)
pnpm test:ui        # componentes com RTL (sem banco)
pnpm test:int       # integração com PostgreSQL
pnpm test:e2e       # E2E com Playwright (requer app rodando)
```

Para os testes de integração, configure o banco de testes:

```bash
# Criar banco e aplicar migrations
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/saas_multitenant_test?schema=public" \
  pnpm exec prisma migrate deploy
```

## Variáveis de ambiente

Veja `.env.example` para a lista completa com descrições. As obrigatórias para desenvolvimento:

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Connection string do PostgreSQL |
| `NEXTAUTH_SECRET` | Chave secreta (gerada com `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | URL pública da aplicação |

## Scripts disponíveis

| Comando | Descrição |
|---------|-----------|
| `pnpm dev` | Servidor de desenvolvimento |
| `pnpm build` | Build de produção |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Verificação de tipos |
| `pnpm db:up / db:down` | Controle do container Postgres |
| `pnpm db:migrate` | Aplica migrations (banco principal) |
| `pnpm db:seed` | Popula banco com dados de exemplo |
| `pnpm db:studio` | Abre Prisma Studio |
