import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { AuthSessionMissingError } from "@supabase/supabase-js";

const checkoutMocks = vi.hoisted(() => ({
  consumeCheckoutRateLimit: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  getBillingDeliveryReadiness: vi.fn(),
  getCustomerPolicyReadiness: vi.fn(),
  getExistingStripeCustomerId: vi.fn(),
  getSiteUrl: vi.fn(),
  getStripeClient: vi.fn(),
  reportOperationalError: vi.fn(),
  claimProductCheckout: vi.fn(),
  claimSubscriptionCheckout: vi.fn()
}));

vi.mock("@/lib/billing-readiness", () => ({
  getBillingDeliveryReadiness: checkoutMocks.getBillingDeliveryReadiness,
  isBillingDeliveryReady: (readiness: {
    stripeWebhookConfigured: boolean;
    supabaseServiceRoleOperational: boolean;
  }) =>
    readiness.stripeWebhookConfigured &&
    readiness.supabaseServiceRoleOperational
}));
vi.mock("@/lib/rate-limit", () => ({
  consumeCheckoutRateLimit: checkoutMocks.consumeCheckoutRateLimit,
  getRetryAfterSeconds: vi.fn(() => 300)
}));
vi.mock("@/lib/customer-policy", () => ({
  getCheckoutCustomerPolicyReadiness:
    checkoutMocks.getCustomerPolicyReadiness
}));
const requestId = "00000000-0000-4000-8000-000000000501";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: checkoutMocks.createSupabaseServerClient
}));
vi.mock("@/lib/stripe", () => ({
  getStripeClient: checkoutMocks.getStripeClient
}));
vi.mock("@/lib/stripe-customer", () => ({
  getExistingStripeCustomerId: checkoutMocks.getExistingStripeCustomerId
}));
vi.mock("@/lib/env", () => ({
  getSiteUrl: checkoutMocks.getSiteUrl
}));
vi.mock("@/lib/observability", () => ({
  reportOperationalError: checkoutMocks.reportOperationalError
}));
vi.mock("@/lib/subscription-checkout", () => ({
  claimSubscriptionCheckout: checkoutMocks.claimSubscriptionCheckout
}));
vi.mock("@/lib/product-checkout", () => ({
  claimProductCheckout: checkoutMocks.claimProductCheckout
}));

import { POST as createProductCheckout } from "@/app/api/checkout/product/route";
import { POST as createSubscriptionCheckout } from "@/app/api/checkout/subscription/route";

function request(path: string, body: string) {
  return new NextRequest(`http://localhost:3000${path}`, {
    body,
    headers: { "content-type": "application/json" },
    method: "POST"
  });
}

function authenticatedSupabase() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            email: "member@example.com",
            id: "00000000-0000-4000-8000-000000000101"
          }
        },
        error: null
      })
    }
  };
}

function subscriptionStripe() {
  const createCustomer = vi.fn();
  const createSession = vi
    .fn()
    .mockResolvedValue({ url: "https://checkout.stripe.test/session" });
  const listPrices = vi.fn().mockResolvedValue({
    data: [
      {
        active: true,
        currency: "usd",
        id: "price_server_full_access",
        lookup_key: "full_access_once",
        recurring: null,
        type: "one_time",
        unit_amount: 9_900
      }
    ]
  });

  return {
    createCustomer,
    createSession,
    listPrices,
    stripe: {
      checkout: { sessions: { create: createSession } },
      customers: { create: createCustomer },
      prices: { list: listPrices }
    }
  };
}

function productSupabase() {
  const productMaybeSingle = vi.fn().mockResolvedValue({
    data: {
      entitlement_id: "product.wealth_guide",
      id: "product-1",
      is_active: true,
      slug: "wealth-guide",
      stripe_price_id: "price_product",
      title: "Wealth guide"
    },
    error: null
  });
  const productEq = vi.fn(() => ({ maybeSingle: productMaybeSingle }));
  const membershipMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const membershipEq = vi.fn(() => ({
    eq: vi.fn(() => ({
      or: vi.fn(() => ({
        limit: vi.fn(() => ({ maybeSingle: membershipMaybeSingle }))
      }))
    }))
  }));
  const from = vi.fn((table: string) =>
    table === "products"
      ? { select: vi.fn(() => ({ eq: productEq })) }
      : { select: vi.fn(() => ({ eq: membershipEq })) }
  );

  return {
    ...authenticatedSupabase(),
    from
  };
}

