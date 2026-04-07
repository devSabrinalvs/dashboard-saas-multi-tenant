/**
 * Integration tests — billing-repo: webhook idempotency + updateOrgBilling
 *
 * Verifica que:
 *  - isWebhookEventProcessed / markWebhookEventProcessed funcionam corretamente
 *  - Processar o mesmo evento duas vezes não causa erro (idempotente)
 *  - updateOrgBilling atualiza os campos de billing da org corretamente
 *  - findOrgByStripeCustomerId encontra a org pelo stripeCustomerId
 */

import {
  testPrisma,
  resetDb,
  createTestUser,
  createOrgWithMembership,
} from "@tests/helpers/db";
import {
  isWebhookEventProcessed,
  markWebhookEventProcessed,
  updateOrgBilling,
  findOrgByStripeCustomerId,
} from "@/server/repo/billing-repo";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

// ─── isWebhookEventProcessed + markWebhookEventProcessed ─────────────────────

describe("isWebhookEventProcessed", () => {
  it("retorna false para evento não processado", async () => {
    const result = await isWebhookEventProcessed("evt_never_seen");
    expect(result).toBe(false);
  });

  it("retorna true após markWebhookEventProcessed", async () => {
    const eventId = "evt_test_abc";
    await markWebhookEventProcessed(eventId);
    const result = await isWebhookEventProcessed(eventId);
    expect(result).toBe(true);
  });

  it("diferentes eventIds são independentes", async () => {
    await markWebhookEventProcessed("evt_first");
    expect(await isWebhookEventProcessed("evt_first")).toBe(true);
    expect(await isWebhookEventProcessed("evt_second")).toBe(false);
  });
});

