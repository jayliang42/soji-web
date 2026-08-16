import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import { membershipPlans } from "@soji/domain";
import {
  validateStripeMembershipCatalog,
  validateStripeProductPrice
} from "@/lib/stripe-price-validation";

function stripeWithPrice(price: Partial<Stripe.Price>) {
  return {
    prices: {
      retrieve: vi.fn().mockResolvedValue({
        active: true,
        currency: "usd",
        type: "one_time",
        unit_amount: 7900,
        ...price
      })
    }
  } as unknown as Stripe;
}

function membershipPrice(
  plan = membershipPlans[0],
  overrides: Partial<Stripe.Price> = {}
) {
  return {
    active: true,
    currency: "usd",
    id: `price_${plan.id}`,
    lookup_key: plan.stripePriceLookupKey,
    recurring: null,
    type: "one_time",
    unit_amount: plan.price * 100,
    ...overrides
  } as Stripe.Price;
}

function stripeWithMembershipCatalog(prices: Stripe.Price[]) {
  return {
    prices: {
      list: vi.fn().mockResolvedValue({ data: prices })
    }
  } as unknown as Stripe;
}

describe("Stripe product price validation", () => {
  it("allows an inactive draft without a price", async () => {
    await expect(
      validateStripeProductPrice({
        expectedAmount: 0,
        isActive: false,
        priceId: "",
        stripe: null
      })
    ).resolves.toEqual({ ok: true });
  });

  it("requires active products to have a price", async () => {
    await expect(
      validateStripeProductPrice({
        expectedAmount: 7900,
        isActive: true,
        priceId: "",
        stripe: null
      })
    ).resolves.toMatchObject({
      ok: false,
      reason: "stripe_price_missing",
      status: 400
    });
  });

  it.each([
    [{ active: false }, "stripe_price_inactive"],
    [{ type: "recurring" }, "stripe_price_must_be_one_time"],
    [{ currency: "cad" }, "stripe_price_currency_mismatch"],
    [{ unit_amount: 4900 }, "stripe_price_amount_mismatch"]
  ] as const)("rejects incompatible Stripe price state %#", async (price, reason) => {
    await expect(
      validateStripeProductPrice({
        expectedAmount: 7900,
        isActive: true,
        priceId: "price_test",
        stripe: stripeWithPrice(price)
      })
    ).resolves.toMatchObject({ ok: false, reason, status: 400 });
  });

  it("accepts a matching active one-time USD price", async () => {
    await expect(
      validateStripeProductPrice({
        expectedAmount: 7900,
        isActive: true,
        priceId: "price_test",
        stripe: stripeWithPrice({})
      })
    ).resolves.toEqual({ ok: true });
  });
});

describe("Stripe membership catalog validation", () => {
  it("accepts one active one-time USD price at the exact amount for the full plan", async () => {
    const stripe = stripeWithMembershipCatalog(
      membershipPlans.map((plan) => membershipPrice(plan))
    );

    await expect(
      validateStripeMembershipCatalog({ plans: membershipPlans, stripe })
    ).resolves.toEqual({
      ok: true,
      priceIds: {
        tier_1: "price_tier_1"
      }
    });
  });

  it.each([
    [{ currency: "cad" }, "stripe_membership_price_currency_mismatch"],
    [{ unit_amount: 1 }, "stripe_membership_price_amount_mismatch"],
    [
      { type: "recurring", recurring: { interval: "month", interval_count: 1 } },
      "stripe_membership_price_must_be_one_time"
    ]
  ] as const)("rejects incompatible membership price state %#", async (price, reason) => {
    const plan = membershipPlans[0];
    const stripe = stripeWithMembershipCatalog([
      membershipPrice(plan, price as Partial<Stripe.Price>)
    ]);

    await expect(
      validateStripeMembershipCatalog({ plans: [plan], stripe })
    ).resolves.toEqual({ ok: false, reason });
  });

  it("rejects a missing lookup-key price", async () => {
    await expect(
      validateStripeMembershipCatalog({
        plans: [membershipPlans[0]],
        stripe: stripeWithMembershipCatalog([])
      })
    ).resolves.toEqual({
      ok: false,
      reason: "stripe_membership_price_missing"
    });
  });
});
