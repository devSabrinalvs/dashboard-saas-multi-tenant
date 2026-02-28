# Dashboard SaaS Multi-tenant

Etapa 2 — Modelagem multi-tenant no banco de dados.

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

### 1. Instalar dependências

```bash
pnpm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` e preencha:

| Variável             | Descrição                                         |
| -------------------- | ------------------------------------------------- |
| `DATABASE_URL`       | Já preenchida para o Postgres local               |
| `NEXTAUTH_SECRET`    | String aleatória (`openssl rand -base64 32`)      |
| `NEXTAUTH_URL`       | `http://localhost:3000` em dev                    |
| `SEED_USER_EMAIL`    | Email do usuário de teste                         |
| `SEED_USER_PASSWORD` | Senha do usuário de teste (mínimo 6 chars)        |

### 3. Subir o banco de dados

```bash
pnpm db:up
```

Sobe um Postgres 16 na porta 5432 via Docker Compose.

### 4. Rodar as migrações

```bash
pnpm db:migrate
```

Aplica todas as migrações (Auth.js + multi-tenant). Se pedir nome, use `init`.

### 5. Popular o banco com dados de exemplo

```bash
pnpm db:seed
```

Cria (idempotente):
- Usuário de teste (`SEED_USER_EMAIL` / `SEED_USER_PASSWORD`)
- Organização `org-default`
- Membership OWNER (usuário ↔ organização)
- 1 Projeto de Exemplo
- 2 Tasks (uma DONE, uma IN_PROGRESS)

### 6. Inspecionar o banco (opcional)

```bash
pnpm db:studio
```

Abre o **Prisma Studio** em `http://localhost:5555` — GUI para navegar e editar os dados.

Tabelas para verificar: `User`, `Organization`, `Membership`, `Project`, `Task`.

### 7. Subir o app

```bash
pnpm dev
```

Acesse **http://localhost:3000** → `/login` → dashboard com sidebar.

---

## Schema multi-tenant

### Modelos

| Model          | Descrição                                              |
| -------------- | ------------------------------------------------------ |
| `User`         | Usuário (Auth.js)                                      |
| `Account`      | OAuth accounts (Auth.js)                               |
| `Session`      | Sessions DB (Auth.js, não usada com JWT)               |
| `Organization` | Tenant — `slug` único                                  |
| `Membership`   | Vínculo usuário ↔ organização com `Role`               |
| `Invite`       | Convite por email com token + expiração                |
| `AuditLog`     | Registro imutável de ações (actorUserId pode ser null) |
| `Project`      | Projeto dentro de uma organização                      |
| `Task`         | Tarefa dentro de um projeto (com `orgId` denormalizado)|

### Enums

| Enum           | Valores                                  |
| -------------- | ---------------------------------------- |
| `Role`         | `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`     |
| `InviteStatus` | `PENDING`, `ACCEPTED`, `REVOKED`, `EXPIRED` |
| `TaskStatus`   | `TODO`, `IN_PROGRESS`, `DONE`, `CANCELED` |

### Políticas de deleção

| Relação                      | onDelete  | Motivo                                         |
| ---------------------------- | --------- | ---------------------------------------------- |
| Account → User               | Cascade   | Auth.js padrão                                 |
| Session → User               | Cascade   | Auth.js padrão                                 |
| Membership → User            | Restrict  | Não deletar usuário com memberships ativas     |
| Membership → Organization    | Restrict  | Não deletar org com memberships ativas         |
| Invite → Organization        | Restrict  | Não deletar org com convites pendentes         |
| AuditLog → Organization      | Restrict  | Log imutável — org não pode ser deletada       |
| AuditLog → User (actor)      | SetNull   | Log preservado, actor vira null                |
| Project → Organization       | Restrict  | Não deletar org com projetos                   |
| Task → Organization          | Restrict  | Não deletar org com tasks                      |
| Task → Project               | Restrict  | Não deletar projeto com tasks                  |

---

## Checklist de validação (Prisma Studio)

```bash
pnpm db:studio   # abre http://localhost:5555
```

- [ ] Tabela `User` tem o usuário seed
- [ ] Tabela `Organization` tem `org-default`
- [ ] Tabela `Membership` tem role `OWNER` ligando usuário ↔ org
- [ ] Tabela `Project` tem "Projeto de Exemplo"
- [ ] Tabela `Task` tem 2 tasks (DONE + IN_PROGRESS) com `orgId` e `projectId` corretos
- [ ] `pnpm typecheck` passa sem erros
- [ ] `pnpm lint` passa sem erros

## Scripts disponíveis

| Comando             | O que faz                           |
| ------------------- | ----------------------------------- |
| `pnpm dev`          | Inicia o app em modo dev            |
| `pnpm build`        | Build de produção                   |
| `pnpm lint`         | Roda ESLint                         |
| `pnpm typecheck`    | Verifica tipos TypeScript           |
| `pnpm format`       | Formata código com Prettier         |
| `pnpm format:check` | Verifica se código está formatado   |
| `pnpm db:up`        | Sobe Postgres via Docker            |
| `pnpm db:down`      | Para o Postgres                     |
| `pnpm db:migrate`   | Roda migrações do Prisma            |
| `pnpm db:generate`  | Regenera o Prisma Client            |
| `pnpm db:seed`      | Popula banco com dados de exemplo   |
| `pnpm db:studio`    | Abre Prisma Studio (GUI do banco)   |

## Estrutura de arquivos relevante

```
├── prisma/
│   ├── schema.prisma          # Todos os models (Auth.js + multi-tenant)
│   ├── migrations/            # Migrações geradas (versionadas no git)
│   │   ├── 20260228212339_init/
│   │   └── 20260228213131_multi_tenant/
│   └── seed.ts                # Seed idempotente (upsert)
├── prisma.config.ts           # Config Prisma 7 (datasource + seed)
├── src/
│   ├── app/
│   │   ├── (app)/             # Rotas protegidas (com AppShell)
│   │   │   ├── layout.tsx     # Session check + AppShell
│   │   │   ├── dashboard/
│   │   │   └── settings/
│   │   ├── (public)/          # Rotas públicas (sem AppShell)
│   │   │   └── login/
│   │   └── layout.tsx         # Root layout (ThemeProvider + SessionProvider)
│   ├── auth/                  # next-auth config + helpers
│   ├── components/
│   │   ├── layout/            # AppShell, SidebarNav, Topbar
│   │   ├── theme/             # ThemeProvider, ThemeToggle
│   │   └── ui/                # shadcn/ui components
│   ├── generated/prisma/      # Prisma Client gerado (gitignored)
│   ├── lib/
│   │   └── prisma.ts          # Singleton PrismaClient (Prisma 7 + PrismaPg)
│   └── middleware.ts          # withAuth — protege /dashboard e /settings
```
