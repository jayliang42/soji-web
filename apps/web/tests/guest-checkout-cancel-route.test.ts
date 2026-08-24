import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const cancelMocks = vi.hoisted(() => ({
  closeGuestMembershipCheckout: vi.fn(),
  getGuestCheckoutBrowser: vi.fn(),
  getGuestCheckoutRequestId: vi.fn(),
  getGuestMembershipCheckoutForCancel: vi.fn(),
  getStripeClient: vi.fn(),
  reportOperationalError: vi.fn()
}));

vi.mock("@/lib/guest-membership-checkout", () => ({
  closeGuestMembershipCheckout: cancelMocks.closeGuestMembershipCheckout,
  getGuestCheckoutBrowser: cancelMocks.getGuestCheckoutBrowser,
  getGuestCheckoutRequestId: cancelMocks.getGuestCheckoutRequestId,
  getGuestMembershipCheckoutForCancel:
    cancelMocks.getGuestMembershipCheckoutForCancel
}));
vi.mock("@/lib/stripe", () => ({
  getStripeClient: cancelMocks.getStripeClient
}));
vi.mock("@/lib/observability", () => ({
  reportOperationalError: cancelMocks.reportOperationalError
}));

import { POST } from "@/app/api/checkout/guest-cancel/route";

const browserHmac = "a".repeat(64);
const checkoutId = "00000000-0000-4000-8000-000000000701";
const requestId = "00000000-0000-4000-8000-000000000702";
const sessionId = "cs_test_guest_checkout_cancel";

function request() {
  return new NextRequest("http://localhost:3000/api/checkout/guest-cancel", {
    body: JSON.stringify({ requestId }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
}

function stripeCheckout({
  clientReferenceId = checkoutId,
  guestCheckoutId = checkoutId,
  kind = "guest_membership",
  paymentStatus = "unpaid",
  status = "open"
}: {
  clientReferenceId?: string;
  guestCheckoutId?: string;
  kind?: string;
  paymentStatus?: "no_payment_required" | "paid" | "unpaid";
  status?: "complete" | "expired" | "open";
} = {}) {
  const expire = vi.fn().mockResolvedValue({ id: sessionId, status: "expired" });
  const retrieve = vi.fn().mockResolvedValue({
    client_reference_id: clientReferenceId,
    id: sessionId,
    metadata: { guestCheckoutId, kind },
    mode: "payment",
    payment_status: paymentStatus,
    status
  });

  return {
    expire,
    retrieve,
    stripe: { checkout: { sessions: { expire, retrieve } } }
  };
}

describe("guest checkout cancellation route", () => {
  beforeEach(() => {
    for (const mock of Object.values(cancelMocks)) mock.mockReset();

    cancelMocks.getGuestCheckoutBrowser.mockReturnValue({
      browserHmac,
      browserId: "00000000-0000-4000-8000-000000000703"
    });
    cancelMocks.getGuestCheckoutRequestId.mockReturnValue(requestId);
    cancelMocks.getGuestMembershipCheckoutForCancel.mockResolvedValue({
      checkoutId,
      expiresAt: "2026-08-24T06:35:00.000Z",
      ok: true,
      sessionId,
      status: "created"
    });
    cancelMocks.closeGuestMembershipCheckout.mockResolvedValue({
      ok: true,
      status: "cancelled"
    });

    const { stripe } = stripeCheckout();
    cancelMocks.getStripeClient.mockReturnValue(stripe);
  });

  it("expires an open owned Session, closes the database record, and clears the request cookie", async () => {
    const { expire, retrieve, stripe } = stripeCheckout();
    cancelMocks.getStripeClient.mockReturnValue(stripe);

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "cancelled" });
    expect(cancelMocks.getGuestMembershipCheckoutForCancel).toHaveBeenCalledWith({
      browserHmac,
      requestId
    });
    expect(retrieve).toHaveBeenCalledWith(sessionId);
    expect(expire).toHaveBeenCalledWith(sessionId);
    expect(cancelMocks.closeGuestMembershipCheckout).toHaveBeenCalledWith({
      browserHmac,
      observedAt: expect.any(String),
      reason: "cancelled",
      requestId
    });
    expect(expire.mock.invocationCallOrder[0]).toBeLessThan(
      cancelMocks.closeGuestMembershipCheckout.mock.invocationCallOrder[0]!
    );

    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("soji_guest_checkout_request=;");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("Max-Age=0");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=lax");
  });

  it("returns 404 when the browser cookie is missing", async () => {
    cancelMocks.getGuestCheckoutBrowser.mockReturnValue(null);

    const response = await POST(request());

    expect(response.status).toBe(404);
    expect(cancelMocks.getGuestMembershipCheckoutForCancel).not.toHaveBeenCalled();
    expect(cancelMocks.getStripeClient).not.toHaveBeenCalled();
    expect(cancelMocks.closeGuestMembershipCheckout).not.toHaveBeenCalled();
  });

  it("returns 400 when the unguessable cancel selector is missing", async () => {
    const response = await POST(
      new NextRequest("http://localhost:3000/api/checkout/guest-cancel", {
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
        method: "POST"
      })
    );

    expect(response.status).toBe(400);
    expect(cancelMocks.getGuestMembershipCheckoutForCancel).not.toHaveBeenCalled();
  });

  it("does not clear a newer checkout selector cookie", async () => {
    cancelMocks.getGuestCheckoutRequestId.mockReturnValue(
      "00000000-0000-4000-8000-000000000799"
    );

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it.each([
    ["client reference", { clientReferenceId: `${checkoutId}-other` }],
    ["guest checkout metadata", { guestCheckoutId: `${checkoutId}-other` }],
    ["kind metadata", { kind: "membership" }]
  ])("returns 404 when Stripe %s does not match", async (_, overrides) => {
    const { expire, stripe } = stripeCheckout(overrides);
    cancelMocks.getStripeClient.mockReturnValue(stripe);

    const response = await POST(request());

    expect(response.status).toBe(404);
    expect(expire).not.toHaveBeenCalled();
    expect(cancelMocks.closeGuestMembershipCheckout).not.toHaveBeenCalled();
  });

  it.each([
    ["complete", "complete", "unpaid"],
    ["paid", "open", "paid"],
    ["payment-free", "open", "no_payment_required"]
  ] as const)("returns 409 for a %s Session", async (_, status, paymentStatus) => {
    const { expire, stripe } = stripeCheckout({ paymentStatus, status });
    cancelMocks.getStripeClient.mockReturnValue(stripe);

    const response = await POST(request());

    expect(response.status).toBe(409);
    expect(expire).not.toHaveBeenCalled();
    expect(cancelMocks.closeGuestMembershipCheckout).not.toHaveBeenCalled();
  });

  it("returns 502 and keeps the database record open when Stripe expiration fails", async () => {
    const { expire, stripe } = stripeCheckout();
    expire.mockRejectedValue(new Error("Stripe timeout"));
    cancelMocks.getStripeClient.mockReturnValue(stripe);

    const response = await POST(request());

    expect(response.status).toBe(502);
    expect(cancelMocks.closeGuestMembershipCheckout).not.toHaveBeenCalled();
    expect(cancelMocks.reportOperationalError).toHaveBeenCalledWith(
      "stripe.checkout.guest_cancel_expire_failed",
      expect.any(Error)
    );
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
