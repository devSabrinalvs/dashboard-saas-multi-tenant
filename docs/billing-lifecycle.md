# Billing Lifecycle (Etapa O)

Este documento descreve o ciclo de vida completo de billing após um checkout Stripe bem-sucedido.

---

## Estados de billing

A tabela `Organization` armazena os seguintes campos de billing:

| Campo                | Tipo                    | Descrição |
|----------------------|-------------------------|-----------|
| `plan`               | `FREE \| PRO \| BUSINESS` | Plano ativo — alterado **somente via webhook** |
| `subscriptionStatus` | `SubscriptionStatus?`   | Status atual da assinatura Stripe |
| `graceUntil`         | `DateTime?`             | Grace period: mantém plano pago até esta data em caso de falha |
| `cancelAtPeriodEnd`  | `Boolean`               | True se a assinatura cancela ao fim do período |
| `currentPeriodEnd`   | `DateTime?`             | Data de encerramento do período (usado no banner de cancelamento) |

### Regras de SubscriptionStatus

| Status       | Plano          | Banner                  | Grace |
|--------------|----------------|-------------------------|-------|
| `ACTIVE`     | pago mantido   | nenhum                  | n/a   |
| `PAST_DUE`   | pago mantido   | warning / danger        | 7 dias|
| `CANCELED`   | FREE           | nenhum                  | n/a   |
| `INCOMPLETE` | pago mantido   | warning (complete pmt)  | n/a   |
| `TRIALING`   | pago mantido   | nenhum                  | n/a   |

---

## Grace period (falha de pagamento)

**Trigger**: evento `invoice.payment_failed` chega via webhook.

**Regra**:
1. `subscriptionStatus` → `PAST_DUE`
2. Se `graceUntil` ainda não estava definido: `graceUntil = now + 7 dias`
3. Email "Action required: update payment method" enviado (cooldown 24h)
4. Plano pago **permanece ativo** durante o grace

**Grace expirado** (cron job ou lazy check):
- Quando `graceUntil < now` e `subscriptionStatus = PAST_DUE`:
  - `plan = FREE`, `graceUntil = null`
  - Email "Plano rebaixado para Free" enviado (cooldown 24h)
  - Dados preservados — downgrade soft, sem deleção

**Resolução** (pagamento regularizado):
- Evento `invoice.paid` chega
- `subscriptionStatus → ACTIVE`, `graceUntil = null`
- Plano volta ao estado pago normalmente

---

## Cancelamento

### Cancelamento imediato (`subscription.deleted`)

Webhook `customer.subscription.deleted`:
- `plan = FREE`
- `subscriptionStatus = CANCELED`
- `stripeSubscriptionId = null`, `stripePriceId = null`
- `currentPeriodEnd = null`, `cancelAtPeriodEnd = false`, `graceUntil = null`
- Email "Sua assinatura será encerrada" enviado

### Cancelamento ao fim do período (`cancel_at_period_end`)

Webhook `customer.subscription.updated` com `cancel_at_period_end = true`:
- `cancelAtPeriodEnd = true`
- `currentPeriodEnd = cancel_at` (data do cancelamento definitivo)
- Banner "Cancela em {data}" exibido no app
- Email enviado (cooldown 24h)

Quando o período termina, o Stripe envia `subscription.deleted` → aplicar regras acima.

---

## Banners globais (AppShell)

O banner aparece na área principal do app para usuários com `billing:manage` (OWNER).
Para outros membros, apenas o banner de "grace expirado" aparece com mensagem genérica.

| `bannerType`              | Cor     | Mensagem |
|---------------------------|---------|----------|
| `payment_issue_grace`     | Amber   | "Problema de pagamento — atualize antes de {graceUntil}" |
| `payment_issue_expired`   | Red     | "Acesso premium expirado — faça upgrade" |
| `cancel_pending`          | Blue    | "Assinatura cancela em {currentPeriodEnd}" |
| `incomplete`              | Amber   | "Pagamento incompleto — finalize a assinatura" |
| `null`                    | —       | sem banner |

---

## Emails de billing

| Tipo                   | Trigger                       | Cooldown |
|------------------------|-------------------------------|----------|
| `payment_failed`       | `invoice.payment_failed`      | 24h/org  |
| `subscription_canceled`| `subscription.deleted` ou `cancel_at_period_end` | 24h/org |
| `downgraded`           | Grace expirado (cron)         | 24h/org  |

O cooldown é armazenado na tabela `BillingEmailSent` (unique por `orgId + type`).
O campo `sentAt` é atualizado a cada envio via `upsert`.

---

## Cron job de reconciliação

**Por que existe**: webhooks são confiáveis mas podem falhar (outage do Stripe, timeout de rede).
O cron é um safety net para aplicar downgrades que não foram processados via webhook.

**Endpoint**: `GET /api/cron/billing-reconcile`

**Autenticação**: `Authorization: Bearer <CRON_SECRET>` header

**Lógica**:
1. Buscar orgs com `subscriptionStatus = PAST_DUE` e `graceUntil < now`
2. Para cada org: `plan = FREE`, `graceUntil = null`
3. Enviar email "downgraded" (com cooldown de 24h)

**Agendamento**: GitHub Actions (`billing-cron.yml`) — diariamente às 08:00 UTC

### Como testar o cron localmente

```bash
# Com CRON_SECRET ausente, qualquer request funciona
curl http://localhost:3000/api/cron/billing-reconcile

# Com CRON_SECRET configurado
curl -H "Authorization: Bearer <seu-cron-secret>" \
  http://localhost:3000/api/cron/billing-reconcile
```

---

## Testar com Stripe CLI

```bash
# Terminal 1 — servidor
pnpm dev

# Terminal 2 — Stripe CLI
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Simular falha de pagamento → grace period + email
stripe trigger invoice.payment_failed

# Simular resolução de pagamento → limpa grace
stripe trigger invoice.paid

# Simular cancelamento imediato
stripe trigger customer.subscription.deleted

# Simular cancel_at_period_end (atualização de assinatura)
stripe trigger customer.subscription.updated
```

### Simular grace expirado manualmente

```sql
-- No banco de dev: forçar graceUntil no passado para uma org
UPDATE "Organization"
SET "graceUntil" = NOW() - INTERVAL '1 day',
    "subscriptionStatus" = 'PAST_DUE',
    "plan" = 'PRO'
WHERE slug = 'sua-org';

-- Então chamar o cron:
curl http://localhost:3000/api/cron/billing-reconcile
```

---

## Variáveis de ambiente adicionais (Etapa O)

| Variável       | Obrigatória | Descrição |
|----------------|-------------|-----------|
| `CRON_SECRET`  | Recomendada | Segredo para autenticar o endpoint de cron |

Se ausente, o endpoint de cron aceita qualquer request (apenas para dev local).

---

## Arquivos relevantes

```
src/
├── billing/
│   └── billing-state.ts           # computeBillingState, shouldSendBillingEmail (puras)
├── server/
│   ├── repo/
│   │   ├── billing-repo.ts        # updateOrgBilling, findOrgsWithExpiredGrace
│   │   └── billing-email-repo.ts  # getLastBillingEmailSent, upsertBillingEmailSent
│   └── use-cases/billing/
│       ├── send-billing-email.ts  # sendBillingEmailIfNeeded (com cooldown)
│       └── apply-grace-expiry.ts  # applyExpiredGracePeriods (cron handler)
├── features/billing/components/
│   └── billing-banner.tsx         # Banner global (AppShell)
└── app/api/cron/billing-reconcile/
    └── route.ts                   # GET /api/cron/billing-reconcile
```
