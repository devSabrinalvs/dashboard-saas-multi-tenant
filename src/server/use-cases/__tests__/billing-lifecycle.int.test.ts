/**
 * Integration tests — billing lifecycle (Etapa O)
 *
 * Testa o ciclo de vida completo de billing:
 *  - invoice.payment_failed → PAST_DUE + graceUntil
 *  - invoice.paid → limpa grace
 *  - grace expirado → downgrade para FREE
 *  - customer.subscription.deleted → FREE + limpa flags
 *  - cancel_at_period_end → cancelAtPeriodEnd=true + currentPeriodEnd
 *  - cooldown de emails (FakeMailer)
 */

import {
  testPrisma,
  resetDb,
  createTestUser,
  createOrgWithMembership,
} from "@tests/helpers/db";
import { updateOrgBilling } from "@/server/repo/billing-repo";
import { applyExpiredGracePeriods } from "@/server/use-cases/billing/apply-grace-expiry";
import { computeBillingState, GRACE_PERIOD_MS } from "@/billing/billing-state";
import {
  getLastBillingEmailSent,
  upsertBillingEmailSent,
} from "@/server/repo/billing-email-repo";
import { shouldSendBillingEmail } from "@/billing/billing-state";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

// ─── Helper ───────────────────────────────────────────────────────────────────