describe("markWebhookEventProcessed", () => {
  it("é idempotente — marcar o mesmo evento duas vezes não lança erro", async () => {
    const eventId = "evt_idempotent_test";
    await markWebhookEventProcessed(eventId);
    await expect(markWebhookEventProcessed(eventId)).resolves.not.toThrow();
  });

  it("registra o processedAt corretamente", async () => {
    const before = new Date();
    await markWebhookEventProcessed("evt_timestamp_test");
    const after = new Date();

    const record = await testPrisma.stripeWebhookEvent.findUnique({
      where: { stripeEventId: "evt_timestamp_test" },
    });

    expect(record).not.toBeNull();
    expect(record!.processedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(record!.processedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it("pode marcar múltiplos eventos distintos sem conflito", async () => {
    const eventIds = ["evt_a", "evt_b", "evt_c"];
    await Promise.all(eventIds.map((id) => markWebhookEventProcessed(id)));

    for (const id of eventIds) {
      expect(await isWebhookEventProcessed(id)).toBe(true);
    }
  });
});

// ─── updateOrgBilling ─────────────────────────────────────────────────────────

describe("updateOrgBilling", () => {
  async function setupOrg() {
    const user = await createTestUser();
    const org = await createOrgWithMembership(user.id, "org-billing-test");
    return { user, org };
  }

  it("atualiza stripeCustomerId", async () => {
    const { org } = await setupOrg();
    await updateOrgBilling(org.id, { stripeCustomerId: "cus_new_123" });

    const updated = await testPrisma.organization.findFirst({
      where: { id: org.id },
    });
    expect(updated!.stripeCustomerId).toBe("cus_new_123");
  });

  it("atualiza plan e seta planUpdatedAt automaticamente", async () => {
    const { org } = await setupOrg();
    const before = new Date();
    await updateOrgBilling(org.id, { plan: "PRO" });
    const after = new Date();

    const updated = await testPrisma.organization.findFirst({
      where: { id: org.id },
    });
    expect(updated!.plan).toBe("PRO");
    expect(updated!.planUpdatedAt).not.toBeNull();
    expect(updated!.planUpdatedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(updated!.planUpdatedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it("não seta planUpdatedAt se plan não está sendo alterado", async () => {
    const { org } = await setupOrg();
    await updateOrgBilling(org.id, { subscriptionStatus: "ACTIVE" });

    const updated = await testPrisma.organization.findFirst({
      where: { id: org.id },
    });
    // planUpdatedAt permanece null pois plan não foi alterado
    expect(updated!.planUpdatedAt).toBeNull();
  });

  it("atualiza subscriptionStatus para PAST_DUE", async () => {
    const { org } = await setupOrg();
    await updateOrgBilling(org.id, { subscriptionStatus: "PAST_DUE" });

    const updated = await testPrisma.organization.findFirst({
      where: { id: org.id },
    });
    expect(updated!.subscriptionStatus).toBe("PAST_DUE");
  });

  it("reseta campos ao cancelar assinatura", async () => {
    const { org } = await setupOrg();
    // Simular org com assinatura ativa
    await updateOrgBilling(org.id, {
      plan: "PRO",
      stripeSubscriptionId: "sub_abc",
      stripePriceId: "price_pro_test",
      subscriptionStatus: "ACTIVE",
      currentPeriodEnd: new Date("2027-01-01"),
    });

    // Cancelar
    await updateOrgBilling(org.id, {
      plan: "FREE",
      subscriptionStatus: "CANCELED",
      stripeSubscriptionId: null,
      stripePriceId: null,
      currentPeriodEnd: null,
    });

    const updated = await testPrisma.organization.findFirst({
      where: { id: org.id },
    });
    expect(updated!.plan).toBe("FREE");
    expect(updated!.subscriptionStatus).toBe("CANCELED");
    expect(updated!.stripeSubscriptionId).toBeNull();
    expect(updated!.stripePriceId).toBeNull();
    expect(updated!.currentPeriodEnd).toBeNull();
  });

  it("é no-op para orgId inexistente (updateMany não lança)", async () => {
    await expect(
      updateOrgBilling("org_nonexistent_999", { plan: "PRO" })
    ).resolves.not.toThrow();
  });
});

// ─── findOrgByStripeCustomerId ────────────────────────────────────────────────

describe("findOrgByStripeCustomerId", () => {
  it("retorna null quando nenhuma org tem esse customerId", async () => {
    const result = await findOrgByStripeCustomerId("cus_nobody");
    expect(result).toBeNull();
  });

  it("encontra a org pelo stripeCustomerId", async () => {
    const user = await createTestUser();
    const org = await createOrgWithMembership(user.id, "org-stripe-lookup");
    await updateOrgBilling(org.id, { stripeCustomerId: "cus_find_me_123" });

    const found = await findOrgByStripeCustomerId("cus_find_me_123");
    expect(found).not.toBeNull();
    expect(found!.id).toBe(org.id);
    expect(found!.slug).toBe("org-stripe-lookup");
  });

  it("não encontra org de outro stripeCustomerId", async () => {
    const user = await createTestUser();
    const org = await createOrgWithMembership(user.id, "org-another");
    await updateOrgBilling(org.id, { stripeCustomerId: "cus_other_abc" });

    const result = await findOrgByStripeCustomerId("cus_not_this_one");
    expect(result).toBeNull();
  });
});

// ─── Fluxo completo de webhook ────────────────────────────────────────────────

describe("fluxo completo de webhook (idempotência end-to-end)", () => {
  it("processa evento uma vez e ignora replay", async () => {
    const user = await createTestUser();
    const org = await createOrgWithMembership(user.id, "org-webhook-flow");
    await updateOrgBilling(org.id, { stripeCustomerId: "cus_webhook_org" });

    const eventId = "evt_sub_updated_xyz";

    // Simula primeiro processamento
    expect(await isWebhookEventProcessed(eventId)).toBe(false);
    await updateOrgBilling(org.id, { plan: "PRO", subscriptionStatus: "ACTIVE" });
    await markWebhookEventProcessed(eventId);

    // Simula replay (Stripe pode reenviar eventos)
    expect(await isWebhookEventProcessed(eventId)).toBe(true);
    // Processamento NÃO deveria ocorrer (verificado pelo caller no webhook handler)
    // Aqui apenas verificamos que markWebhookEventProcessed é idempotente
    await expect(markWebhookEventProcessed(eventId)).resolves.not.toThrow();

    // Estado final: org permanece PRO (não houve downgrade acidental)
    const finalOrg = await testPrisma.organization.findFirst({
      where: { id: org.id },
    });
    expect(finalOrg!.plan).toBe("PRO");
  });
});
