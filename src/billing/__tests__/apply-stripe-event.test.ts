/**
 * Unit tests para src/server/use-cases/stripe/apply-stripe-event.ts
 * Não usa banco de dados — função pura apenas.
 */

import type Stripe from "stripe";
import {
  parseStripeEvent,
  stripeStatusToSubscriptionStatus,
} from "../../server/use-cases/stripe/apply-stripe-event";

// ─── Helpers de fixture ───────────────────────────────────────────────────────

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.STRIPE_PRICE_ID_PRO = "price_pro_test";
  process.env.STRIPE_PRICE_ID_BUSINESS = "price_business_test";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

function makeEvent<T>(
  type: Stripe.Event.Type,
  object: T
): Stripe.Event {
  return {
    id: "evt_test_123",
    object: "event",
    api_version: "2024-06-20",
    created: Math.floor(Date.now() / 1000),
    type,
    data: { object: object as Stripe.Event.Data["object"] },
    livemode: false,
    pending_webhooks: 0,
    request: null,
  } as Stripe.Event;
}

function makeSubscription(
  overrides: Partial<{
    id: string;
    customer: string;
    status: Stripe.Subscription.Status;
    priceId: string | null;
  }> = {}
): Stripe.Subscription {
  const priceId = overrides.priceId ?? "price_pro_test";
  return {
    id: overrides.id ?? "sub_test_123",
    object: "subscription",
    customer: overrides.customer ?? "cus_test_123",
    status: overrides.status ?? "active",
    items: {
      object: "list",
      data: priceId
        ? [{ id: "si_test", price: { id: priceId } as Stripe.Price } as Stripe.SubscriptionItem]
        : [],
      has_more: false,
      url: "",
    },
  } as unknown as Stripe.Subscription;
}

function makeInvoice(
  customerId: string
): Stripe.Invoice {
  return {
    id: "in_test_123",
    object: "invoice",
    customer: customerId,
  } as unknown as Stripe.Invoice;
}

// ─── stripeStatusToSubscriptionStatus ────────────────────────────────────────

describe("stripeStatusToSubscriptionStatus", () => {
  it.each([
    ["active", "ACTIVE"],
    ["past_due", "PAST_DUE"],
    ["canceled", "CANCELED"],
    ["incomplete", "INCOMPLETE"],
    ["trialing", "TRIALING"],
  ] as const)("mapeia '%s' → '%s'", (stripeStatus, expected) => {
    expect(stripeStatusToSubscriptionStatus(stripeStatus)).toBe(expected);
  });

  it("retorna null para status desconhecido", () => {
    expect(
      stripeStatusToSubscriptionStatus("incomplete_expired" as Stripe.Subscription.Status)
    ).toBeNull();
  });

  it("retorna null para 'paused'", () => {
    expect(
      stripeStatusToSubscriptionStatus("paused" as Stripe.Subscription.Status)
    ).toBeNull();
  });
});

// ─── parseStripeEvent — checkout.session.completed ───────────────────────────

describe("checkout.session.completed", () => {
  it("resolve por orgId quando metadata.orgId está presente", () => {
    const session = {
      id: "cs_test_123",
      object: "checkout.session",
      customer: "cus_test_123",
      subscription: "sub_test_123",
      metadata: { orgId: "org_abc" },
    } as unknown as Stripe.Checkout.Session;

    const result = parseStripeEvent(
      makeEvent("checkout.session.completed", session)
    );

    expect(result).not.toBeNull();
    expect(result!.resolver).toEqual({ by: "orgId", orgId: "org_abc" });
    expect(result!.update.stripeCustomerId).toBe("cus_test_123");
    expect(result!.update.stripeSubscriptionId).toBe("sub_test_123");
  });

  it("retorna null quando metadata.orgId está ausente (sessão de terceiros)", () => {
    const session = {
      id: "cs_test_456",
      object: "checkout.session",
      customer: "cus_test_123",
      metadata: {},
    } as unknown as Stripe.Checkout.Session;

    const result = parseStripeEvent(
      makeEvent("checkout.session.completed", session)
    );

    expect(result).toBeNull();
  });

  it("não inclui stripeCustomerId se customer não for string", () => {
    const session = {
      id: "cs_test_789",
      object: "checkout.session",
      customer: { id: "cus_expanded", object: "customer" }, // expandido
      subscription: null,
      metadata: { orgId: "org_abc" },
    } as unknown as Stripe.Checkout.Session;

    const result = parseStripeEvent(
      makeEvent("checkout.session.completed", session)
    );

    expect(result).not.toBeNull();
    expect(result!.update.stripeCustomerId).toBeUndefined();
  });
});

// ─── parseStripeEvent — customer.subscription.created/updated ────────────────

