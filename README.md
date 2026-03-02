# Dashboard SaaS Multi-tenant

Etapa 6 — Team: convites por link, gestão de membros, controle de roles e RBAC completo.

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

---

## Etapa 6 — Convites e Gestão de Membros

### Fluxo de convite

```
OWNER/ADMIN → /org/[slug]/team → InviteForm
  → POST /api/org/[slug]/invites
  → { inviteLink: "/invite/TOKEN" }  (validade 7 dias)

Convidado recebe o link → /invite/TOKEN
  → Não logado: "Faça login para aceitar" (redireciona com callbackUrl)
  → Logado, email errado: aviso de email incompatível
  → Logado, email certo: botão "Aceitar convite"
      → POST /api/invite/TOKEN/accept
      → 200 { orgSlug } → redirect /org/[slug]/dashboard
```

### RBAC — o que cada role pode fazer

| Permissão | OWNER | ADMIN | MEMBER | VIEWER |
|---|---|---|---|---|
| `member:invite` | ✅ | ✅ | ❌ | ❌ |
| `member:remove` | ✅ | ✅ | ❌ | ❌ |
| `member:role:update` | ✅ | ✅ | ❌ | ❌ |

**Guards adicionais:**
- **Último OWNER**: não é possível remover ou rebaixar o único OWNER da org (`LastOwnerError 422`)
- **ADMIN não promove para OWNER**: apenas OWNER pode promover para OWNER (`AdminCannotPromoteError 403`)

### Endpoints da API

| Método | Path | Permissão | Descrição |
|---|---|---|---|
| `POST` | `/api/org/[orgSlug]/invites` | `member:invite` | Criar convite (retorna link) |
| `DELETE` | `/api/org/[orgSlug]/invites/[inviteId]` | `member:invite` | Revogar convite PENDING |
| `PATCH` | `/api/org/[orgSlug]/members/[memberId]/role` | `member:role:update` | Alterar role do membro |
| `DELETE` | `/api/org/[orgSlug]/members/[memberId]` | `member:remove` | Remover membro |
| `POST` | `/api/invite/[token]/accept` | Sessão ativa | Aceitar convite |

### Como testar o fluxo de convite

```
1. Login como owner@example.com / senha123
2. Navegar para /org/org-default/team
3. No formulário "Convidar por email", digitar um email e clicar "Convidar"
4. Copiar o link exibido
5. Abrir em aba anônima → redireciona para login
6. Login com o email convidado (deve existir como usuário)
7. Após login → redirecionado para /invite/TOKEN
8. Clicar "Aceitar convite" → redirecionado para /org/org-default/dashboard
9. Voltar para /org/org-default/team → novo membro aparece na lista
```

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

**Testes unitários (sem banco):**

| Suite | Testes | O que cobre |
|---|---|---|
| `slugify.test.ts` | 14 | Todos os casos do utilitário: acentos, trim, colapso, truncate |
| `rbac.test.ts` | 15 | Permissões por role (OWNER/ADMIN/MEMBER/VIEWER) |
| `invite.test.ts` | 8 | Zod schemas: email normalização, roles válidos, campos ausentes |
| `last-owner-guard.int.test.ts` (guards) | 4 | Guard via DI: 2+ owners ok; 1 owner → LastOwnerError |

**Testes de integração (banco Postgres):**