async function getOrg(orgId: string) {
  const rows = await testPrisma.$queryRaw<{
    id: string;
    plan: string;
    subscriptionStatus: string | null;
    graceUntil: Date | null;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: Date | null;
    billingEmail: string | null;
    slug: string;
    name: string;
  }[]>`
    SELECT id, plan, "subscriptionStatus", "graceUntil", "cancelAtPeriodEnd",
           "currentPeriodEnd", "billingEmail", slug, name
    FROM "Organization"
    WHERE id = ${orgId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function setupOrg(opts: { billingEmail?: string } = {}) {
  const user = await createTestUser();
  const org = await createOrgWithMembership(user.id, "org-billing-lc");
  if (opts.billingEmail) {
    await updateOrgBilling(org.id, {
      stripeCustomerId: "cus_lc_test",
      billingEmail: opts.billingEmail,
    });
  }
  return { user, org };
}

// ─── invoice.payment_failed → grace period ────────────────────────────────────

describe("invoice.payment_failed — grace period", () => {
  it("seta graceUntil ≈ now + 7 dias quando PAST_DUE", async () => {
    const { org } = await setupOrg();
    const before = new Date();
    await updateOrgBilling(org.id, {
      subscriptionStatus: "PAST_DUE",
      graceUntil: new Date(Date.now() + GRACE_PERIOD_MS),
    });
    const after = new Date();

    const updated = await getOrg(org.id);
    expect(updated!.subscriptionStatus).toBe("PAST_DUE");
    expect(updated!.graceUntil).not.toBeNull();
    const diff = updated!.graceUntil!.getTime() - before.getTime();
    // graceUntil deve ser próximo de now + 7d
    expect(diff).toBeGreaterThan(GRACE_PERIOD_MS - 5000);
    expect(diff).toBeLessThan(GRACE_PERIOD_MS + (after.getTime() - before.getTime()) + 5000);
  });

  it("mantém o plano pago durante o grace period", async () => {
    const { org } = await setupOrg();
    await updateOrgBilling(org.id, {
      plan: "PRO",
      subscriptionStatus: "PAST_DUE",
      graceUntil: new Date(Date.now() + GRACE_PERIOD_MS),
    });

    const updated = await getOrg(org.id);
    expect(updated!.plan).toBe("PRO"); // plano ainda PRO durante grace
  });

  it("computeBillingState retorna payment_issue_grace para grace ativo", async () => {
    const graceUntil = new Date(Date.now() + GRACE_PERIOD_MS);
    const state = computeBillingState({
      plan: "PRO",
      subscriptionStatus: "PAST_DUE",
      graceUntil,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
    });
    expect(state.bannerType).toBe("payment_issue_grace");
  });
});

// ─── invoice.paid → limpa grace ───────────────────────────────────────────────

describe("invoice.paid — limpa grace period", () => {
  it("limpa graceUntil quando pagamento é efetuado", async () => {
    const { org } = await setupOrg();
    // Simular grace ativo
    await updateOrgBilling(org.id, {
      subscriptionStatus: "PAST_DUE",
      graceUntil: new Date(Date.now() + GRACE_PERIOD_MS),
    });

    // Simular pagamento bem-sucedido
    await updateOrgBilling(org.id, {
      subscriptionStatus: "ACTIVE",
      graceUntil: null,
    });

    const updated = await getOrg(org.id);
    expect(updated!.subscriptionStatus).toBe("ACTIVE");
    expect(updated!.graceUntil).toBeNull();
  });
});

// ─── grace expirado → downgrade para FREE ─────────────────────────────────────

describe("grace expirado → applyExpiredGracePeriods", () => {
  it("rebaixa org para FREE quando graceUntil expirou", async () => {
    const { org } = await setupOrg();
    const expiredGrace = new Date(Date.now() - 1000); // 1s atrás

    await updateOrgBilling(org.id, {
      plan: "PRO",
      subscriptionStatus: "PAST_DUE",
      graceUntil: expiredGrace,
    });

    const count = await applyExpiredGracePeriods(new Date());
    expect(count).toBe(1);

    const updated = await getOrg(org.id);
    expect(updated!.plan).toBe("FREE");
    expect(updated!.graceUntil).toBeNull();
  });

  it("não processa org com grace ainda ativo", async () => {
    const { org } = await setupOrg();
    const activeGrace = new Date(Date.now() + GRACE_PERIOD_MS);

    await updateOrgBilling(org.id, {
      plan: "PRO",
      subscriptionStatus: "PAST_DUE",
      graceUntil: activeGrace,
    });

    const count = await applyExpiredGracePeriods(new Date());
    expect(count).toBe(0);

    const updated = await getOrg(org.id);
    expect(updated!.plan).toBe("PRO"); // manteve PRO
  });

  it("não processa org ACTIVE", async () => {
    const { org } = await setupOrg();
    await updateOrgBilling(org.id, { subscriptionStatus: "ACTIVE" });

    const count = await applyExpiredGracePeriods(new Date());
    expect(count).toBe(0);
  });

  it("processa múltiplas orgs com grace expirado", async () => {
    const user1 = await createTestUser("u1@test.com");
    const user2 = await createTestUser("u2@test.com");
    const org1 = await createOrgWithMembership(user1.id, "org-grace-1");
    const org2 = await createOrgWithMembership(user2.id, "org-grace-2");

    const expired = new Date(Date.now() - 1000);
    await updateOrgBilling(org1.id, {
      plan: "PRO",
      subscriptionStatus: "PAST_DUE",
      graceUntil: expired,
    });
    await updateOrgBilling(org2.id, {
      plan: "BUSINESS",
      subscriptionStatus: "PAST_DUE",
      graceUntil: expired,
    });

    const count = await applyExpiredGracePeriods(new Date());
    expect(count).toBe(2);

    const o1 = await getOrg(org1.id);
    const o2 = await getOrg(org2.id);
    expect(o1!.plan).toBe("FREE");
    expect(o2!.plan).toBe("FREE");
  });
});

// ─── customer.subscription.deleted → downgrade completo ──────────────────────

describe("customer.subscription.deleted", () => {
  it("aplica downgrade completo e limpa todos os campos", async () => {
    const { org } = await setupOrg();
    await updateOrgBilling(org.id, {
      plan: "PRO",
      subscriptionStatus: "ACTIVE",
      stripeSubscriptionId: "sub_abc",
      stripePriceId: "price_pro",
      currentPeriodEnd: new Date("2027-01-01"),
      cancelAtPeriodEnd: false,
    });

    // Simular evento subscription.deleted
    await updateOrgBilling(org.id, {
      plan: "FREE",
      subscriptionStatus: "CANCELED",
      stripeSubscriptionId: null,
      stripePriceId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      graceUntil: null,
    });

    const updated = await getOrg(org.id);
    expect(updated!.plan).toBe("FREE");
    expect(updated!.subscriptionStatus).toBe("CANCELED");
    expect(updated!.graceUntil).toBeNull();
    expect(updated!.cancelAtPeriodEnd).toBe(false);
    expect(updated!.currentPeriodEnd).toBeNull();
  });
});

// ─── cancel_at_period_end ─────────────────────────────────────────────────────

describe("cancel_at_period_end", () => {
  it("seta cancelAtPeriodEnd=true e currentPeriodEnd corretamente", async () => {
    const { org } = await setupOrg();
    const cancelDate = new Date("2026-12-31");

    await updateOrgBilling(org.id, {
      plan: "PRO",
      subscriptionStatus: "ACTIVE",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: cancelDate,
    });

    const updated = await getOrg(org.id);
    expect(updated!.cancelAtPeriodEnd).toBe(true);
    expect(updated!.currentPeriodEnd).not.toBeNull();
    expect(updated!.currentPeriodEnd!.getTime()).toBe(cancelDate.getTime());
  });

  it("computeBillingState retorna cancel_pending", () => {
    const state = computeBillingState({
      plan: "PRO",
      subscriptionStatus: "ACTIVE",
      graceUntil: null,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: new Date("2026-12-31"),
    });
    expect(state.bannerType).toBe("cancel_pending");
    expect(state.currentPeriodEnd).not.toBeNull();
  });
});

// ─── BillingEmailSent — cooldown ──────────────────────────────────────────────

describe("cooldown de emails de billing", () => {
  it("shouldSendBillingEmail retorna true na primeira vez (sem registro)", async () => {
    const { org } = await setupOrg();
    const lastSentAt = await getLastBillingEmailSent(org.id, "payment_failed");
    expect(shouldSendBillingEmail(lastSentAt)).toBe(true);
  });

  it("após upsertBillingEmailSent, cooldown está ativo (< 24h)", async () => {
    const { org } = await setupOrg();

    await upsertBillingEmailSent(org.id, "payment_failed", new Date());

    const lastSentAt = await getLastBillingEmailSent(org.id, "payment_failed");
    expect(lastSentAt).not.toBeNull();
    expect(shouldSendBillingEmail(lastSentAt)).toBe(false);
  });

  it("cooldown de 24h: retorna true após 24h+", async () => {
    const { org } = await setupOrg();
    const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25h atrás

    await upsertBillingEmailSent(org.id, "payment_failed", yesterday);

    const lastSentAt = await getLastBillingEmailSent(org.id, "payment_failed");
    expect(shouldSendBillingEmail(lastSentAt)).toBe(true);
  });

  it("tipos diferentes são independentes", async () => {
    const { org } = await setupOrg();

    await upsertBillingEmailSent(org.id, "payment_failed", new Date());

    // "downgraded" ainda não foi enviado
    const lastDowngraded = await getLastBillingEmailSent(org.id, "downgraded");
    expect(shouldSendBillingEmail(lastDowngraded)).toBe(true);

    // "payment_failed" está em cooldown
    const lastPaymentFailed = await getLastBillingEmailSent(org.id, "payment_failed");
    expect(shouldSendBillingEmail(lastPaymentFailed)).toBe(false);
  });

  it("upsert atualiza sentAt (idempotente)", async () => {
    const { org } = await setupOrg();
    const t1 = new Date(Date.now() - 1000);
    const t2 = new Date();

    await upsertBillingEmailSent(org.id, "downgraded", t1);
    await upsertBillingEmailSent(org.id, "downgraded", t2);

    const lastSentAt = await getLastBillingEmailSent(org.id, "downgraded");
    expect(lastSentAt!.getTime()).toBe(t2.getTime());
  });
});
