# Admin Console interno (Etapa P)

Painel de suporte interno com acesso restrito a super admins.
Permite visualizar usuários e organizações, executar ações de suporte, e auditoria append-only de todas as ações.

---

## Acesso

### Configurar ADMIN_ALLOWLIST

No seu `.env.local` (dev) ou variáveis de ambiente de produção:

```env
# Lista de emails autorizados, separados por vírgula
ADMIN_ALLOWLIST="admin@empresa.com,suporte@empresa.com"

# Opcional: exigir 2FA para acessar o Admin Console
ADMIN_REQUIRE_2FA="true"
```

**Comportamento de segurança:**
- Se `ADMIN_ALLOWLIST` estiver ausente ou vazio: **ninguém acessa** (fail-closed)
- Se o email não estiver na lista: resposta **404** (não 403 — para não vazar a existência da área)
- Sessões revogadas são rejeitadas normalmente

### Recomendação: habilitar 2FA para admins

Configure `ADMIN_REQUIRE_2FA="true"` em produção.
Todos os emails na `ADMIN_ALLOWLIST` devem ter 2FA ativo para acessar o console.

---

## Acessar /admin

1. Logue com um email que está na `ADMIN_ALLOWLIST`
2. Navegue para `http://localhost:3000/admin`
3. Se `ADMIN_REQUIRE_2FA=true`, o usuário precisa ter 2FA configurado

---

## Páginas disponíveis

| URL | Descrição |
|-----|-----------|
| `/admin` | Dashboard com links para as seções |
| `/admin/users` | Busca de usuários por email |
| `/admin/users/[userId]` | Detalhes + ações de suporte para um usuário |
| `/admin/orgs` | Busca de organizações por nome/slug |
| `/admin/orgs/[orgId]` | Detalhes + membros + ações para uma org |
| `/admin/audit` | Audit log interno, append-only, com filtros |

---

## Ações disponíveis

### Ações em usuários

| Ação | Endpoint | Confirmação requerida |
|------|----------|-----------------------|
| Desbloquear conta | `POST /api/admin/users/:id/unlock` | Email do usuário |
| Revogar todas as sessões | `POST /api/admin/users/:id/revoke-sessions` | Email do usuário |
| Forçar verificação de email | `POST /api/admin/users/:id/verify-email` | Email do usuário |
| Desativar 2FA | `POST /api/admin/users/:id/disable-2fa` | Email do usuário |

**Confirmação**: o admin deve digitar o email exato do usuário alvo para confirmar. A comparação é case-insensitive.

### Ações em organizações

| Ação | Endpoint | Confirmação requerida |
|------|----------|-----------------------|
| Forçar plano | `POST /api/admin/orgs/:id/force-plan` | Slug da org |

**Atenção**: `force-plan` altera o plano **localmente no banco** sem alterar o Stripe. Use apenas para:
- Correção de discrepâncias entre Stripe e banco
- Concessão temporária de acesso em caso de suporte
- Sempre documente a razão — o audit log captura `previousPlan` e `newPlan`

---

## Segurança e prevenção de abuso

- **Rate limit global**: 60 req/min por email de admin (todos os endpoints)
- **Rate limit de ações**: 10 req/min por email de admin (ações sensíveis)
- **Confirmação obrigatória**: email ou slug digitado manualmente antes de cada ação
- **Dados sensíveis nunca retornados**: `password`, `totpSecretEncrypted`, `twoFactorRecoveryCodeHashes`, tokens, `sessionToken`
- **Sessões revogadas rejeitadas**: se a sessão do admin for revogada, o acesso cai imediatamente

---

## Admin Audit Log

Todas as ações do Admin Console são registradas no model `AdminAuditLog`:

```
id, actorAdminEmail, action, targetType, targetId, metadata, createdAt
```

**Ações registradas:**
- `admin.user.unlock`
- `admin.user.revoke_sessions`
- `admin.user.verify_email`
- `admin.user.disable_2fa`
- `admin.org.force_plan`

O audit log é **append-only** — registros nunca são deletados.
Acesse em `/admin/audit` com filtros por email, ação, e paginação.

---

## API Endpoints

Todos exigem sessão autenticada com email na `ADMIN_ALLOWLIST`.

```
GET  /api/admin/users?search=<email>
GET  /api/admin/users/:userId
POST /api/admin/users/:userId/unlock           { confirm: "<email>" }
POST /api/admin/users/:userId/revoke-sessions  { confirm: "<email>" }
POST /api/admin/users/:userId/verify-email     { confirm: "<email>" }
POST /api/admin/users/:userId/disable-2fa      { confirm: "<email>" }

GET  /api/admin/orgs?search=<slug|name>
GET  /api/admin/orgs/:orgId
POST /api/admin/orgs/:orgId/force-plan         { plan: "FREE|PRO|BUSINESS", confirm: "<slug>" }

GET  /api/admin/audit?page=&pageSize=&search=&action=
```

---

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `ADMIN_ALLOWLIST` | Sim (para acesso) | Emails admin separados por vírgula |
| `ADMIN_REQUIRE_2FA` | Não | Se `"true"`, exige 2FA ativo para acessar |

---

## Arquivos relevantes

```
src/
├── server/auth/
│   ├── admin-allowlist.ts          # parseAdminAllowlist, isAdminAllowed (puras)
│   └── require-super-admin.ts      # requireSuperAdmin, requireSuperAdminForApi
├── server/repo/
│   ├── admin-user-repo.ts          # search, find, unlock, revoke, verify, disable2fa
│   ├── admin-org-repo.ts           # search, find, force-plan
│   └── admin-audit-repo.ts         # createAdminAuditLog, listAdminAuditLogs
├── server/use-cases/admin/
│   ├── unlock-user.ts
│   ├── revoke-user-sessions.ts
│   ├── verify-user-email.ts
│   ├── disable-user-2fa.ts
│   └── force-org-plan.ts
├── schemas/admin.ts                # Zod schemas para inputs admin
├── components/admin/
│   ├── admin-shell.tsx
│   └── admin-sidebar.tsx
├── features/admin/components/
│   ├── admin-user-actions.tsx      # Client component de ações do usuário
│   └── admin-org-actions.tsx       # Client component de ações da org
└── app/
    ├── admin/
    │   ├── layout.tsx
    │   ├── page.tsx                # Dashboard index
    │   ├── users/page.tsx
    │   ├── users/[userId]/page.tsx
    │   ├── orgs/page.tsx
    │   ├── orgs/[orgId]/page.tsx
    │   └── audit/page.tsx
    └── api/admin/
        ├── users/route.ts
        ├── users/[userId]/route.ts
        ├── users/[userId]/unlock/route.ts
        ├── users/[userId]/revoke-sessions/route.ts
        ├── users/[userId]/verify-email/route.ts
        ├── users/[userId]/disable-2fa/route.ts
        ├── orgs/route.ts
        ├── orgs/[orgId]/route.ts
        ├── orgs/[orgId]/force-plan/route.ts
        └── audit/route.ts
```
