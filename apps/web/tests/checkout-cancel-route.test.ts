import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const cancelMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getStripeClient: vi.fn(),
  releaseProductCheckout: vi.fn(),
  releaseSubscriptionCheckout: vi.fn(),
  reportOperationalError: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: cancelMocks.createSupabaseServerClient
}));
vi.mock("@/lib/stripe", () => ({
  getStripeClient: cancelMocks.getStripeClient
}));
vi.mock("@/lib/product-checkout-release", () => ({
  releaseProductCheckout: cancelMocks.releaseProductCheckout
}));
vi.mock("@/lib/subscription-checkout-release", () => ({
  releaseSubscriptionCheckout: cancelMocks.releaseSubscriptionCheckout
}));
vi.mock("@/lib/observability", () => ({
  reportOperationalError: cancelMocks.reportOperationalError
}));

import { POST as cancelCheckout } from "@/app/api/checkout/cancel/route";

const userId = "00000000-0000-4000-8000-000000000101";
const sessionId = "cs_test_checkoutreturn001";
const checkoutExpiresAt = 1_784_032_500;
const checkoutExpiresAtIso = new Date(checkoutExpiresAt * 1000).toISOString();

function request(body: unknown) {
  return new NextRequest("http://localhost:3000/api/checkout/cancel", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
}

function authenticatedSupabase() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null
      })
    }
  };
}

function stripeCheckout({
  clientReferenceId = userId,
  kind = "membership",
  productSlug,
  status = "open"
}: {
  clientReferenceId?: string;
  kind?: "membership" | "product" | null;
  productSlug?: string;
  status?: "complete" | "expired" | "open";
} = {}) {
  const expire = vi.fn().mockResolvedValue({ id: sessionId, status: "expired" });
  const retrieve = vi.fn().mockResolvedValue({
    client_reference_id: clientReferenceId,
    id: sessionId,
    expires_at: checkoutExpiresAt,
    metadata: {
      ...(kind ? { kind } : {}),
      ...(productSlug ? { productSlug } : {}),
      userId
    },
    mode: "payment",
    status
  });

  return {
    expire,
    retrieve,
    stripe: { checkout: { sessions: { expire, retrieve } } }
  };
}

describe("checkout cancellation route", () => {
  beforeEach(() => {
    for (const mock of Object.values(cancelMocks)) mock.mockReset();
    cancelMocks.createSupabaseServerClient.mockResolvedValue(
      authenticatedSupabase()
    );
    cancelMocks.releaseSubscriptionCheckout.mockResolvedValue({
      ok: true,
      released: true
    });
    cancelMocks.releaseProductCheckout.mockResolvedValue({ ok: true, released: true });
  });

  it("rejects malformed checkout session ids before billing work", async () => {
    const response = await cancelCheckout(request({ sessionId: "cs_live_bad!" }));

    expect(response.status).toBe(400);
    expect(cancelMocks.getStripeClient).not.toHaveBeenCalled();
    expect(cancelMocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("expires the current user's open membership Checkout before releasing its retry guard", async () => {
    const { expire, retrieve, stripe } = stripeCheckout();
    cancelMocks.getStripeClient.mockReturnValue(stripe);
    const supabase = authenticatedSupabase();
    cancelMocks.createSupabaseServerClient.mockResolvedValue(supabase);

    const response = await cancelCheckout(request({ sessionId }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "cancelled" });
    expect(retrieve).toHaveBeenCalledWith(sessionId);
    expect(expire).toHaveBeenCalledWith(sessionId);
    expect(cancelMocks.releaseSubscriptionCheckout).toHaveBeenCalledWith(
      supabase,
      checkoutExpiresAtIso
    );
    expect(cancelMocks.releaseProductCheckout).not.toHaveBeenCalled();
    expect(expire.mock.invocationCallOrder[0]).toBeLessThan(
      cancelMocks.releaseSubscriptionCheckout.mock.invocationCallOrder[0]!
    );
  });

  it("does not expire or release a Checkout owned by another account", async () => {
    const { expire, stripe } = stripeCheckout({
      clientReferenceId: "00000000-0000-4000-8000-000000000999"
    });
    cancelMocks.getStripeClient.mockReturnValue(stripe);

    const response = await cancelCheckout(request({ sessionId }));

    expect(response.status).toBe(404);
    expect(expire).not.toHaveBeenCalled();
    expect(cancelMocks.releaseSubscriptionCheckout).not.toHaveBeenCalled();
    expect(cancelMocks.releaseProductCheckout).not.toHaveBeenCalled();
  });

  it("releases only the named product guard after expiring its open Checkout", async () => {
    const { expire, stripe } = stripeCheckout({
      kind: "product",
      productSlug: "case-study-single"
    });
    cancelMocks.getStripeClient.mockReturnValue(stripe);
    const supabase = authenticatedSupabase();
    cancelMocks.createSupabaseServerClient.mockResolvedValue(supabase);

    const response = await cancelCheckout(request({ sessionId }));

    expect(response.status).toBe(200);
    expect(expire).toHaveBeenCalledWith(sessionId);
    expect(cancelMocks.releaseProductCheckout).toHaveBeenCalledWith(
      supabase,
      "case-study-single",
      checkoutExpiresAtIso
    );
    expect(cancelMocks.releaseSubscriptionCheckout).not.toHaveBeenCalled();
  });

  it("releases a legacy product Checkout that predates the kind metadata", async () => {
    const { expire, stripe } = stripeCheckout({
      kind: null,
      productSlug: "case-study-single"
    });
    cancelMocks.getStripeClient.mockReturnValue(stripe);
    const supabase = authenticatedSupabase();
    cancelMocks.createSupabaseServerClient.mockResolvedValue(supabase);

    const response = await cancelCheckout(request({ sessionId }));

    expect(response.status).toBe(200);
    expect(expire).toHaveBeenCalledWith(sessionId);
    expect(cancelMocks.releaseProductCheckout).toHaveBeenCalledWith(
      supabase,
      "case-study-single",
      checkoutExpiresAtIso
    );
  });

  it("does not release a newer checkout intent when the expired Session does not match it", async () => {
    const { expire, stripe } = stripeCheckout();
    cancelMocks.getStripeClient.mockReturnValue(stripe);
    cancelMocks.releaseSubscriptionCheckout.mockResolvedValue({
      ok: true,
      released: false
    });

    const response = await cancelCheckout(request({ sessionId }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "expired" });
    expect(expire).toHaveBeenCalledWith(sessionId);
    expect(cancelMocks.releaseSubscriptionCheckout).toHaveBeenCalledWith(
      expect.anything(),
      checkoutExpiresAtIso
    );
  });

  it("keeps the retry guard closed when Stripe cannot expire the Checkout", async () => {
    const { expire, stripe } = stripeCheckout();
    expire.mockRejectedValue(new Error("Stripe timeout"));
    cancelMocks.getStripeClient.mockReturnValue(stripe);

    const response = await cancelCheckout(request({ sessionId }));

    expect(response.status).toBe(502);
    expect(cancelMocks.releaseSubscriptionCheckout).not.toHaveBeenCalled();
    expect(cancelMocks.releaseProductCheckout).not.toHaveBeenCalled();
  });
});