describe("customer.subscription.created / customer.subscription.updated", () => {
  it.each(["customer.subscription.created", "customer.subscription.updated"] as const)(
    "%s — resolve por stripeCustomerId e mapeia plano PRO",
    (eventType) => {
      const sub = makeSubscription({ priceId: "price_pro_test" });
      const result = parseStripeEvent(makeEvent(eventType, sub));

      expect(result).not.toBeNull();
      expect(result!.resolver).toEqual({
        by: "stripeCustomerId",
        stripeCustomerId: "cus_test_123",
      });
      expect(result!.update.plan).toBe("PRO");
      expect(result!.update.subscriptionStatus).toBe("ACTIVE");
      expect(result!.update.stripeSubscriptionId).toBe("sub_test_123");
      expect(result!.update.stripePriceId).toBe("price_pro_test");
    }
  );

  it("mapeia plano BUSINESS", () => {
    const sub = makeSubscription({ priceId: "price_business_test" });
    const result = parseStripeEvent(
      makeEvent("customer.subscription.updated", sub)
    );

    expect(result!.update.plan).toBe("BUSINESS");
  });

  it("fallback para FREE quando priceId desconhecido", () => {
    const sub = makeSubscription({ priceId: "price_unknown" });
    const result = parseStripeEvent(
      makeEvent("customer.subscription.updated", sub)
    );

    expect(result!.update.plan).toBe("FREE");
  });

  it("mapeia status past_due → PAST_DUE", () => {
    const sub = makeSubscription({ status: "past_due" });
    const result = parseStripeEvent(
      makeEvent("customer.subscription.updated", sub)
    );

    expect(result!.update.subscriptionStatus).toBe("PAST_DUE");
  });

  it("aceita customer expandido (objeto) e extrai o id", () => {
    const sub = makeSubscription();
    // @ts-expect-error: simulando customer expandido
    sub.customer = { id: "cus_expanded_123", object: "customer" };

    const result = parseStripeEvent(
      makeEvent("customer.subscription.updated", sub)
    );

    expect(result!.resolver).toEqual({
      by: "stripeCustomerId",
      stripeCustomerId: "cus_expanded_123",
    });
  });
});

// ─── parseStripeEvent — customer.subscription.deleted ────────────────────────

describe("customer.subscription.deleted", () => {
  it("reseta plano para FREE e status CANCELED", () => {
    const sub = makeSubscription();
    const result = parseStripeEvent(
      makeEvent("customer.subscription.deleted", sub)
    );

    expect(result).not.toBeNull();
    expect(result!.resolver).toEqual({
      by: "stripeCustomerId",
      stripeCustomerId: "cus_test_123",
    });
    expect(result!.update.plan).toBe("FREE");
    expect(result!.update.subscriptionStatus).toBe("CANCELED");
    expect(result!.update.stripeSubscriptionId).toBeNull();
    expect(result!.update.stripePriceId).toBeNull();
    expect(result!.update.currentPeriodEnd).toBeNull();
  });
});

// ─── parseStripeEvent — invoice.paid ─────────────────────────────────────────

describe("invoice.paid", () => {
  it("resolve por stripeCustomerId e seta status ACTIVE", () => {
    const invoice = makeInvoice("cus_test_123");
    const result = parseStripeEvent(makeEvent("invoice.paid", invoice));

    expect(result).not.toBeNull();
    expect(result!.resolver).toEqual({
      by: "stripeCustomerId",
      stripeCustomerId: "cus_test_123",
    });
    expect(result!.update.subscriptionStatus).toBe("ACTIVE");
    // invoice.paid não altera o plano
    expect(result!.update.plan).toBeUndefined();
  });
});

// ─── parseStripeEvent — invoice.payment_failed ───────────────────────────────

describe("invoice.payment_failed", () => {
  it("resolve por stripeCustomerId e seta status PAST_DUE", () => {
    const invoice = makeInvoice("cus_test_456");
    const result = parseStripeEvent(makeEvent("invoice.payment_failed", invoice));

    expect(result).not.toBeNull();
    expect(result!.resolver).toEqual({
      by: "stripeCustomerId",
      stripeCustomerId: "cus_test_456",
    });
    expect(result!.update.subscriptionStatus).toBe("PAST_DUE");
    expect(result!.update.plan).toBeUndefined();
  });
});

// ─── parseStripeEvent — eventos não tratados ─────────────────────────────────

describe("eventos não tratados", () => {
  it("retorna null para customer.created", () => {
    const result = parseStripeEvent(
      makeEvent("customer.created", { id: "cus_test" })
    );
    expect(result).toBeNull();
  });

  it("retorna null para payment_intent.succeeded", () => {
    const result = parseStripeEvent(
      makeEvent("payment_intent.succeeded", { id: "pi_test" })
    );
    expect(result).toBeNull();
  });
});