| Suite | Testes | O que cobre |
|---|---|---|
| `create-organization.int.test.ts` | 5 | Transação org+membership, slug auto, SlugConflictError |
| `organization-repo.int.test.ts` | 5 | `findOrgsByUserId`: vazio, multi-org, isolamento por user |
| `require-org-context.int.test.ts` | 5 | Membro → ctx completo; sem membership → 404; org inexistente → 404 |
| `create-invite.int.test.ts` | 6 | Token único, expiresAt +7d, duplicado PENDING → 409, expirado ok |
| `revoke-invite.int.test.ts` | 4 | Revoga PENDING, proteção cross-tenant, não-PENDING → 404 |
| `accept-invite.int.test.ts` | 7 | Happy path, email case-insensitive, email errado, expirado, revogado, idempotente |
| `update-member-role.int.test.ts` | 7 | Role change, último owner, ADMIN→OWNER bloqueado, cross-tenant |
| `remove-member.int.test.ts` | 6 | Remove member, último OWNER bloqueado, cross-tenant, verifica estado no DB |
| `last-owner-guard.int.test.ts` | 2 | Guard com DB real: 2 owners ok; 1 owner → LastOwnerError |

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
│   ├── (public)/
│   │   ├── login/                         # Login + suporte a ?callbackUrl=
│   │   └── invite/[token]/page.tsx        # Aceitar convite (sem AppShell)
│   ├── (app)/                             # Auth check — sem AppShell
│   │   ├── dashboard/page.tsx             # Redirect legado → /org/select
│   │   └── org/
│   │       ├── select/page.tsx            # Seletor de organização
│   │       └── new/page.tsx               # Criação de organização
│   ├── (tenant)/org/[orgSlug]/            # Rotas de tenant (com AppShell)
│   │   ├── layout.tsx                     # requireOrgContext + AppShell + userOrgs
│   │   ├── dashboard/page.tsx
│   │   ├── settings/page.tsx
│   │   └── team/page.tsx                  # Membros + convites + formulário
│   ├── api/
│   │   ├── org/route.ts                   # POST /api/org
│   │   ├── org/[orgSlug]/invites/
│   │   │   ├── route.ts                   # POST (criar convite)
│   │   │   └── [inviteId]/route.ts        # DELETE (revogar)
│   │   ├── org/[orgSlug]/members/
│   │   │   └── [memberId]/
│   │   │       ├── route.ts               # DELETE (remover membro)
│   │   │       └── role/route.ts          # PATCH (alterar role)
│   │   └── invite/[token]/accept/route.ts # POST (aceitar convite)
│   └── page.tsx                           # Redirect → /org/select ou /login
├── schemas/
│   ├── organization.ts                    # createOrgFormSchema + createOrgApiSchema
│   └── invite.ts                          # createInviteSchema + updateMemberRoleSchema
├── security/
│   ├── permissions.ts                     # Permission union type
│   ├── rbac.ts                            # ROLE_MATRIX + can()
│   └── assert-permission.ts               # assertPermission() + PermissionDeniedError
├── server/
│   ├── auth/require-auth.ts               # requireAuth()
│   ├── errors/team-errors.ts              # 7 classes: InviteDuplicate, LastOwner, etc.
│   ├── org/require-org-context.ts         # requireOrgContext()
│   ├── repo/
│   │   ├── organization-repo.ts           # findOrgBySlug, findOrgsByUserId, createOrg
│   │   ├── membership-repo.ts             # + listMemberships, countOwners, etc.
│   │   └── invite-repo.ts                 # 7 funções: create, find, list, revoke…
│   └── use-cases/
│       ├── _guards/last-owner-guard.ts    # Lança LastOwnerError se único OWNER
│       ├── create-organization.ts         # createOrganization + SlugConflictError
│       ├── create-invite.ts               # Token UUID, expiresAt +7d, guard duplicado
│       ├── revoke-invite.ts               # PENDING → REVOKED
│       ├── accept-invite.ts               # Verifica email, idempotente, $transaction
│       ├── update-member-role.ts          # Guards: último OWNER, ADMIN→OWNER
│       └── remove-member.ts              # Guard último OWNER, cross-tenant
├── shared/
│   └── utils/slugify.ts                   # string → url-safe slug
├── components/
│   ├── layout/
│   │   ├── app-shell.tsx                  # Shell (recebe orgSlug + orgName + userOrgs)
│   │   ├── sidebar-nav.tsx                # OrgSwitcher + links (Dashboard, Equipe, Settings)
│   │   ├── org-switcher.tsx               # Dropdown de troca de org
│   │   └── topbar.tsx                     # Theme toggle + avatar dropdown
│   ├── team/
│   │   ├── invite-form.tsx                # RHF form + link copiável
│   │   ├── member-row-actions.tsx         # Dropdown: alterar role + remover
│   │   └── invite-row-actions.tsx         # Botão revogar convite
│   ├── invite/
│   │   └── accept-invite-button.tsx       # POST accept + redirect
│   └── ui/
│       ├── badge.tsx                      # Role badges (OWNER, ADMIN, MEMBER, VIEWER)
│       └── ...                            # shadcn/ui components
└── middleware.ts                          # JWT check para /org/:path*
```
