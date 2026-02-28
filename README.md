# Dashboard SaaS Multi-tenant

Etapa 1 — Auth (email + senha).

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

| Variável             | Descrição                                  |
| -------------------- | ------------------------------------------ |
| `DATABASE_URL`       | Já preenchida para o Postgres local        |
| `NEXTAUTH_SECRET`    | String aleatória (use `openssl rand -base64 32`) |
| `NEXTAUTH_URL`       | `http://localhost:3000` em dev             |
| `SEED_USER_EMAIL`    | Email do usuário de teste                  |
| `SEED_USER_PASSWORD` | Senha do usuário de teste (mínimo 6 chars) |

### 3. Subir o banco de dados

```bash
pnpm db:up
```

Isso roda `docker compose up -d` e sobe um Postgres na porta 5432.

### 4. Rodar a migração do Prisma

```bash
pnpm db:migrate
```

Na primeira vez, ele vai pedir um nome para a migração. Digite `init` e pressione Enter.

### 5. Popular o banco com usuário de teste

```bash
pnpm db:seed
```

Cria (ou atualiza) o usuário definido em `SEED_USER_EMAIL` / `SEED_USER_PASSWORD`.

### 6. Subir o app

```bash
pnpm dev
```

Acesse **http://localhost:3000** — você será redirecionado para **/login**.

Entre com as credenciais do seed. Após o login, você cai em **/dashboard**.

## Fluxo de autenticação

```
/ → verifica sessão → /login  (não autenticado)
                    → /dashboard (autenticado)

/login → Credentials provider → JWT session → /dashboard
/dashboard → middleware (withAuth) + server-side session check
           → /login se não autenticado
```

## Checklist de validação

- [ ] `pnpm dev` sobe sem erros
- [ ] http://localhost:3000 redireciona para /login
- [ ] Login com credenciais corretas vai para /dashboard
- [ ] Login com credenciais erradas mostra mensagem de erro
- [ ] /dashboard sem sessão redireciona para /login
- [ ] Botão "Sair" desloga e vai para /login
- [ ] `pnpm lint` passa sem erros
- [ ] `pnpm typecheck` passa sem erros
- [ ] `pnpm format:check` passa sem erros

## Scripts disponíveis

| Comando              | O que faz                             |
| -------------------- | ------------------------------------- |
| `pnpm dev`           | Inicia o app em modo dev              |
| `pnpm build`         | Build de produção                     |
| `pnpm lint`          | Roda ESLint                           |
| `pnpm typecheck`     | Verifica tipos TypeScript             |
| `pnpm format`        | Formata código com Prettier           |
| `pnpm format:check`  | Verifica se código está formatado     |
| `pnpm db:up`         | Sobe Postgres via Docker              |
| `pnpm db:down`       | Para o Postgres                       |
| `pnpm db:migrate`    | Roda migrações do Prisma              |
| `pnpm db:generate`   | Gera o Prisma Client                  |
| `pnpm db:seed`       | Cria usuário de teste no banco        |
| `pnpm db:studio`     | Abre o Prisma Studio (GUI do banco)   |

## Estrutura de arquivos

```
├── docker-compose.yml
├── prisma/
│   ├── schema.prisma          # User, Account, Session, VerificationToken
│   ├── migrations/            # Migrações geradas pelo Prisma
│   └── seed.ts                # Cria usuário de teste
├── prisma.config.ts
├── src/
│   ├── app/
│   │   ├── api/auth/[...nextauth]/
│   │   │   └── route.ts       # Handler next-auth
│   │   ├── dashboard/
│   │   │   └── page.tsx       # Página protegida (server component)
│   │   ├── login/
│   │   │   └── page.tsx       # Formulário de login (client component)
│   │   ├── globals.css
│   │   ├── layout.tsx         # Root layout com SessionProvider
│   │   └── page.tsx           # Redireciona para /login ou /dashboard
│   ├── auth/
│   │   ├── index.ts           # getSession() helper
│   │   ├── next-auth.d.ts     # Tipos estendidos de sessão
│   │   └── options.ts         # NextAuthOptions (Credentials + callbacks)
│   ├── components/
│   │   ├── session-provider.tsx
│   │   ├── sign-out-button.tsx
│   │   └── ui/
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       └── label.tsx
│   ├── generated/
│   │   └── prisma/            # Prisma Client gerado (gitignored)
│   ├── lib/
│   │   ├── prisma.ts          # Singleton PrismaClient (Prisma 7 + PrismaPg)
│   │   └── utils.ts           # cn() helper
│   └── middleware.ts          # withAuth — protege /dashboard
├── .env.example
├── .prettierrc
├── eslint.config.mjs
├── next.config.ts
├── postcss.config.mjs
└── tsconfig.json
```
