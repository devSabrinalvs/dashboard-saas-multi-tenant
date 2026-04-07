# Configuração do Stripe

Este guia cobre a integração completa com Stripe para cobrança por plano (PRO/BUSINESS).

## Pré-requisitos

- Conta no [Stripe Dashboard](https://dashboard.stripe.com)
- Stripe CLI instalado (para testar webhooks localmente)
- Variáveis de ambiente configuradas (ver `.env.example`)

---

## 1. Criar produtos e preços no Stripe

No Dashboard → **Products** → **Add product**:

| Produto   | Tipo       | Cobrança        |
|-----------|------------|-----------------|
| Pro       | Recurring  | Mensal ou anual |
| Business  | Recurring  | Mensal ou anual |

Após criar os produtos, copie os **Price IDs** (formato `price_...`) e adicione ao `.env.local`:

```bash
STRIPE_PRICE_ID_PRO="price_xxxxxxxxxxxxxxxxxxxxxxxx"
STRIPE_PRICE_ID_BUSINESS="price_yyyyyyyyyyyyyyyyyyyyyyyy"
```

---

## 2. API Keys

No Dashboard → **Developers** → **API keys**:

```bash
# Desenvolvimento (chaves de teste)
STRIPE_SECRET_KEY="sk_test_..."

# Produção
STRIPE_SECRET_KEY="sk_live_..."
```

> ⚠️ Nunca commite chaves reais. Use chaves de **teste** (`sk_test_...`) em dev/staging.

---

## 3. Webhook — desenvolvimento local

Use a **Stripe CLI** para encaminhar eventos ao servidor local:

```bash
# Instalar Stripe CLI (macOS)
brew install stripe/stripe-cli/stripe

# Instalar Stripe CLI (Windows via scoop)
scoop install stripe

# Autenticar
stripe login

# Encaminhar webhooks para o servidor local
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

A CLI exibirá um `whsec_...` — copie para `.env.local`:

```bash
STRIPE_WEBHOOK_SECRET="whsec_..."
```

---

## 4. Webhook — produção

No Dashboard → **Developers** → **Webhooks** → **Add endpoint**:

- **Endpoint URL**: `https://seu-app.vercel.app/api/stripe/webhook`
- **Listen to**: selecione os eventos abaixo

### Eventos necessários

| Evento                              | Descrição                             |
|-------------------------------------|---------------------------------------|
| `checkout.session.completed`        | Checkout finalizado → salva customer  |
| `customer.subscription.created`     | Assinatura criada → atualiza plano    |
| `customer.subscription.updated`     | Mudança de plano ou status            |
| `customer.subscription.deleted`     | Cancelamento → downgrade para FREE    |
| `invoice.paid`                      | Pagamento ok → status ACTIVE          |
| `invoice.payment_failed`            | Falha de pagamento → status PAST_DUE  |

Após criar o endpoint, copie o **Signing secret** (`whsec_...`) para a variável de ambiente de produção:

```bash
STRIPE_WEBHOOK_SECRET="whsec_..."
```

---

## 5. Testar o fluxo completo localmente

```bash
# Terminal 1 — servidor Next.js
pnpm dev

# Terminal 2 — Stripe CLI (encaminha webhooks)
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Terminal 3 — Simular checkout completado
stripe trigger checkout.session.completed

# Simular falha de pagamento
stripe trigger invoice.payment_failed

# Simular cancelamento
stripe trigger customer.subscription.deleted
```

### Cartões de teste do Stripe

| Número              | Comportamento            |
|---------------------|--------------------------|
| `4242 4242 4242 4242` | Pagamento aprovado      |
| `4000 0000 0000 0341` | Cartão recusado         |
| `4000 0000 0000 9995` | Fundos insuficientes    |

Use qualquer data de validade futura e qualquer CVC de 3 dígitos.

---

## 6. Estrutura do código

```
src/
├── lib/stripe.ts                              # Singleton Stripe (getStripe())
├── billing/
│   └── stripe-plans.ts                        # planFromStripePriceId / stripePriceIdFromPlan
├── server/
│   ├── repo/billing-repo.ts                   # findOrgByStripeCustomerId, updateOrgBilling
│   │                                          # isWebhookEventProcessed, markWebhookEventProcessed
│   └── use-cases/stripe/
│       └── apply-stripe-event.ts              # parseStripeEvent (função pura)
└── app/
    └── api/
        ├── stripe/webhook/route.ts            # POST /api/stripe/webhook
        └── org/[orgSlug]/billing/
            ├── checkout/route.ts              # POST → Stripe Checkout Session
            └── portal/route.ts               # POST → Stripe Customer Portal
```

### Fluxo de upgrade

```
Usuário clica "Upgrade"
  → POST /api/org/[orgSlug]/billing/checkout
  → Cria Stripe Customer (se necessário) + Checkout Session
  → Retorna { url }
  → window.location.href = url (redirect para Stripe)
  → Usuário paga
  → Stripe envia webhooks → POST /api/stripe/webhook
  → parseStripeEvent → updateOrgBilling (plano atualizado no DB)
  → Usuário retorna para /org/[orgSlug]/settings/billing?status=success
```

### Segurança

- O plano **nunca** é atualizado diretamente pelo endpoint de checkout — apenas webhooks alteram o plano.
- Todo webhook verifica a assinatura `Stripe-Signature` com `stripe.webhooks.constructEvent`.
- Idempotência garantida via tabela `StripeWebhookEvent` (unique constraint em `stripeEventId`).
- Apenas usuários com role `OWNER` acessam endpoints de billing (`billing:manage` permission).

---

## 7. Variáveis de ambiente — resumo

| Variável                  | Obrigatória | Descrição                                    |
|---------------------------|-------------|----------------------------------------------|
| `STRIPE_SECRET_KEY`       | Sim         | Chave secreta da API Stripe                  |
| `STRIPE_WEBHOOK_SECRET`   | Sim         | Segredo para verificar assinatura do webhook |
| `STRIPE_PRICE_ID_PRO`     | Sim         | Price ID do plano Pro no Stripe              |
| `STRIPE_PRICE_ID_BUSINESS`| Sim         | Price ID do plano Business no Stripe         |
| `APP_BASE_URL`            | Sim         | URL base da app (para redirect URLs)         |
