import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthSessionMissingError } from "@supabase/supabase-js";

const portalMocks = vi.hoisted(() => ({
  createPortal: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  eq: vi.fn(),
  from: vi.fn(),
  getBillingDeliveryReadiness: vi.fn(),
  getSiteUrl: vi.fn(),
  getStripeClient: vi.fn(),
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
  reportOperationalError: vi.fn(),
  select: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: portalMocks.createSupabaseServerClient
}));
vi.mock("@/lib/stripe", () => ({ getStripeClient: portalMocks.getStripeClient }));
vi.mock("@/lib/env", () => ({ getSiteUrl: portalMocks.getSiteUrl }));
vi.mock("@/lib/observability", () => ({
  reportOperationalError: portalMocks.reportOperationalError
}));
vi.mock("@/lib/billing-readiness", () => ({
  getBillingDeliveryReadiness: portalMocks.getBillingDeliveryReadiness,
  isBillingDeliveryReady: (readiness: {
    stripeWebhookConfigured: boolean;
    supabaseServiceRoleOperational: boolean;
  }) =>
    readiness.stripeWebhookConfigured &&
    readiness.supabaseServiceRoleOperational
}));

import { POST } from "@/app/api/account/billing-portal/route";

const subscriptionId = "00000000-0000-4000-8000-000000000601";

function request(body: unknown) {
  return new Request("http://localhost:3000/api/account/billing-portal", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  });
}

describe("billing portal route", () => {
  beforeEach(() => {
    for (const mock of Object.values(portalMocks)) mock.mockReset();
    portalMocks.getUser.mockResolvedValue({
      data: { user: { id: "user-id" } },
      error: null
    });
    portalMocks.from.mockReturnValue({ select: portalMocks.select });
    portalMocks.select.mockReturnValue({ eq: portalMocks.eq });
    portalMocks.eq
      .mockReturnValueOnce({ eq: portalMocks.eq })
      .mockReturnValueOnce({ eq: portalMocks.eq })
      .mockReturnValueOnce({ maybeSingle: portalMocks.maybeSingle });
    portalMocks.maybeSingle.mockResolvedValue({
      data: { id: subscriptionId, provider_customer_id: "cus_owned" },
      error: null
    });
    portalMocks.createSupabaseServerClient.mockResolvedValue({
      auth: { getUser: portalMocks.getUser },
      from: portalMocks.from
    });
    portalMocks.createPortal.mockResolvedValue({ url: "https://billing.stripe.test/session" });
    portalMocks.getBillingDeliveryReadiness.mockResolvedValue({
      stripeWebhookConfigured: true,
      supabaseServiceRoleOperational: true
    });
    portalMocks.getSiteUrl.mockReturnValue("http://localhost:3000");
    portalMocks.getStripeClient.mockReturnValue({
      billingPortal: { sessions: { create: portalMocks.createPortal } }
    });
  });

  it("rejects malformed identifiers before authentication or Stripe", async () => {
    const response = await POST(request({ subscriptionId: "sub_stripe_id" }));

    expect(response.status).toBe(400);
    expect(portalMocks.getUser).not.toHaveBeenCalled();
    expect(portalMocks.getStripeClient).not.toHaveBeenCalled();
  });

  it("requires an authenticated user", async () => {
    portalMocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await POST(request({ subscriptionId }));

    expect(response.status).toBe(401);
    expect(portalMocks.from).not.toHaveBeenCalled();
  });

  it("treats a missing session as unauthenticated without an alert", async () => {
    portalMocks.getUser.mockResolvedValue({
      data: { user: null },
      error: new AuthSessionMissingError()
    });

    const response = await POST(request({ subscriptionId }));

    expect(response.status).toBe(401);
    expect(portalMocks.from).not.toHaveBeenCalled();
    expect(portalMocks.reportOperationalError).not.toHaveBeenCalled();
  });

  it("returns 503 and records a real authentication failure", async () => {
    const authError = new Error("auth transport unavailable");
    portalMocks.getUser.mockResolvedValue({
      data: { user: null },
      error: authError
    });

    const response = await POST(request({ subscriptionId }));

    expect(response.status).toBe(503);
    expect(portalMocks.reportOperationalError).toHaveBeenCalledWith(
      "billing_portal.auth_lookup_failed",
      authError
    );
  });

  it("binds the requested subscription to the current user before creating a portal", async () => {
    const response = await POST(request({ subscriptionId }));

    expect(response.status).toBe(200);
    expect(portalMocks.eq).toHaveBeenNthCalledWith(1, "id", subscriptionId);
    expect(portalMocks.eq).toHaveBeenNthCalledWith(2, "user_id", "user-id");
    expect(portalMocks.eq).toHaveBeenNthCalledWith(3, "provider", "stripe");
    expect(portalMocks.createPortal).toHaveBeenCalledWith({
      customer: "cus_owned",
      return_url: "http://localhost:3000/account"
    });
    expect(await response.json()).toEqual({
      ok: true,
      url: "https://billing.stripe.test/session"
    });
  });

  it("does not create a portal for an unowned or unmapped subscription", async () => {
    portalMocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    const response = await POST(request({ subscriptionId }));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "billing_customer_not_found"
    });
    expect(portalMocks.createPortal).not.toHaveBeenCalled();
  });

  it("does not call Stripe when the production return origin is invalid", async () => {
    portalMocks.getSiteUrl.mockReturnValue(null);

    const response = await POST(request({ subscriptionId }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "site_url_not_configured"
    });
    expect(portalMocks.createPortal).not.toHaveBeenCalled();
  });

  it("does not open Portal when billing changes cannot be received", async () => {
    portalMocks.getBillingDeliveryReadiness.mockResolvedValue({
      stripeWebhookConfigured: false,
      supabaseServiceRoleOperational: true
    });

    const response = await POST(request({ subscriptionId }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "billing_delivery_unavailable"
    });
    expect(portalMocks.getStripeClient).not.toHaveBeenCalled();
    expect(portalMocks.createPortal).not.toHaveBeenCalled();
  });

  it("suppresses Stripe portal creation details and records them operationally", async () => {
    const stripeError = new Error("sensitive Stripe portal detail");
    portalMocks.createPortal.mockRejectedValue(stripeError);

    const response = await POST(request({ subscriptionId }));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "billing_portal_unavailable"
    });
    expect(portalMocks.reportOperationalError).toHaveBeenCalledWith(
      "billing_portal.session_create_failed",
      stripeError,
      { subscriptionId, userId: "user-id" }
    );
  });
});
