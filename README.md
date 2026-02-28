# Dashboard SaaS Multi-tenant

Etapa 3 — Resolução de tenant e proteção de acesso por organização.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS 4 + shadcn/ui
- PostgreSQL 16 (via Docker)
- Prisma 7
- next-auth v4 (Credentials provider, JWT)
- bcryptjs + React Hook Form + Zod

## Pré-requisitos

- Node.js 20+ (LTS)
- pnpm (`npm install -g pnpm`)
- Docker Desktop rodando

## Como rodar do zero

```powershell
pnpm install
cp .env.example .env   # editar NEXTAUTH_SECRET, SEED_USER_*
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Acesse **http://localhost:3000** → `/login` → `/org/select`.

---

## Fluxo de navegação

```
/  →  sessão?  →  /org/select   (logado)
               →  /login        (não logado)

/org/select
  → 0 orgs: tela "sem organização"
  → 1 org:  redirect automático para /org/[slug]/dashboard
  → 2+ orgs: lista para escolher

/org/[orgSlug]/dashboard
  middleware (JWT check) → requireOrgContext(orgSlug) → renderiza
  ↓ sem sessão          → /login
  ↓ org não existe      → 404
  ↓ não é membro        → 404
```

## Proteção de acesso (duas camadas)

| Camada | O que faz | Onde |
|---|---|---|
| **Middleware** | Verifica JWT (sem DB) | `src/middleware.ts` |
| **requireOrgContext** | Resolve org + checa membership | Server Components |

> 404 em vez de 403: não expõe a existência de orgs que o usuário não acessa.

## Como testar

### Fluxo feliz
```
1. pnpm db:seed  →  cria usuário + orgs "org-default" e "acme"
2. pnpm dev
3. Acessar http://localhost:3000
4. Login: teste@example.com / senha123
5. /org/select mostra 2 orgs para escolher
6. Clicar em "Acme Corp" → /org/acme/dashboard
7. Sidebar mostra links corretos para /org/acme/*
```

### Fluxo bloqueado
```
# Org que não existe → 404
http://localhost:3000/org/outra-empresa/dashboard

# Sem sessão → /login
(abrir em aba anônima)
http://localhost:3000/org/acme/dashboard
```

## Credenciais de teste

| Campo | Valor |
|---|---|
| Email | `teste@example.com` |
| Senha | `senha123` |

---

## Helpers server-side

### `requireAuth()` — `src/server/auth/require-auth.ts`
Garante sessão ativa. Redireciona para `/login` se não houver.
Retorna `{ userId, email }`.

### `requireOrgContext(orgSlug)` — `src/server/org/require-org-context.ts`
1. Chama `requireAuth()`
2. Busca org pelo slug — `notFound()` se não existir
3. Verifica membership — `notFound()` se não for membro

Retorna `{ userId, email, orgId, orgSlug, orgName, role }`.

---

## Scripts disponíveis

| Comando | O que faz |
|---|---|
| `pnpm dev` | Inicia o app em modo dev |
| `pnpm build` | Build de produção |
| `pnpm lint` | Roda ESLint |
| `pnpm typecheck` | Verifica tipos TypeScript |
| `pnpm format` | Formata código com Prettier |
| `pnpm db:up` | Sobe Postgres via Docker |
| `pnpm db:down` | Para o Postgres |
| `pnpm db:migrate` | Roda migrações do Prisma |
| `pnpm db:generate` | Regenera o Prisma Client |
| `pnpm db:seed` | Popula banco com dados de exemplo |
| `pnpm db:studio` | Abre Prisma Studio (`http://localhost:5555`) |

## Estrutura de arquivos

```
src/
├── app/
│   ├── (public)/login/            # Login (sem AppShell)
│   ├── (app)/                     # Auth check — sem AppShell
│   │   └── org/select/            # Seletor de organização
│   ├── (tenant)/org/[orgSlug]/    # Rotas de tenant (com AppShell)
│   │   ├── layout.tsx             # requireOrgContext + AppShell
│   │   ├── dashboard/page.tsx
│   │   └── settings/page.tsx
│   └── page.tsx                   # Redirect → /org/select ou /login
├── server/
│   ├── auth/require-auth.ts       # requireAuth()
│   ├── org/require-org-context.ts # requireOrgContext()
│   └── repo/
│       ├── organization-repo.ts   # findOrgBySlug, findOrgsByUserId
│       └── membership-repo.ts     # findMembership
├── components/layout/
│   ├── app-shell.tsx              # Shell (recebe orgSlug + orgName)
│   ├── sidebar-nav.tsx            # Links /org/[slug]/*
│   └── topbar.tsx                 # Theme toggle + avatar dropdown
└── middleware.ts                  # JWT check para /org/:path*
```
