import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const routeMocks = vi.hoisted(() => ({
  consumeCheckoutRateLimit: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  getBillingDeliveryReadiness: vi.fn(),
  getCustomerPolicyReadiness: vi.fn(),
  getExistingStripeCustomerId: vi.fn(),
  getStripeClient: vi.fn(),
  reportOperationalError: vi.fn(),
  claimProductCheckout: vi.fn(),
  claimSubscriptionCheckout: vi.fn()
}));

vi.mock("@/lib/billing-readiness", () => ({
  getBillingDeliveryReadiness: routeMocks.getBillingDeliveryReadiness,
  isBillingDeliveryReady: (readiness: {
    stripeWebhookConfigured: boolean;
    supabaseServiceRoleOperational: boolean;
  }) =>
    readiness.stripeWebhookConfigured &&
    readiness.supabaseServiceRoleOperational
}));
vi.mock("@/lib/rate-limit", () => ({
  consumeCheckoutRateLimit: routeMocks.consumeCheckoutRateLimit,
  getRetryAfterSeconds: vi.fn(() => 300)
}));
vi.mock("@/lib/customer-policy", () => ({
  getCustomerPolicyReadiness: routeMocks.getCustomerPolicyReadiness
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: routeMocks.createSupabaseServerClient
}));
vi.mock("@/lib/stripe", () => ({ getStripeClient: routeMocks.getStripeClient }));
vi.mock("@/lib/stripe-customer", () => ({
  getExistingStripeCustomerId: routeMocks.getExistingStripeCustomerId
}));
vi.mock("@/lib/observability", () => ({
  reportOperationalError: routeMocks.reportOperationalError
}));
vi.mock("@/lib/product-checkout", () => ({
  claimProductCheckout: routeMocks.claimProductCheckout
}));
vi.mock("@/lib/subscription-checkout", () => ({
  claimSubscriptionCheckout: routeMocks.claimSubscriptionCheckout
}));

import { POST as createProductCheckout } from "@/app/api/checkout/product/route";
import { POST as createSubscriptionCheckout } from "@/app/api/checkout/subscription/route";

const requestId = "00000000-0000-4000-8000-000000000502";

function request(path: string, body: unknown) {
  return new NextRequest(`http://localhost:3000${path}`, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  });
}

function authenticatedSupabase() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { email: "member@example.com", id: "user_123" } }
      })
    }
  };
}

