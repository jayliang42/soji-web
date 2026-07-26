import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const routeMocks = vi.hoisted(() => ({
  beginBillingEventAttempt: vi.fn(),
  getAdminContext: vi.fn(),
  getStripeClient: vi.fn(),
  markBillingEventFailed: vi.fn(),
  markBillingEventProcessed: vi.fn(),
  reconcileStripeBilling: vi.fn(),
  recordStripeReconciliationAttempt: vi.fn()
}));

vi.mock("@/lib/publisher", () => ({ getAdminContext: routeMocks.getAdminContext }));
vi.mock("@/lib/stripe", () => ({ getStripeClient: routeMocks.getStripeClient }));
vi.mock("@/lib/observability", () => ({ reportOperationalError: vi.fn() }));
vi.mock("@/lib/stripe-reconciliation", () => ({
  reconcileStripeBilling: routeMocks.reconcileStripeBilling
}));
vi.mock("@/lib/stripe-webhook", () => ({
  beginBillingEventAttempt: routeMocks.beginBillingEventAttempt,
  markBillingEventFailed: routeMocks.markBillingEventFailed,
  markBillingEventProcessed: routeMocks.markBillingEventProcessed,
  recordStripeReconciliationAttempt: routeMocks.recordStripeReconciliationAttempt
}));

import { POST } from "@/app/api/admin/billing-events/reconcile/route";

function request(body: unknown) {
  return new Request("http://localhost:3000/api/admin/billing-events/reconcile", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  });
}

describe("admin billing reconciliation route", () => {
  const claimToken = "00000000-0000-4000-8000-000000000777";

  beforeEach(() => {
    for (const mock of Object.values(routeMocks)) {
      mock.mockReset();
    }
    routeMocks.getAdminContext.mockResolvedValue({
      supabase: {},
      user: { id: "user_admin" }
    });
    routeMocks.recordStripeReconciliationAttempt.mockResolvedValue({
      createdAt: "2026-07-13T12:00:00.000Z",
      id: "event_internal_id",
      providerEventId: "reconcile_operation_id"
    });
    routeMocks.beginBillingEventAttempt.mockResolvedValue({
      attemptCount: 1,
      claimed: true,
      claimToken,
      lastAttemptedAt: "2026-07-13T12:00:00.500Z",
      status: "processing"
    });
  });

  it("returns the auth error before parsing input or loading Stripe", async () => {
    routeMocks.getAdminContext.mockResolvedValue({
      error: NextResponse.json(
        { ok: false, reason: "not_authenticated" },
        { status: 401 }
      )
    });

    const response = await POST(request({ identifier: "sub_123" }));

    expect(response.status).toBe(401);
    expect(routeMocks.getStripeClient).not.toHaveBeenCalled();
    expect(routeMocks.recordStripeReconciliationAttempt).not.toHaveBeenCalled();
  });

  it("rejects malformed or over-posted input without recording an operation", async () => {
    const response = await POST(
      request({ identifier: "evt_123", provider: "stripe" })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "invalid_reconciliation_request"
    });
    expect(routeMocks.recordStripeReconciliationAttempt).not.toHaveBeenCalled();
  });

  it("records and completes a successful reconciliation", async () => {
    const stripe = {};
    routeMocks.getStripeClient.mockReturnValue(stripe);
    routeMocks.reconcileStripeBilling.mockResolvedValue({
      identifier: "cus_123",
      kind: "customer",
      staleSubscriptionsClosed: 1,
      subscriptionsSynced: 2
    });
    routeMocks.markBillingEventProcessed.mockResolvedValue(
      "2026-07-13T12:01:00.000Z"
    );

    const response = await POST(request({ identifier: "cus_123" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.event.status).toBe("processed");
    expect(body.event.attemptCount).toBe(1);
    expect(routeMocks.recordStripeReconciliationAttempt).toHaveBeenCalledWith({
      identifier: "cus_123",
      requestedBy: "user_admin"
    });
    expect(routeMocks.reconcileStripeBilling).toHaveBeenCalledWith(
      stripe,
      "cus_123"
    );
    expect(routeMocks.beginBillingEventAttempt).toHaveBeenCalledWith(
      "event_internal_id"
    );
    expect(routeMocks.markBillingEventProcessed).toHaveBeenCalledWith(
      "event_internal_id",
      claimToken
    );
  });

  it("keeps a failed audit record when Stripe is not configured", async () => {
    routeMocks.getStripeClient.mockReturnValue(null);
    routeMocks.markBillingEventFailed.mockResolvedValue("stripe_not_configured");

    const response = await POST(request({ identifier: "sub_123" }));

    expect(response.status).toBe(501);
    expect(await response.json()).toEqual({
      ok: false,
      operationId: "reconcile_operation_id",
      reason: "stripe_not_configured"
    });
    expect(routeMocks.markBillingEventFailed).toHaveBeenCalledWith(
      "event_internal_id",
      expect.any(Error),
      claimToken
    );
    expect(routeMocks.reconcileStripeBilling).not.toHaveBeenCalled();
  });

  it("marks the audit operation failed when Stripe processing fails", async () => {
    routeMocks.getStripeClient.mockReturnValue({});
    routeMocks.reconcileStripeBilling.mockRejectedValue(new Error("stripe_unavailable"));
    routeMocks.markBillingEventFailed.mockResolvedValue("stripe_unavailable");

    const response = await POST(request({ identifier: "sub_123" }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ok: false,
      operationId: "reconcile_operation_id",
      reason: "billing_reconciliation_failed"
    });
    expect(routeMocks.markBillingEventFailed).toHaveBeenCalledWith(
      "event_internal_id",
      expect.any(Error),
      claimToken
    );
  });
});
