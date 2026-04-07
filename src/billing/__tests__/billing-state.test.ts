/**
 * Unit tests para src/billing/billing-state.ts
 * Funções puras — sem banco de dados.
 */

import {
  computeBillingState,
  shouldSendBillingEmail,
  GRACE_PERIOD_MS,
  BILLING_EMAIL_COOLDOWN_MS,
  type OrgBillingSnapshot,
} from "../billing-state";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const NOW = new Date("2026-06-01T10:00:00Z");
const FUTURE = new Date(NOW.getTime() + 3 * 24 * 60 * 60 * 1000); // +3d
const PAST = new Date(NOW.getTime() - 1 * 24 * 60 * 60 * 1000);   // -1d

function makeOrg(overrides: Partial<OrgBillingSnapshot> = {}): OrgBillingSnapshot {
  return {
    plan: "PRO",
    subscriptionStatus: "ACTIVE",
    graceUntil: null,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
    ...overrides,
  };
}

// ─── computeBillingState ──────────────────────────────────────────────────────

describe("computeBillingState", () => {
  describe("estado ACTIVE (sem banner)", () => {
    it("retorna null para org ACTIVE sem flags especiais", () => {
      const result = computeBillingState(makeOrg(), NOW);
      expect(result.bannerType).toBeNull();
    });

    it("retorna null para org FREE sem assinatura", () => {
      const result = computeBillingState(makeOrg({ plan: "FREE", subscriptionStatus: null }), NOW);
      expect(result.bannerType).toBeNull();
    });

    it("retorna null para TRIALING", () => {
      const result = computeBillingState(makeOrg({ subscriptionStatus: "TRIALING" }), NOW);
      expect(result.bannerType).toBeNull();
    });
  });

  describe("PAST_DUE com grace ativo", () => {
    it("retorna payment_issue_grace quando graceUntil está no futuro", () => {
      const result = computeBillingState(
        makeOrg({ subscriptionStatus: "PAST_DUE", graceUntil: FUTURE }),
        NOW
      );
      expect(result.bannerType).toBe("payment_issue_grace");
      expect(result.graceUntil).toEqual(FUTURE);
    });

    it("inclui graceUntil no resultado", () => {
      const result = computeBillingState(
        makeOrg({ subscriptionStatus: "PAST_DUE", graceUntil: FUTURE }),
        NOW
      );
      expect(result.graceUntil).toEqual(FUTURE);
    });
  });

  describe("PAST_DUE com grace expirado", () => {
    it("retorna payment_issue_expired quando graceUntil está no passado", () => {
      const result = computeBillingState(
        makeOrg({ subscriptionStatus: "PAST_DUE", graceUntil: PAST }),
        NOW
      );
      expect(result.bannerType).toBe("payment_issue_expired");
    });

    it("retorna payment_issue_expired quando graceUntil é null", () => {
      const result = computeBillingState(
        makeOrg({ subscriptionStatus: "PAST_DUE", graceUntil: null }),
        NOW
      );
      expect(result.bannerType).toBe("payment_issue_expired");
    });

    it("retorna payment_issue_expired quando graceUntil === now (exato)", () => {
      const result = computeBillingState(
        makeOrg({ subscriptionStatus: "PAST_DUE", graceUntil: NOW }),
        NOW
      );
      expect(result.bannerType).toBe("payment_issue_expired");
    });
  });

  describe("PAST_DUE tem prioridade sobre cancelAtPeriodEnd", () => {
    it("mostra payment_issue_grace mesmo com cancelAtPeriodEnd=true", () => {
      const result = computeBillingState(
        makeOrg({
          subscriptionStatus: "PAST_DUE",
          graceUntil: FUTURE,
          cancelAtPeriodEnd: true,
          currentPeriodEnd: FUTURE,
        }),
        NOW
      );
      expect(result.bannerType).toBe("payment_issue_grace");
    });
  });

  describe("cancelAtPeriodEnd", () => {
    it("retorna cancel_pending quando cancelAtPeriodEnd=true e currentPeriodEnd definido", () => {
      const result = computeBillingState(
        makeOrg({
          subscriptionStatus: "ACTIVE",
          cancelAtPeriodEnd: true,
          currentPeriodEnd: FUTURE,
        }),
        NOW
      );
      expect(result.bannerType).toBe("cancel_pending");
      expect(result.currentPeriodEnd).toEqual(FUTURE);
    });

    it("retorna null quando cancelAtPeriodEnd=true mas currentPeriodEnd é null", () => {
      const result = computeBillingState(
        makeOrg({ subscriptionStatus: "ACTIVE", cancelAtPeriodEnd: true, currentPeriodEnd: null }),
        NOW
      );
      expect(result.bannerType).toBeNull();
    });

    it("retorna null quando cancelAtPeriodEnd=false mesmo com currentPeriodEnd", () => {
      const result = computeBillingState(
        makeOrg({ subscriptionStatus: "ACTIVE", cancelAtPeriodEnd: false, currentPeriodEnd: FUTURE }),
        NOW
      );
      expect(result.bannerType).toBeNull();
    });
  });

  describe("INCOMPLETE", () => {
    it("retorna incomplete para subscriptionStatus INCOMPLETE", () => {
      const result = computeBillingState(
        makeOrg({ subscriptionStatus: "INCOMPLETE" }),
        NOW
      );
      expect(result.bannerType).toBe("incomplete");
    });
  });

  describe("CANCELED", () => {
    it("retorna null para CANCELED (plano já caiu para FREE via webhook)", () => {
      const result = computeBillingState(
        makeOrg({ plan: "FREE", subscriptionStatus: "CANCELED" }),
        NOW
      );
      expect(result.bannerType).toBeNull();
    });
  });

  describe("GRACE_PERIOD_MS", () => {
    it("é 7 dias em ms", () => {
      expect(GRACE_PERIOD_MS).toBe(7 * 24 * 60 * 60 * 1000);
    });
  });
});

// ─── shouldSendBillingEmail ───────────────────────────────────────────────────

describe("shouldSendBillingEmail", () => {
  it("retorna true quando nunca enviou (lastSentAt = null)", () => {
    expect(shouldSendBillingEmail(null, NOW)).toBe(true);
  });

  it("retorna true quando o cooldown já passou (> 24h)", () => {
    const lastSentAt = new Date(NOW.getTime() - BILLING_EMAIL_COOLDOWN_MS - 1);
    expect(shouldSendBillingEmail(lastSentAt, NOW)).toBe(true);
  });

  it("retorna true exatamente no limite do cooldown (= 24h)", () => {
    const lastSentAt = new Date(NOW.getTime() - BILLING_EMAIL_COOLDOWN_MS);
    expect(shouldSendBillingEmail(lastSentAt, NOW)).toBe(true);
  });

  it("retorna false quando o cooldown ainda está ativo (< 24h)", () => {
    const lastSentAt = new Date(NOW.getTime() - BILLING_EMAIL_COOLDOWN_MS + 1);
    expect(shouldSendBillingEmail(lastSentAt, NOW)).toBe(false);
  });

  it("retorna false quando enviou há 1 hora", () => {
    const lastSentAt = new Date(NOW.getTime() - 60 * 60 * 1000);
    expect(shouldSendBillingEmail(lastSentAt, NOW)).toBe(false);
  });

  it("BILLING_EMAIL_COOLDOWN_MS é 24h em ms", () => {
    expect(BILLING_EMAIL_COOLDOWN_MS).toBe(24 * 60 * 60 * 1000);
  });
});