describe("checkout route rate limiting", () => {
  beforeEach(() => {
    for (const mock of Object.values(routeMocks)) mock.mockReset();
    routeMocks.getStripeClient.mockReturnValue({
      checkout: { sessions: { create: vi.fn() } },
      prices: { list: vi.fn() }
    });
    routeMocks.createSupabaseServerClient.mockResolvedValue(
      authenticatedSupabase()
    );
    routeMocks.getBillingDeliveryReadiness.mockResolvedValue({
      stripeWebhookConfigured: true,
      supabaseServiceRoleOperational: true
    });
    routeMocks.getCustomerPolicyReadiness.mockReturnValue({
      ready: true,
      reasons: [],
      supportUrl: "https://support.soji.co/help"
    });
    routeMocks.getExistingStripeCustomerId.mockResolvedValue(null);
    routeMocks.claimProductCheckout.mockResolvedValue({
      expiresAt: "2026-07-14T12:35:00.000Z",
      ok: true,
      outcome: "claimed"
    });
    routeMocks.claimSubscriptionCheckout.mockResolvedValue({
      expiresAt: "2026-07-14T12:35:00.000Z",
      ok: true,
      outcome: "claimed"
    });
  });

  it("returns 429 before Stripe price lookup for repeated subscription checkout", async () => {
    routeMocks.consumeCheckoutRateLimit.mockResolvedValue({
      allowed: false,
      ok: true,
      remaining: 0,
      resetAt: "2026-07-14T12:05:00.000Z"
    });

    const response = await createSubscriptionCheckout(
      request("/api/checkout/subscription", { planId: "tier_1", requestId })
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("300");
    expect(routeMocks.getStripeClient().prices.list).not.toHaveBeenCalled();
  });

  it("returns 429 before product lookup for repeated product checkout", async () => {
    routeMocks.consumeCheckoutRateLimit.mockResolvedValue({
      allowed: false,
      ok: true,
      remaining: 0,
      resetAt: "2026-07-14T12:05:00.000Z"
    });

    const supabase = authenticatedSupabase();
    const from = vi.fn();
    Object.assign(supabase, { from });
    routeMocks.createSupabaseServerClient.mockResolvedValue(supabase);
    const response = await createProductCheckout(
      request("/api/checkout/product", { productSlug: "template-pack", requestId })
    );

    expect(response.status).toBe(429);
    expect(from).not.toHaveBeenCalled();
  });

  it("returns 503 and reports when the limiter RPC is unavailable", async () => {
    routeMocks.consumeCheckoutRateLimit.mockResolvedValue({
      ok: false,
      reason: "function does not exist"
    });

    const response = await createSubscriptionCheckout(
      request("/api/checkout/subscription", { planId: "tier_1", requestId })
    );

    expect(response.status).toBe(503);
    expect(routeMocks.reportOperationalError).toHaveBeenCalledWith(
      "stripe.checkout.rate_limit_unavailable",
      expect.any(Error),
      { checkoutMode: "subscription" }
    );
  });

  it("uses a stable user-scoped idempotency key for subscription sessions", async () => {
    const create = vi.fn().mockResolvedValue({ url: "https://checkout.test/session" });
    routeMocks.getStripeClient.mockReturnValue({
      checkout: { sessions: { create } },
      prices: {
        list: vi.fn().mockResolvedValue({
          data: [
            {
              active: true,
              currency: "usd",
              id: "price_membership",
              lookup_key: "full_access_monthly",
              recurring: { interval: "month", interval_count: 1 },
              type: "recurring",
              unit_amount: 9900
            }
          ]
        })
      }
    });
    routeMocks.consumeCheckoutRateLimit.mockResolvedValue({
      allowed: true,
      ok: true,
      remaining: 4,
      resetAt: "2026-07-14T12:05:00.000Z"
    });
    routeMocks.getExistingStripeCustomerId.mockResolvedValue("cus_existing");

    const response = await createSubscriptionCheckout(
      request("/api/checkout/subscription", { planId: "tier_1", requestId })
    );

    expect(response.status).toBe(200);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_existing",
        expires_at: 1784032500,
        mode: "subscription"
      }),
      {
        idempotencyKey: `soji:checkout:subscription:user_123:${requestId}`
      }
    );
    expect(create.mock.calls[0]?.[0]).not.toHaveProperty("customer_email");
  });

  it.each([
    [
      "existing_subscription",
      "An existing membership must be managed from your account."
    ],
    [
      "checkout_in_progress",
      "A membership checkout is already in progress. Return to it or try again after it expires."
    ]
  ])("returns 409 before Stripe session creation for %s", async (outcome, error) => {
    const create = vi.fn();
    routeMocks.getStripeClient.mockReturnValue({
      checkout: { sessions: { create } },
      prices: {
        list: vi.fn().mockResolvedValue({
          data: [
            {
              active: true,
              currency: "usd",
              id: "price_membership",
              lookup_key: "full_access_monthly",
              recurring: { interval: "month", interval_count: 1 },
              type: "recurring",
              unit_amount: 9900
            }
          ]
        })
      }
    });
    routeMocks.consumeCheckoutRateLimit.mockResolvedValue({
      allowed: true,
      ok: true,
      remaining: 4,
      resetAt: "2026-07-14T12:05:00.000Z"
    });
    routeMocks.claimSubscriptionCheckout.mockResolvedValue({
      expiresAt: null,
      ok: true,
      outcome
    });

    const response = await createSubscriptionCheckout(
      request("/api/checkout/subscription", { planId: "tier_1", requestId })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error });
    expect(create).not.toHaveBeenCalled();
  });

  it("fails closed when the subscription claim cannot be verified", async () => {
    const create = vi.fn();
    routeMocks.getStripeClient.mockReturnValue({
      checkout: { sessions: { create } },
      prices: {
        list: vi.fn().mockResolvedValue({
          data: [
            {
              active: true,
              currency: "usd",
              id: "price_membership",
              lookup_key: "full_access_monthly",
              recurring: { interval: "month", interval_count: 1 },
              type: "recurring",
              unit_amount: 9900
            }
          ]
        })
      }
    });
    routeMocks.consumeCheckoutRateLimit.mockResolvedValue({
      allowed: true,
      ok: true,
      remaining: 4,
      resetAt: "2026-07-14T12:05:00.000Z"
    });
    routeMocks.claimSubscriptionCheckout.mockResolvedValue({
      ok: false,
      reason: "rpc_unavailable"
    });

    const response = await createSubscriptionCheckout(
      request("/api/checkout/subscription", { planId: "tier_1", requestId })
    );

    expect(response.status).toBe(503);
    expect(create).not.toHaveBeenCalled();
  });

  it("keeps the claim when Stripe session creation has an ambiguous failure", async () => {
    const create = vi.fn().mockRejectedValue(new Error("Stripe unavailable"));
    routeMocks.getStripeClient.mockReturnValue({
      checkout: { sessions: { create } },
      prices: {
        list: vi.fn().mockResolvedValue({
          data: [
            {
              active: true,
              currency: "usd",
              id: "price_membership",
              lookup_key: "full_access_monthly",
              recurring: { interval: "month", interval_count: 1 },
              type: "recurring",
              unit_amount: 9900
            }
          ]
        })
      }
    });
    routeMocks.consumeCheckoutRateLimit.mockResolvedValue({
      allowed: true,
      ok: true,
      remaining: 4,
      resetAt: "2026-07-14T12:05:00.000Z"
    });

    const response = await createSubscriptionCheckout(
      request("/api/checkout/subscription", { planId: "tier_1", requestId })
    );

    expect(response.status).toBe(502);
    expect(routeMocks.claimSubscriptionCheckout).toHaveBeenCalledWith(
      expect.anything(),
      requestId
    );
  });

  it("rejects a mispriced membership before creating a checkout session", async () => {
    const create = vi.fn();
    routeMocks.getStripeClient.mockReturnValue({
      checkout: { sessions: { create } },
      prices: {
        list: vi.fn().mockResolvedValue({
          data: [
            {
              active: true,
              currency: "usd",
              id: "price_wrong_amount",
              lookup_key: "full_access_monthly",
              recurring: { interval: "month", interval_count: 1 },
              type: "recurring",
              unit_amount: 1
            }
          ]
        })
      }
    });
    routeMocks.consumeCheckoutRateLimit.mockResolvedValue({
      allowed: true,
      ok: true,
      remaining: 4,
      resetAt: "2026-07-14T12:05:00.000Z"
    });

    const response = await createSubscriptionCheckout(
      request("/api/checkout/subscription", { planId: "tier_1", requestId })
    );

    expect(response.status).toBe(503);
    expect(create).not.toHaveBeenCalled();
  });

  it("uses a separate user-scoped idempotency key for product sessions", async () => {
    const create = vi.fn().mockResolvedValue({ url: "https://checkout.test/session" });
    routeMocks.getStripeClient.mockReturnValue({
      checkout: { sessions: { create } },
      prices: { list: vi.fn() }
    });
    routeMocks.consumeCheckoutRateLimit.mockResolvedValue({
      allowed: true,
      ok: true,
      remaining: 4,
      resetAt: "2026-07-14T12:05:00.000Z"
    });
    const supabase = authenticatedSupabase();
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        entitlement_id: "product.template-pack",
        id: "product_123",
        is_active: true,
        slug: "template-pack",
        stripe_price_id: "price_product",
        title: "Template pack"
      },
      error: null
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    Object.assign(supabase, { from: vi.fn(() => ({ select })) });
    routeMocks.createSupabaseServerClient.mockResolvedValue(supabase);

    const response = await createProductCheckout(
      request("/api/checkout/product", { productSlug: "template-pack", requestId })
    );

    expect(response.status).toBe(200);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_email: "member@example.com",
        expires_at: 1784032500,
        mode: "payment"
      }),
      {
        idempotencyKey: `soji:checkout:product:user_123:${requestId}`
      }
    );
    expect(create.mock.calls[0]?.[0]).not.toHaveProperty("customer");
  });

  it.each([
    [
      "already_purchased",
      "You already own this product. Access it from your account."
    ],
    [
      "checkout_in_progress",
      "A checkout for this product is already in progress. Return to it or try again after it expires."
    ]
  ])("returns 409 before product session creation for %s", async (outcome, error) => {
    const create = vi.fn();
    routeMocks.getStripeClient.mockReturnValue({
      checkout: { sessions: { create } },
      prices: { list: vi.fn() }
    });
    routeMocks.consumeCheckoutRateLimit.mockResolvedValue({
      allowed: true,
      ok: true,
      remaining: 4,
      resetAt: "2026-07-14T12:05:00.000Z"
    });
    routeMocks.claimProductCheckout.mockResolvedValue({
      expiresAt: outcome === "checkout_in_progress" ? "2026-07-14T12:35:00.000Z" : null,
      ok: true,
      outcome
    });
    const supabase = authenticatedSupabase();
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        entitlement_id: "product.template-pack",
        id: "product_123",
        is_active: true,
        slug: "template-pack",
        stripe_price_id: "price_product",
        title: "Template pack"
      },
      error: null
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    Object.assign(supabase, {
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq })) }))
    });
    routeMocks.createSupabaseServerClient.mockResolvedValue(supabase);

    const response = await createProductCheckout(
      request("/api/checkout/product", { productSlug: "template-pack", requestId })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error });
    expect(create).not.toHaveBeenCalled();
  });

  it("fails closed when the product claim cannot be verified", async () => {
    const create = vi.fn();
    routeMocks.getStripeClient.mockReturnValue({
      checkout: { sessions: { create } },
      prices: { list: vi.fn() }
    });
    routeMocks.consumeCheckoutRateLimit.mockResolvedValue({
      allowed: true,
      ok: true,
      remaining: 4,
      resetAt: "2026-07-14T12:05:00.000Z"
    });
    routeMocks.claimProductCheckout.mockResolvedValue({
      ok: false,
      reason: "rpc_unavailable"
    });
    const supabase = authenticatedSupabase();
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        entitlement_id: "product.template-pack",
        id: "product_123",
        is_active: true,
        slug: "template-pack",
        stripe_price_id: "price_product",
        title: "Template pack"
      },
      error: null
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    Object.assign(supabase, {
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq })) }))
    });
    routeMocks.createSupabaseServerClient.mockResolvedValue(supabase);

    const response = await createProductCheckout(
      request("/api/checkout/product", { productSlug: "template-pack", requestId })
    );

    expect(response.status).toBe(503);
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects a product session without a redirect URL and reports it", async () => {
    const create = vi.fn().mockResolvedValue({ id: "cs_missing_url", url: null });
    routeMocks.getStripeClient.mockReturnValue({
      checkout: { sessions: { create } },
      prices: { list: vi.fn() }
    });
    routeMocks.consumeCheckoutRateLimit.mockResolvedValue({
      allowed: true,
      ok: true,
      remaining: 4,
      resetAt: "2026-07-14T12:05:00.000Z"
    });
    const supabase = authenticatedSupabase();
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        entitlement_id: "product.template-pack",
        id: "product_123",
        is_active: true,
        slug: "template-pack",
        stripe_price_id: "price_product",
        title: "Template pack"
      },
      error: null
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    Object.assign(supabase, {
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq })) }))
    });
    routeMocks.createSupabaseServerClient.mockResolvedValue(supabase);

    const response = await createProductCheckout(
      request("/api/checkout/product", { productSlug: "template-pack", requestId })
    );

    expect(response.status).toBe(502);
    expect(routeMocks.reportOperationalError).toHaveBeenCalledWith(
      "stripe.checkout.session_url_missing",
      expect.any(Error),
      { checkoutMode: "payment", productSlug: "template-pack" }
    );
  });
});
