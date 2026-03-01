# Dashboard SaaS Multi-tenant

Etapa 5 — Organization CRUD mínimo: criação de org, OrgSwitcher e fluxo de navegação completo.

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
  → 0 orgs: redirect automático para /org/new
  → 1 org:  redirect automático para /org/[slug]/dashboard
  → 2+ orgs: lista para escolher

/org/new
  → Formulário de criação de org
  → Slug gerado automaticamente a partir do nome (se não informado)
  → 201: redirect para /org/[slug]/dashboard
  → 409: erro de slug duplicado mostrado inline

/org/[orgSlug]/dashboard
  middleware (JWT check) → requireOrgContext(orgSlug) → renderiza
  ↓ sem sessão          → /login
  ↓ org não existe      → 404
  ↓ não é membro        → 404
```

## Como criar uma organização

1. Após o login, se você não tiver nenhuma org, será redirecionado para `/org/new`
2. Preencha o **Nome** (obrigatório, mín. 2 caracteres)
3. O **Slug** é opcional — se vazio, é gerado automaticamente a partir do nome
   - Exemplo: "Minha Empresa" → `minha-empresa`
   - Usado na URL: `/org/minha-empresa/dashboard`
4. Clique em **Criar organização**
5. Você é redirecionado para o dashboard da nova org como **OWNER**

## OrgSwitcher (troca de organização)

O sidebar contém um dropdown que mostra todas as suas organizações.
Clique no nome da org atual para abrir o menu e navegar entre orgs ou criar uma nova.

## Proteção de acesso (duas camadas)

| Camada | O que faz | Onde |
|---|---|---|
| **Middleware** | Verifica JWT (sem DB) | `src/middleware.ts` |
| **requireOrgContext** | Resolve org + checa membership | Server Components |

> 404 em vez de 403: não expõe a existência de orgs que o usuário não acessa.

## Como testar

### Fluxo: usuário com 2+ orgs
```
1. pnpm db:seed  →  cria usuários + orgs "org-default" e "acme"
2. pnpm dev
3. Acessar http://localhost:3000
4. Login: owner@example.com / senha123
5. /org/select mostra 2 orgs para escolher
6. Clicar em "Acme Corp" → /org/acme/dashboard
7. Sidebar mostra OrgSwitcher no topo
8. Clicar no OrgSwitcher → dropdown com as duas orgs
```

### Fluxo: usuário com 1 org
```
1. Login: viewer@example.com / senha123
2. /org/select → redirect automático para /org/acme/dashboard
```

### Fluxo: usuário sem org
```
1. Criar novo usuário (sem seed)
2. Login → /org/select → redirect automático para /org/new
3. Criar org → /org/[slug]/dashboard
```

### Fluxo: slug duplicado
```
1. Acessar /org/new
2. Preencher slug "acme" (já existe no seed)
3. Submit → erro inline "Esse slug já está em uso."
```

### Fluxo bloqueado
```
# Org que não existe → 404
http://localhost:3000/org/outra-empresa/dashboard

