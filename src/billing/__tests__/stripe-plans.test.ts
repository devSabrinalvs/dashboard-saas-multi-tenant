/**
 * Unit tests para src/billing/stripe-plans.ts
 * Não usa banco de dados — funções puras apenas.
 */

import { planFromStripePriceId, stripePriceIdFromPlan } from "../stripe-plans";

// Salva e restaura env vars para isolar os testes
const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.STRIPE_PRICE_ID_PRO = "price_pro_test";
  process.env.STRIPE_PRICE_ID_BUSINESS = "price_business_test";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

// ─── planFromStripePriceId ────────────────────────────────────────────────────

describe("planFromStripePriceId", () => {
  it("retorna PRO para o priceId de PRO", () => {
    expect(planFromStripePriceId("price_pro_test")).toBe("PRO");
  });

  it("retorna BUSINESS para o priceId de BUSINESS", () => {
    expect(planFromStripePriceId("price_business_test")).toBe("BUSINESS");
  });

  it("retorna null para priceId desconhecido", () => {
    expect(planFromStripePriceId("price_unknown_xyz")).toBeNull();
  });

  it("retorna null para string vazia", () => {
    expect(planFromStripePriceId("")).toBeNull();
  });

  it("retorna null quando STRIPE_PRICE_ID_PRO não está configurado", () => {
    delete process.env.STRIPE_PRICE_ID_PRO;
    expect(planFromStripePriceId("price_pro_test")).toBeNull();
  });

  it("retorna null quando STRIPE_PRICE_ID_BUSINESS não está configurado", () => {
    delete process.env.STRIPE_PRICE_ID_BUSINESS;
    expect(planFromStripePriceId("price_business_test")).toBeNull();
  });

  it("ainda resolve BUSINESS quando apenas PRO está ausente", () => {
    delete process.env.STRIPE_PRICE_ID_PRO;
    expect(planFromStripePriceId("price_business_test")).toBe("BUSINESS");
  });

  it("ainda resolve PRO quando apenas BUSINESS está ausente", () => {
    delete process.env.STRIPE_PRICE_ID_BUSINESS;
    expect(planFromStripePriceId("price_pro_test")).toBe("PRO");
  });

  it("é case-sensitive (não faz match parcial)", () => {
    expect(planFromStripePriceId("PRICE_PRO_TEST")).toBeNull();
    expect(planFromStripePriceId("price_pro_test_extra")).toBeNull();
  });
});

// ─── stripePriceIdFromPlan ────────────────────────────────────────────────────

describe("stripePriceIdFromPlan", () => {
  it("retorna o priceId de PRO para plano PRO", () => {
    expect(stripePriceIdFromPlan("PRO")).toBe("price_pro_test");
  });

  it("retorna o priceId de BUSINESS para plano BUSINESS", () => {
    expect(stripePriceIdFromPlan("BUSINESS")).toBe("price_business_test");
  });

  it("retorna null para plano FREE", () => {
    expect(stripePriceIdFromPlan("FREE")).toBeNull();
  });

  it("retorna null para PRO quando env var ausente", () => {
    delete process.env.STRIPE_PRICE_ID_PRO;
    expect(stripePriceIdFromPlan("PRO")).toBeNull();
  });

  it("retorna null para BUSINESS quando env var ausente", () => {
    delete process.env.STRIPE_PRICE_ID_BUSINESS;
    expect(stripePriceIdFromPlan("BUSINESS")).toBeNull();
  });

  it("planFromStripePriceId é o inverso de stripePriceIdFromPlan (round-trip PRO)", () => {
    const priceId = stripePriceIdFromPlan("PRO")!;
    expect(planFromStripePriceId(priceId)).toBe("PRO");
  });

  it("planFromStripePriceId é o inverso de stripePriceIdFromPlan (round-trip BUSINESS)", () => {
    const priceId = stripePriceIdFromPlan("BUSINESS")!;
    expect(planFromStripePriceId(priceId)).toBe("BUSINESS");
  });
});