describe("checkout route validation", () => {
  beforeEach(() => {
    for (const mock of Object.values(checkoutMocks)) mock.mockReset();
    checkoutMocks.getBillingDeliveryReadiness.mockResolvedValue({
      stripeWebhookConfigured: true,
      supabaseServiceRoleOperational: true
    });
    checkoutMocks.getCustomerPolicyReadiness.mockReturnValue({
      ready: true,
      reasons: [],
      supportUrl: "https://support.soji.co/help"
    });
    checkoutMocks.getSiteUrl.mockReturnValue("http://localhost:3000");
    checkoutMocks.getExistingStripeCustomerId.mockResolvedValue(null);
    checkoutMocks.consumeCheckoutRateLimit.mockResolvedValue({
      allowed: true,
      ok: true
    });
    checkoutMocks.claimSubscriptionCheckout.mockResolvedValue({
      expiresAt: "2026-07-14T12:35:00.000Z",
      ok: true,
      outcome: "claimed"
    });
    checkoutMocks.claimProductCheckout.mockResolvedValue({
      expiresAt: "2026-07-14T12:35:00.000Z",
      ok: true,
      outcome: "claimed"
    });
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await createSubscriptionCheckout(
      request("/api/checkout/subscription", "{bad-json")
    );
    expect(response.status).toBe(400);
    expect(checkoutMocks.getStripeClient).not.toHaveBeenCalled();
  });

  it("rejects client-controlled subscription prices before calling Stripe", async () => {
    const response = await createSubscriptionCheckout(
      request(
        "/api/checkout/subscription",
        JSON.stringify({
          planId: "tier_1",
          priceId: "price_untrusted",
          requestId
        })
      )
    );
    expect(response.status).toBe(400);
    expect(checkoutMocks.getStripeClient).not.toHaveBeenCalled();
  });

  it.each([
    ["priceId", "price_untrusted"],
    ["amount", 1],
    ["currency", "eur"],
    ["successUrl", "https://attacker.example/success"],
    ["cancelUrl", "https://attacker.example/cancel"],
    ["userId", "00000000-0000-4000-8000-000000000999"],
    ["customerId", "cus_attacker"],
    ["metadata", { role: "admin" }],
    ["termsAccepted", true]
  ])(
    "rejects forged subscription %s authority before provider work",
    async (field, value) => {
      const response = await createSubscriptionCheckout(
        request(
          "/api/checkout/subscription",
          JSON.stringify({
            [field]: value,
            planId: "tier_1",
            requestId
          })
        )
      );

      expect(response.status).toBe(400);
      expect(checkoutMocks.getStripeClient).not.toHaveBeenCalled();
      expect(checkoutMocks.getExistingStripeCustomerId).not.toHaveBeenCalled();
      expect(checkoutMocks.claimSubscriptionCheckout).not.toHaveBeenCalled();
    }
  );

  it("uses authenticated identity, the newest bound Customer, canonical URLs, and server plan data", async () => {
    const supabase = authenticatedSupabase();
    const { createCustomer, createSession, listPrices, stripe } =
      subscriptionStripe();
    checkoutMocks.getStripeClient.mockReturnValue(stripe);
    checkoutMocks.createSupabaseServerClient.mockResolvedValue(supabase);
    checkoutMocks.getExistingStripeCustomerId.mockResolvedValue(
      "cus_newest_bound"
    );

    const response = await createSubscriptionCheckout(
      request(
        "/api/checkout/subscription",
        JSON.stringify({ planId: "tier_1", requestId })
      )
    );

    expect(response.status).toBe(200);
    expect(listPrices).toHaveBeenCalledWith({
      active: true,
      limit: 100,
      lookup_keys: ["full_access_once"]
    });
    expect(checkoutMocks.getExistingStripeCustomerId).toHaveBeenCalledWith(
      supabase,
      "00000000-0000-4000-8000-000000000101"
    );
    expect(createCustomer).not.toHaveBeenCalled();
    expect(createSession).toHaveBeenCalledWith(
      {
        allow_promotion_codes: true,
        cancel_url: "http://localhost:3000/pricing?checkout=cancelled",
        client_reference_id: "00000000-0000-4000-8000-000000000101",
        consent_collection: { terms_of_service: "required" },
        customer: "cus_newest_bound",
        custom_text: {
          submit: {
            message:
              "By purchasing, you agree to the GS学院 Terms. This is a one-time $99 payment."
          }
        },
        expires_at: 1_784_032_500,
        line_items: [{ price: "price_server_full_access", quantity: 1 }],
        metadata: {
          kind: "membership",
          lookupKey: "full_access_once",
          planId: "tier_1",
          userId: "00000000-0000-4000-8000-000000000101"
        },
        mode: "payment",
        payment_intent_data: {
          metadata: {
            kind: "membership",
            lookupKey: "full_access_once",
            planId: "tier_1",
            userId: "00000000-0000-4000-8000-000000000101"
          }
        },
        success_url:
          "http://localhost:3000/account?checkout=success&session_id={CHECKOUT_SESSION_ID}"
      },
      {
        idempotencyKey:
          "soji:checkout:membership:00000000-0000-4000-8000-000000000101:00000000-0000-4000-8000-000000000501"
      }
    );
  });

  it("requires hosted Terms consent for one-time product Checkout", async () => {
    const createSession = vi
      .fn()
      .mockResolvedValue({ url: "https://checkout.stripe.test/product" });
    checkoutMocks.getStripeClient.mockReturnValue({
      checkout: { sessions: { create: createSession } }
    });
    checkoutMocks.createSupabaseServerClient.mockResolvedValue(
      productSupabase()
    );

    const response = await createProductCheckout(
      request(
        "/api/checkout/product",
        JSON.stringify({
          productSlug: "wealth-guide",
          requestId,
          returnTo: "pricing"
        })
      )
    );

    expect(response.status).toBe(200);
    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        cancel_url:
          "http://localhost:3000/pricing?purchase=cancelled&product=wealth-guide#case-study-offers",
        consent_collection: { terms_of_service: "required" },
        custom_text: {
          submit: {
            message:
              "By purchasing, you agree to the GS学院 Terms and acknowledge the digital-product refund policy."
          }
        },
        mode: "payment"
      }),
      expect.objectContaining({
        idempotencyKey: expect.stringContaining(requestId)
      })
    );
  });

  it.each([
    [
      "product",
      createProductCheckout,
      "/api/checkout/product",
      { productSlug: "wealth-guide", requestId }
    ],
    [
      "subscription",
      createSubscriptionCheckout,
      "/api/checkout/subscription",
      { planId: "tier_1", requestId }
    ]
  ])(
    "blocks %s Checkout with a stable policy result before provider work",
    async (_mode, handler, path, body) => {
      checkoutMocks.getCustomerPolicyReadiness.mockReturnValue({
        ready: false,
        reasons: ["policies_not_approved"],
        supportUrl: "https://support.soji.co/help"
      });

      const response = await handler(request(path, JSON.stringify(body)));

      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({
        error: "customer_policy_not_ready"
      });
      expect(checkoutMocks.getStripeClient).not.toHaveBeenCalled();
      expect(checkoutMocks.createSupabaseServerClient).not.toHaveBeenCalled();
      expect(checkoutMocks.consumeCheckoutRateLimit).not.toHaveBeenCalled();
      expect(checkoutMocks.claimProductCheckout).not.toHaveBeenCalled();
      expect(checkoutMocks.claimSubscriptionCheckout).not.toHaveBeenCalled();
    }
  );

  it.each([
    [
      "product",
      createProductCheckout,
      "/api/checkout/product",
      { productSlug: "wealth-guide", requestId, termsAccepted: true }
    ],
    [
      "subscription",
      createSubscriptionCheckout,
      "/api/checkout/subscription",
      { planId: "tier_1", requestId, termsAccepted: true }
    ]
  ])(
    "rejects a client-provided consent override for %s Checkout",
    async (_mode, handler, path, body) => {
      const response = await handler(request(path, JSON.stringify(body)));

      expect(response.status).toBe(400);
      expect(checkoutMocks.getCustomerPolicyReadiness).not.toHaveBeenCalled();
      expect(checkoutMocks.getStripeClient).not.toHaveBeenCalled();
    }
  );

  it("creates neither a Customer nor a Session when Customer lookup fails", async () => {
    const { createCustomer, createSession, stripe } = subscriptionStripe();
    checkoutMocks.getStripeClient.mockReturnValue(stripe);
    checkoutMocks.createSupabaseServerClient.mockResolvedValue(
      authenticatedSupabase()
    );
    checkoutMocks.getExistingStripeCustomerId.mockRejectedValue(
      new Error("customer lookup failed")
    );

    const response = await createSubscriptionCheckout(
      request(
        "/api/checkout/subscription",
        JSON.stringify({ planId: "tier_1", requestId })
      )
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Billing account lookup is temporarily unavailable."
    });
    expect(createCustomer).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
    expect(checkoutMocks.claimSubscriptionCheckout).not.toHaveBeenCalled();
  });

  it.each([
    [
      "existing_subscription",
      null,
      "An existing Full Access purchase is already attached to this account."
    ],
    [
      "checkout_in_progress",
      "2026-07-14T12:35:00.000Z",
      "A membership checkout is already in progress. Return to it or try again after it expires."
    ]
  ] as const)(
    "blocks a new Session for a %s claim",
    async (outcome, expiresAt, error) => {
      const { createSession, stripe } = subscriptionStripe();
      checkoutMocks.getStripeClient.mockReturnValue(stripe);
      checkoutMocks.createSupabaseServerClient.mockResolvedValue(
        authenticatedSupabase()
      );
      checkoutMocks.claimSubscriptionCheckout.mockResolvedValue({
        expiresAt,
        ok: true,
        outcome
      });

      const response = await createSubscriptionCheckout(
        request(
          "/api/checkout/subscription",
          JSON.stringify({ planId: "tier_1", requestId })
        )
      );

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error });
      expect(createSession).not.toHaveBeenCalled();
    }
  );

  it("reuses the claim, Stripe idempotency key, and Session for the same opaque request intent", async () => {
    const { createSession, stripe } = subscriptionStripe();
    createSession.mockResolvedValue({
      id: "cs_same_intent",
      url: "https://checkout.stripe.test/cs_same_intent"
    });
    checkoutMocks.getStripeClient.mockReturnValue(stripe);
    checkoutMocks.createSupabaseServerClient.mockResolvedValue(
      authenticatedSupabase()
    );

    const first = await createSubscriptionCheckout(
      request(
        "/api/checkout/subscription",
        JSON.stringify({ planId: "tier_1", requestId })
      )
    );
    const retry = await createSubscriptionCheckout(
      request(
        "/api/checkout/subscription",
        JSON.stringify({ planId: "tier_1", requestId })
      )
    );

    expect(await first.json()).toEqual({
      url: "https://checkout.stripe.test/cs_same_intent"
    });
    expect(await retry.json()).toEqual({
      url: "https://checkout.stripe.test/cs_same_intent"
    });
    expect(checkoutMocks.claimSubscriptionCheckout).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      requestId
    );
    expect(checkoutMocks.claimSubscriptionCheckout).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      requestId
    );
    expect(createSession).toHaveBeenCalledTimes(2);
    expect(createSession.mock.calls[0]?.[1]).toEqual(
      createSession.mock.calls[1]?.[1]
    );
  });

  it("does not create a second Session for a different ambiguous retry", async () => {
    const secondRequestId = "00000000-0000-4000-8000-000000000502";
    const { createSession, stripe } = subscriptionStripe();
    checkoutMocks.getStripeClient.mockReturnValue(stripe);
    checkoutMocks.createSupabaseServerClient.mockResolvedValue(
      authenticatedSupabase()
    );
    checkoutMocks.claimSubscriptionCheckout
      .mockResolvedValueOnce({
        expiresAt: "2026-07-14T12:35:00.000Z",
        ok: true,
        outcome: "claimed"
      })
      .mockResolvedValueOnce({
        expiresAt: "2026-07-14T12:35:00.000Z",
        ok: true,
        outcome: "checkout_in_progress"
      });

    const first = await createSubscriptionCheckout(
      request(
        "/api/checkout/subscription",
        JSON.stringify({ planId: "tier_1", requestId })
      )
    );
    const retry = await createSubscriptionCheckout(
      request(
        "/api/checkout/subscription",
        JSON.stringify({ planId: "tier_1", requestId: secondRequestId })
      )
    );

    expect(first.status).toBe(200);
    expect(retry.status).toBe(409);
    expect(createSession).toHaveBeenCalledTimes(1);
    expect(checkoutMocks.claimSubscriptionCheckout).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      secondRequestId
    );
  });

  it("rejects malformed product slugs before querying Supabase", async () => {
    const response = await createProductCheckout(
      request(
        "/api/checkout/product",
        JSON.stringify({ productSlug: "../admin", requestId })
      )
    );
    expect(response.status).toBe(400);
    expect(checkoutMocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it.each([
    ["product", createProductCheckout, "/api/checkout/product", { productSlug: "wealth-guide", requestId }],
    ["subscription", createSubscriptionCheckout, "/api/checkout/subscription", { planId: "tier_1", requestId }]
  ])("returns 401 for a missing %s checkout session without alerting", async (_mode, handler, path, body) => {
    checkoutMocks.getStripeClient.mockReturnValue({});
    checkoutMocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new AuthSessionMissingError()
        })
      }
    });

    const response = await handler(request(path, JSON.stringify(body)));

    expect(response.status).toBe(401);
    expect(checkoutMocks.reportOperationalError).not.toHaveBeenCalled();
  });

  it("returns 503 when checkout authentication cannot be checked", async () => {
    const authError = new Error("auth transport unavailable");
    checkoutMocks.getStripeClient.mockReturnValue({});
    checkoutMocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: authError
        })
      }
    });

    const response = await createSubscriptionCheckout(
      request(
        "/api/checkout/subscription",
        JSON.stringify({ planId: "tier_1", requestId })
      )
    );

    expect(response.status).toBe(503);
    expect(checkoutMocks.reportOperationalError).toHaveBeenCalledWith(
      "stripe.checkout.auth_lookup_failed",
      authError,
      { checkoutMode: "membership" }
    );
  });

  it("fails closed before billing work when the return origin is invalid", async () => {
    checkoutMocks.getSiteUrl.mockReturnValue(null);
    checkoutMocks.getStripeClient.mockReturnValue({});
    checkoutMocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { email: "member@example.com", id: "user-id" } },
          error: null
        })
      }
    });

    const response = await createProductCheckout(
      request(
        "/api/checkout/product",
        JSON.stringify({ productSlug: "wealth-guide", requestId })
      )
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Checkout return URLs are not configured."
    });
  });

  it.each([
    ["product", createProductCheckout, "/api/checkout/product", { productSlug: "wealth-guide", requestId }],
    ["subscription", createSubscriptionCheckout, "/api/checkout/subscription", { planId: "tier_1", requestId }]
  ])("blocks %s checkout before consuming limits or provider work when receipt delivery is unavailable", async (_mode, handler, path, body) => {
    const create = vi.fn();
    checkoutMocks.getStripeClient.mockReturnValue({
      checkout: { sessions: { create } },
      prices: { list: vi.fn() }
    });
    checkoutMocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { email: "member@example.com", id: "user-id" } },
          error: null
        })
      },
      from: vi.fn()
    });
    checkoutMocks.getBillingDeliveryReadiness.mockResolvedValue({
      stripeWebhookConfigured: false,
      supabaseServiceRoleOperational: true
    });

    const response = await handler(request(path, JSON.stringify(body)));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Checkout is temporarily unavailable."
    });
    expect(checkoutMocks.consumeCheckoutRateLimit).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
