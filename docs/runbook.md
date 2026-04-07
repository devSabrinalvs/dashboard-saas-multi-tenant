# Runbook de Produção — Dashboard SaaS Multi-tenant

> **Stack**: Next.js 15+, Prisma 7 + PrismaPg, PostgreSQL, Auth.js v4, Resend, Vercel
> **Última atualização**: Etapa I

---

## Índice

1. [Variáveis de ambiente](#1-variáveis-de-ambiente)
2. [Deploy do zero (Vercel + Neon)](#2-deploy-do-zero-vercel--neon)
3. [Migrations em produção](#3-migrations-em-produção)
4. [Smoke tests pós-deploy](#4-smoke-tests-pós-deploy)
5. [Como debugar incidentes](#5-como-debugar-incidentes)
6. [Rollback](#6-rollback)
7. [Observabilidade](#7-observabilidade)
8. [Checklist de segurança pré-launch](#8-checklist-de-segurança-pré-launch)

---

## 1. Variáveis de ambiente

Configure no painel do Vercel (`Settings → Environment Variables`) ou no seu provedor.
**Nunca** commite valores reais em `.env.example` ou qualquer arquivo do repositório.

### Obrigatórias em produção

| Variável | Descrição | Como gerar |
|---|---|---|
| `DATABASE_URL` | Connection string do PostgreSQL (Neon, Supabase, Railway) | Fornecida pelo provedor |
| `NEXTAUTH_SECRET` | Segredo JWT do NextAuth | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | URL pública da app (`https://seu-app.vercel.app`) | Definida manualmente |
| `AUTH_TRUST_HOST` | `true` — necessário atrás de proxy reverso (Vercel) | Fixo: `true` |
| `PASSWORD_PEPPER` | Salt global para bcrypt | `openssl rand -base64 32` |
| `TWO_FACTOR_ENCRYPTION_KEY` | Chave AES-256-GCM para segredos TOTP | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `APP_BASE_URL` | URL base para links de email | Igual a `NEXTAUTH_URL` |
| `RESEND_API_KEY` | API key do Resend para envio de emails | [resend.com](https://resend.com) → API Keys |
| `RESEND_FROM` | Remetente verificado (`Nome <email@dominio.com>`) | Domínio verificado no Resend |

### Obrigatórias para anti-bot

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Chave pública Turnstile (visível no browser) |
| `TURNSTILE_SECRET_KEY` | Chave secreta Turnstile (apenas servidor) |

> **Sem Turnstile**: O widget não é renderizado e a validação server é pulada (graceful degradation).
> Recomendado ativar em produção para prevenir bots em signup/login.

### Opcionais

| Variável | Padrão | Descrição |
|---|---|---|
| `SENTRY_DSN` | — | Ativa Sentry (requer `pnpm add @sentry/nextjs`) |
| `LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` |
| `NEXT_PUBLIC_APP_VERSION` | `0.1.0` | Exibida em `/api/health` |

### ⚠️ Alertas de segurança

- **`PASSWORD_PEPPER`**: Alterar invalida **todas** as senhas existentes. Usuários precisariam de reset.
- **`TWO_FACTOR_ENCRYPTION_KEY`**: Alterar invalida todos os 2FA configurados. Usuários perderiam acesso se não tiverem recovery codes.
- **`NEXTAUTH_SECRET`**: Alterar invalida todas as sessões ativas (logout forçado de todos os usuários).

---

## 2. Deploy do zero (Vercel + Neon)

### Passo 1: Criar o banco de dados (Neon)

```bash
# 1. Acesse https://neon.tech e crie um projeto
# 2. Anote a connection string (formato):
#    postgresql://user:password@ep-xyz.us-east-1.aws.neon.tech/dbname?sslmode=require
#
# Use a connection string com POOLER (porta 5432) para a aplicação:
#    postgresql://user:password@ep-xyz-pooler.us-east-1.aws.neon.tech/dbname?sslmode=require
#
# Alternativas igualmente válidas:
#   - Supabase: https://supabase.com (gratuito com limite)
#   - Railway:  https://railway.app (sem camada gratuita permanente)
```

### Passo 2: Configurar variáveis de ambiente no Vercel

```bash
# Via Vercel CLI (instale com: pnpm add -g vercel)
vercel env add DATABASE_URL production
vercel env add NEXTAUTH_SECRET production
vercel env add NEXTAUTH_URL production
vercel env add AUTH_TRUST_HOST production
vercel env add PASSWORD_PEPPER production
vercel env add TWO_FACTOR_ENCRYPTION_KEY production
vercel env add APP_BASE_URL production
vercel env add RESEND_API_KEY production
vercel env add RESEND_FROM production
vercel env add NEXT_PUBLIC_TURNSTILE_SITE_KEY production
vercel env add TURNSTILE_SECRET_KEY production

# Ou configure pelo painel: https://vercel.com → Project → Settings → Environment Variables
```

### Passo 3: Rodar migrations (automático via vercel-build)

O script `vercel-build` no `package.json` já inclui as migrations:

```json
"vercel-build": "prisma generate && prisma migrate deploy && next build"
```

O Vercel detecta automaticamente este script e o usa como build command.
As migrations rodam **antes** do `next build` a cada deploy. ✓

**Alternativa manual** (se precisar rodar migrations fora do deploy):
```bash
DATABASE_URL="postgresql://..." pnpm prisma:migrate:deploy
```

### Passo 4: Deploy

```bash
# Conectar o repositório GitHub ao Vercel:
# 1. https://vercel.com → Add New Project → Import Git Repository
# 2. Selecione o repositório
# 3. Framework Preset: Next.js (detectado automaticamente)
# 4. Build Command: pnpm run vercel-build (ou deixe o padrão — Vercel usa vercel-build automaticamente)
# 5. Output Directory: .next (padrão)
# 6. Clique em Deploy

# O Vercel fará deploy automático a cada push na branch main.
```

### Passo 5: Smoke tests pós-deploy

```bash
node scripts/smoke-test.mjs https://seu-app.vercel.app
```

Verifique manualmente:
- [ ] `/api/health` retorna `{ ok: true, db: "ok" }`
- [ ] `/login` carrega sem erros
- [ ] Signup cria conta e envia email de verificação
- [ ] Login funciona após verificar email
- [ ] Criar organização, projeto e tarefa
- [ ] Verificar `/org/:slug/audit` registra as ações

---

## 3. Migrations em produção

### Regra de ouro

```
DESENVOLVIMENTO: pnpm db:migrate     (prisma migrate dev)
PRODUÇÃO:        pnpm prisma:migrate:deploy  (prisma migrate deploy)
```

**Nunca** rode `prisma migrate dev` em produção — ele pode criar migrations não versionadas.

### Fluxo de nova migration

```bash
# 1. Desenvolva localmente com Docker
pnpm db:up
pnpm db:migrate  # cria e aplica a migration em dev

# 2. Commite a migration
git add prisma/migrations/
git commit -m "feat: add X column to Y table"

# 3. No próximo deploy, prisma migrate deploy aplica automaticamente
#    (vercel-build faz isso)

# 4. Para rodar manualmente em produção (emergência):
DATABASE_URL="$PRODUCTION_DB_URL" pnpm prisma:migrate:deploy
```

### Verificar status das migrations

```bash
DATABASE_URL="$PRODUCTION_DB_URL" pnpm exec prisma migrate status
```

---

## 4. Smoke tests pós-deploy

### Script automático

```bash
node scripts/smoke-test.mjs https://seu-app.vercel.app
```

Testa:
- `/api/health` — DB conectado
- `/login` — página carrega
- `/org/:slug/dashboard` — redirect para `/login` (proteção de rota)
- `/api/auth/session` — NextAuth online
- CSP header — presente e correto
- HSTS header — presente em HTTPS

### Checklist manual

Após cada deploy em produção:

```
[ ] /api/health retorna { ok: true, db: "ok" }
[ ] Login com credentials funciona
[ ] Login com Google funciona (se OAuth configurado)
[ ] Email de verificação chega na caixa de entrada
[ ] Link de reset de senha funciona
[ ] 2FA setup funciona (QR code + verificação)
[ ] Criar organização → /org/:slug/dashboard abre
[ ] Criar projeto → aparece na lista
[ ] Criar tarefa → aparece no projeto
[ ] Audit log registra ações (/org/:slug/audit)
[ ] Deletar conta redireciona para /login?deleted=1
```

---

## 5. Como debugar incidentes

### Login falhando

**Sintomas**: Usuário relata erro ao logar, UI mostra "Credenciais inválidas".

```bash
# 1. Verificar saúde do banco
curl https://seu-app.vercel.app/api/health

# 2. Verificar logs do Vercel
vercel logs --prod

# 3. Causas comuns:
#    a) PASSWORD_PEPPER incorreto ou alterado → usuário deve fazer reset de senha
#    b) Conta bloqueada → verificar DB: SELECT * FROM "User" WHERE email = '...'
#    c) Email não verificado → verificar emailVerified IS NULL
#    d) Rate limit atingido → aguardar 1 minuto e tentar novamente
#    e) DB indisponível → /api/health mostrará db: "error"

# 4. Verificar status da conta no DB
DATABASE_URL="$PROD_DB" pnpm exec prisma studio
# → Tabela User → filtrar por email
```

**Campos a verificar na tabela `User`:**
- `emailVerified`: null = não verificado, data = ok
- `deletedAt`: não-null = conta deletada
- `lockedUntil`: não-null e futuro = conta bloqueada
- `failedLoginCount`: >0 = tentativas falhas recentes

### Emails não chegando (Resend)

**Sintomas**: Links de verificação/reset não chegam.

```bash
# 1. Verificar se RESEND_API_KEY está configurada
vercel env ls --environment=production | grep RESEND

# 2. Checar logs do Resend: https://resend.com → Emails → filtrar por domínio

# 3. Em dev, links aparecem no console — confirmar que ConsoleMailer não está ativo em prod
#    (ConsoleMailer só é usado quando RESEND_API_KEY está ausente)

# 4. Verificar domínio verificado no Resend:
#    https://resend.com → Domains → Confirmar status "Verified"

# 5. Verificar RESEND_FROM usa domínio verificado:
#    "Projorg <no-reply@seudominio.com>" → seudominio.com deve estar verificado no Resend

# 6. Testar envio manual:
DATABASE_URL="$PROD_DB" RESEND_API_KEY="$RESEND_KEY" node -e "
  const { Resend } = require('resend');
  const r = new Resend(process.env.RESEND_API_KEY);
  r.emails.send({ from: 'test@seudominio.com', to: 'seu@email.com', subject: 'Teste', text: 'ok' })
    .then(console.log).catch(console.error);
"
```

### DB down / 503

**Sintomas**: `/api/health` retorna `{ ok: false, db: "error" }`, 503.

```bash
# 1. Verificar status do provedor
#    Neon:     https://neonstatus.com
#    Supabase: https://status.supabase.com
#    Railway:  https://status.railway.app

# 2. Verificar CONNECTION LIMIT (Neon free tier: 20 conexões)
#    Se atingido, considerar connection pooler (Neon Pooler já incluído na string)

# 3. Forçar restart das funções serverless do Vercel:
vercel deploy --prod --force

# 4. Verificar se DATABASE_URL está correta:
vercel env pull  # copia as envs pro .env.local
cat .env.local | grep DATABASE_URL
# Testar a conexão:
node -e "require('pg').Pool({ connectionString: process.env.DATABASE_URL }).query('SELECT 1').then(r => console.log('DB ok', r.rows)).catch(console.error)"

# 5. Se o banco foi suspenso (ex: Neon suspende após inatividade):
#    Acesse o dashboard do Neon e clique em "Resume"
```

### 429 excessivo (rate limit)

**Sintomas**: Usuários legítimos recebem "Muitas requisições".

```bash
# 1. Identificar qual endpoint está sendo limitado pelos logs
vercel logs --prod | grep "429"

# 2. Rate limits atuais (src/security/rate-limit/constants.ts):
#    LOGIN_IP:      20/min por IP
#    LOGIN_EMAIL:   10/min por email
#    SIGNUP_IP:     10/h por IP
#    FORGOT_IP:     10/h por IP
#    DELETE_ACCOUNT: 3/dia por userId

# 3. Se for ataque (brute force):
#    - O rate limit de memória em dev vira Prisma store em produção (automático)
#    - Considerar bloquear IPs no WAF do Vercel (Vercel → Project → Firewall)

# 4. Se for falso positivo (usuário legítimo bloqueado):
#    - O IP de um NAT/proxy corporativo pode causar falsos positivos
#    - Considerar aumentar LOGIN_IP se necessário
#    - Verificar tabela RateLimitBucket no banco:
#      SELECT * FROM "RateLimitBucket" WHERE key LIKE 'rl:login:ip:%' ORDER BY "windowStart" DESC LIMIT 20;

# 5. Limpar rate limits no banco (use com cuidado):
#    DATABASE_URL="$PROD_DB" pnpm exec prisma studio
#    → Tabela RateLimitBucket → deletar registros do IP em questão
```

### 2FA inacessível

**Sintomas**: Usuário perdeu acesso ao autenticador e não tem recovery codes.

```bash
# Suporte manual — só com verificação de identidade:
# 1. Verificar identidade do usuário por outros meios (email alternativo, etc.)
# 2. No banco, desabilitar 2FA temporariamente:
DATABASE_URL="$PROD_DB" pnpm exec prisma studio
# → Tabela User → encontrar usuário → setar twoFactorEnabled = false
# → Tabela TwoFactorVerification → deletar registros do userId

# 3. O usuário pode reconfigurar 2FA após login
```

---

## 6. Rollback

### Rollback de código (Vercel)

```bash
# Ver deployments anteriores
vercel ls

# Promover deployment anterior para produção
vercel promote <deployment-url>
# Exemplo: vercel promote https://dashboard-abc123.vercel.app

# Ou via painel: Vercel → Project → Deployments → selecionar → Promote to Production
```

### ⚠️ Rollback de migrations

**Migrations Prisma não têm rollback automático.**

```
IMPORTANTE: prisma migrate deploy é irreversível por design.
Não existe "prisma migrate rollback".
```

**Para desfazer uma migration problemática:**

```bash
# Opção 1 (preferida): Criar uma nova migration que desfaz as mudanças
pnpm db:migrate  # após reverter o schema.prisma para o estado anterior

# Opção 2 (emergência): Executar SQL manual
DATABASE_URL="$PROD_DB" pnpm exec prisma db execute --file ./rollback.sql

# NUNCA deletar registros da tabela _prisma_migrations — isso corrompe o histórico
```

**Estratégia recomendada:**
1. Sempre testar migrations em staging antes de produção
2. Fazer backup do banco antes de migrations destrutivas
3. Usar migrations não-destrutivas (adicionar coluna nullable, depois preencher, depois adicionar constraint)

### Backup antes de migrations destrutivas

```bash
# Neon: criar snapshot via dashboard antes do deploy
# Railway: usar railway backup ou pg_dump:
pg_dump "$PROD_DB_URL" > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar (se necessário):
psql "$PROD_DB_URL" < backup_20240321_120000.sql
```

---

## 7. Observabilidade

### Logs estruturados

O logger (`src/server/lib/logger.ts`) emite JSON por linha:

```json
{"level":"info","ts":"2024-03-21T12:00:00.000Z","msg":"User deleted account","userId":"usr_123","orgId":"org_456"}
{"level":"error","ts":"2024-03-21T12:00:01.000Z","msg":"DB check failed","error":"Connection timeout","route":"/api/health"}
```

**Ingestão de logs recomendada:**
- **Vercel Log Drains**: Vercel → Project → Settings → Log Drains → Axiom/Datadog/Logtail
- **Alternativa gratuita**: Logtail (Better Stack) tem camada gratuita

**Nunca** ative `LOG_LEVEL=debug` em produção com alto tráfego — pode expor dados sensíveis nos logs de queries.

### Health check

```bash
curl https://seu-app.vercel.app/api/health
# { "ok": true, "db": "ok", "version": "1.0.0", "ts": "2024-..." }

# Configurar uptime monitoring (gratuito):
#   - UptimeRobot: https://uptimerobot.com
#   - BetterUptime: https://betterstack.com/better-uptime
#   Monitor: HTTP, URL: /api/health, keyword: "ok":true, intervalo: 1 min
```

### Sentry (opcional)

```bash
# 1. Instalar
pnpm add @sentry/nextjs

# 2. Definir variável
vercel env add SENTRY_DSN production
# Valor: https://xxx@o123.ingest.sentry.io/456789

# 3. Sentry é inicializado automaticamente via src/instrumentation.ts
#    quando SENTRY_DSN está definido
```

---

## 8. Checklist de segurança pré-launch

### Variáveis de ambiente
- [ ] `NEXTAUTH_SECRET` gerado com `openssl rand -base64 32` (mínimo 32 chars)
- [ ] `PASSWORD_PEPPER` gerado com `openssl rand -base64 32`
- [ ] `TWO_FACTOR_ENCRYPTION_KEY` gerado com 32 bytes aleatórios em base64
- [ ] `DATABASE_URL` aponta para banco de produção (não dev/test)
- [ ] `NEXTAUTH_URL` é a URL pública correta (https://)
- [ ] `APP_BASE_URL` é a URL pública correta (https://)
- [ ] `AUTH_TRUST_HOST=true` configurado
- [ ] `RESEND_API_KEY` configurada e domínio verificado
- [ ] `TURNSTILE_SECRET_KEY` configurada (recomendado)

### Banco de dados
- [ ] `pnpm prisma:migrate:deploy` rodou com sucesso em produção
- [ ] Backup configurado no provedor (Neon, Supabase, Railway)
- [ ] Connection string usa pooler (não acesso direto em produção)

### Segurança da aplicação
- [ ] `/api/health` retorna `db: "ok"`
- [ ] CSP headers presentes e corretos (`frame-ancestors 'none'`, etc.)
- [ ] HSTS ativo em HTTPS
- [ ] Rate limit store usa Prisma (automático em `NODE_ENV=production`)
- [ ] Cookies com `Secure`, `HttpOnly`, `SameSite` (configurado pelo NextAuth)
- [ ] CSRF protection ativa nos endpoints sensíveis (Etapa H)

### Smoke tests
- [ ] `node scripts/smoke-test.mjs https://seu-app.vercel.app` passou
- [ ] Login e signup funcionam manualmente
- [ ] Email de verificação chega na inbox
- [ ] 2FA funciona (setup → QR code → verificação)

---

## Referências rápidas

```bash
# Deploy manual via Vercel CLI
vercel --prod

# Migrations em produção
DATABASE_URL="$PROD_DB" pnpm prisma:migrate:deploy

# Status das migrations
DATABASE_URL="$PROD_DB" pnpm exec prisma migrate status

# Abrir Prisma Studio apontando pro banco de produção (⚠️ cuidado)
DATABASE_URL="$PROD_DB" pnpm db:studio

# Logs do Vercel em tempo real
vercel logs --prod --follow

# Smoke test
node scripts/smoke-test.mjs https://seu-app.vercel.app

# Verificar variáveis de ambiente no Vercel
vercel env ls --environment=production

# Gerar chaves secretas
openssl rand -base64 32   # NEXTAUTH_SECRET, PASSWORD_PEPPER
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # TWO_FACTOR_ENCRYPTION_KEY
```