# Sem sessão → /login
(abrir em aba anônima)
http://localhost:3000/org/acme/dashboard
```

## Credenciais de teste (seed)

| Usuário | Email | Senha | Orgs |
|---|---|---|---|
| Owner | `owner@example.com` | `senha123` | org-default, acme |
| Member | `member@example.com` | `senha123` | acme |
| Viewer | `viewer@example.com` | `senha123` | acme |

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

### `createOrganization({ name, slug, userId })` — `src/server/use-cases/create-organization.ts`
Use-case que cria org + membership OWNER em `$transaction`.
Lança `SlugConflictError` (409) se o slug já estiver em uso.

---

## Testes automatizados

### Estrutura

| Tipo | Arquivo | Ferramenta |
|---|---|---|
| Unitário | `src/**/__tests__/*.test.ts` | Jest CJS + ts-jest |
| Integração (DB) | `src/**/__tests__/*.int.test.ts` | Jest ESM (`--experimental-vm-modules`) |

### Banco de dados de teste

Os testes de integração usam um banco Postgres separado (`saas_multitenant_test`).
O container Docker já expõe a porta 5432 — basta criar o banco e rodar as migrations.

**Setup inicial (uma única vez):**

```powershell
# 1. Certificar que o container está rodando
pnpm db:up

# 2. Criar o banco de teste e aplicar as migrations
pnpm db:migrate:test
```

O arquivo `.env.test` já contém a URL correta:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/saas_multitenant_test?schema=public"
```

### Rodando os testes

```powershell
# Unitários (slugify, rbac) — sem banco
pnpm test:unit

# Integração (createOrganization, requireOrgContext, organization-repo) — precisa do banco
pnpm test:int

# Apenas unitários com watch
pnpm test:unit --watch
```

### Cobertura dos testes

| Suite | Testes | O que cobre |
|---|---|---|
| `slugify.test.ts` | 14 | Todos os casos do utilitário: acentos, trim, colapso, truncate |
| `rbac.test.ts` | 15 | Permissões por role (OWNER/MEMBER/VIEWER) |
| `create-organization.int.test.ts` | 5 | Transação org+membership, slug auto, SlugConflictError |
| `organization-repo.int.test.ts` | 5 | `findOrgsByUserId`: vazio, multi-org, isolamento por user |
| `require-org-context.int.test.ts` | 5 | Membro → ctx completo; sem membership → 404; org inexistente → 404 |

### Detalhes técnicos

- **Dois configs Jest**: CJS para testes unitários (sem Prisma); ESM para integração (Prisma 7 requer WASM `.mjs`)
- **`--experimental-vm-modules`**: injetado via `tests/scripts/run-int-tests.js`; necessário para Prisma 7
- **`maxWorkers: 1`**: testes de integração rodam sequencialmente — banco compartilhado, sem race condition
- **`jest.unstable_mockModule()` + dynamic import**: padrão correto para mocks em ESM (hoist estático não funciona)
- **Banco limpo por teste**: `resetDb()` deleta todas as linhas em ordem segura (FK) antes de cada teste

---

## Scripts disponíveis

| Comando | O que faz |
|---|---|
| `pnpm dev` | Inicia o app em modo dev |
| `pnpm build` | Build de produção |
| `pnpm lint` | Roda ESLint |
| `pnpm typecheck` | Verifica tipos TypeScript |
| `pnpm format` | Formata código com Prettier |
| `pnpm test` / `pnpm test:unit` | Roda testes unitários (Jest CJS) |
| `pnpm test:int` | Roda testes de integração (Jest ESM + banco) |
| `pnpm db:up` | Sobe Postgres via Docker |
| `pnpm db:down` | Para o Postgres |
| `pnpm db:migrate` | Roda migrações do Prisma (banco principal) |
| `pnpm db:migrate:test` | Cria banco de teste e aplica migrations |
| `pnpm db:generate` | Regenera o Prisma Client |
| `pnpm db:seed` | Popula banco com dados de exemplo |
| `pnpm db:studio` | Abre Prisma Studio (`http://localhost:5555`) |

## Estrutura de arquivos

```
src/
├── app/
│   ├── (public)/login/            # Login (sem AppShell)
│   ├── (app)/                     # Auth check — sem AppShell
│   │   ├── dashboard/page.tsx     # Redirect legado → /org/select
│   │   └── org/
│   │       ├── select/page.tsx    # Seletor de organização
│   │       └── new/page.tsx       # Criação de organização
│   ├── (tenant)/org/[orgSlug]/    # Rotas de tenant (com AppShell)
│   │   ├── layout.tsx             # requireOrgContext + AppShell + userOrgs
│   │   ├── dashboard/page.tsx
│   │   └── settings/page.tsx
│   ├── api/org/route.ts           # POST /api/org
│   └── page.tsx                   # Redirect → /org/select ou /login
├── schemas/
│   └── organization.ts            # createOrgFormSchema + createOrgApiSchema
├── security/
│   ├── permissions.ts             # Permission union type
│   ├── rbac.ts                    # ROLE_MATRIX + can()
│   └── assert-permission.ts       # assertPermission() + PermissionDeniedError
├── server/
│   ├── auth/require-auth.ts       # requireAuth()
│   ├── org/require-org-context.ts # requireOrgContext()
│   ├── repo/
│   │   ├── organization-repo.ts   # findOrgBySlug, findOrgsByUserId, createOrg
│   │   └── membership-repo.ts     # findMembership, createMembership
│   └── use-cases/
│       └── create-organization.ts # createOrganization + SlugConflictError
├── shared/
│   └── utils/slugify.ts           # string → url-safe slug
├── components/layout/
│   ├── app-shell.tsx              # Shell (recebe orgSlug + orgName + userOrgs)
│   ├── sidebar-nav.tsx            # OrgSwitcher + links /org/[slug]/*
│   ├── org-switcher.tsx           # Dropdown de troca de org
│   └── topbar.tsx                 # Theme toggle + avatar dropdown
└── middleware.ts                  # JWT check para /org/:path*
```
