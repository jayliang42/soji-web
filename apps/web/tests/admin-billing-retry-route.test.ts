import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const retryMocks = vi.hoisted(() => ({
  beginBillingEventAttempt: vi.fn(),
  eq: vi.fn(),
  from: vi.fn(),
  getAdminContext: vi.fn(),
  getStripeClient: vi.fn(),
  markBillingEventFailed: vi.fn(),
  markBillingEventIgnored: vi.fn(),
  markBillingEventProcessed: vi.fn(),
  maybeSingle: vi.fn(),
  processStripeEvent: vi.fn(),
  reconcileStripeBilling: vi.fn(),
  reportOperationalError: vi.fn(),
  retrieve: vi.fn(),
  select: vi.fn()
}));

vi.mock("@/lib/publisher", () => ({ getAdminContext: retryMocks.getAdminContext }));
vi.mock("@/lib/stripe", () => ({ getStripeClient: retryMocks.getStripeClient }));
vi.mock("@/lib/observability", () => ({
  reportOperationalError: retryMocks.reportOperationalError
}));
vi.mock("@/lib/stripe-reconciliation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/stripe-reconciliation")>()),
  reconcileStripeBilling: retryMocks.reconcileStripeBilling
}));
vi.mock("@/lib/stripe-webhook", () => ({
  beginBillingEventAttempt: retryMocks.beginBillingEventAttempt,
  markBillingEventFailed: retryMocks.markBillingEventFailed,
  markBillingEventIgnored: retryMocks.markBillingEventIgnored,
  markBillingEventProcessed: retryMocks.markBillingEventProcessed,
  processStripeEvent: retryMocks.processStripeEvent
}));

import { POST } from "@/app/api/admin/billing-events/[id]/retry/route";

describe("admin billing retry authorization", () => {
  const claimToken = "00000000-0000-4000-8000-000000000777";
  const billingEventRow = {
    attempt_count: 1,
    created_at: "2026-07-14T11:59:00.000Z",
    event_type: "checkout.session.completed",
    id: "00000000-0000-4000-8000-000000000501",
    last_attempted_at: "2026-07-14T11:59:01.000Z",
    payload: {
      customerId: "cus_test",
      id: "evt_test",
      objectId: "sub_test",
      objectType: "subscription",
      subscriptionId: "sub_test",
      type: "checkout.session.completed"
    },
    processed_at: null,
    processing_error: "stripe_api_failed",
    processing_started_at: null,
    provider: "stripe",
    provider_event_id: "evt_test",
    status: "failed"
  } as const;

  beforeEach(() => {
    for (const mock of Object.values(retryMocks)) mock.mockReset();
    retryMocks.from.mockReturnValue({ select: retryMocks.select });
    retryMocks.select.mockReturnValue({ eq: retryMocks.eq });
    retryMocks.eq.mockReturnValue({ maybeSingle: retryMocks.maybeSingle });
    retryMocks.maybeSingle.mockResolvedValue({
      data: billingEventRow,
      error: null
    });
    retryMocks.getAdminContext.mockResolvedValue({
      supabase: { from: retryMocks.from },
      user: { id: "admin-id" }
    });
    retryMocks.getStripeClient.mockReturnValue({ events: { retrieve: retryMocks.retrieve } });
    retryMocks.retrieve.mockResolvedValue({ id: "evt_test" });
    retryMocks.beginBillingEventAttempt.mockResolvedValue({
      attemptCount: 2,
      claimed: true,
      claimToken,
      lastAttemptedAt: "2026-07-14T12:00:00.000Z",
      status: "processing"
    });
    retryMocks.processStripeEvent.mockResolvedValue({ action: "synced" });
    retryMocks.reconcileStripeBilling.mockResolvedValue({
      identifier: "cus_test",
      kind: "customer",
      staleSubscriptionsClosed: 0,
      subscriptionsSynced: 1
    });
    retryMocks.markBillingEventProcessed.mockResolvedValue(
      "2026-07-14T12:00:01.000Z"
    );
    retryMocks.markBillingEventFailed.mockResolvedValue("stripe_api_failed");
  });

  const params = {
    params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000501" })
  };

  it("returns the authentication error before loading Stripe", async () => {
    retryMocks.getAdminContext.mockResolvedValue({
      error: NextResponse.json(
        { ok: false, reason: "not_authenticated" },
        { status: 401 }
      )
    });

    const response = await POST(new Request("http://localhost:3000"), params);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "not_authenticated"
    });
    expect(retryMocks.getStripeClient).not.toHaveBeenCalled();
  });

  it("records a new attempt before loading and processing the Stripe event", async () => {
    const response = await POST(new Request("http://localhost:3000"), params);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      event: {
        attemptCount: 2,
        customerId: "cus_test",
        id: billingEventRow.id,
        lastAttemptedAt: "2026-07-14T12:00:00.000Z",
        processedAt: "2026-07-14T12:00:01.000Z",
        processingError: null,
        processingStartedAt: null,
        status: "processed",
        subscriptionId: "sub_test"
      },
      ok: true
    });
    expect(retryMocks.beginBillingEventAttempt).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000501"
    );
    expect(retryMocks.retrieve).toHaveBeenCalledAfter(
      retryMocks.beginBillingEventAttempt
    );
    expect(retryMocks.markBillingEventProcessed).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000501",
      claimToken
    );
  });

  it("returns and stores ignored when a retried event has no handler", async () => {
    retryMocks.processStripeEvent.mockResolvedValue({ action: "ignored" });
    retryMocks.markBillingEventIgnored.mockResolvedValue(
      "2026-07-14T12:00:01.000Z"
    );

    const response = await POST(new Request("http://localhost:3000"), params);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      event: {
        attemptCount: 2,
        lastAttemptedAt: "2026-07-14T12:00:00.000Z",
        processedAt: "2026-07-14T12:00:01.000Z",
        status: "ignored"
      },
      ok: true
    });
    expect(retryMocks.markBillingEventIgnored).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000501",
      claimToken
    );
    expect(retryMocks.markBillingEventProcessed).not.toHaveBeenCalled();
  });

  it("rejects a retry while another worker owns an active lease", async () => {
    retryMocks.beginBillingEventAttempt.mockResolvedValue({
      claimed: false,
      status: "processing"
    });

    const response = await POST(new Request("http://localhost:3000"), params);

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "event_processing_in_progress"
    });
    expect(retryMocks.retrieve).not.toHaveBeenCalled();
  });

  it("retries an Admin reconciliation from its stored Stripe identifier", async () => {
    retryMocks.maybeSingle.mockResolvedValue({
      data: {
        ...billingEventRow,
        event_type: "admin.billing.reconcile",
        payload: { identifier: "cus_test", requestedBy: "admin-id" },
        provider_event_id: "reconcile_operation_id"
      },
      error: null
    });

    const response = await POST(new Request("http://localhost:3000"), params);

    expect(response.status).toBe(200);
    expect(retryMocks.reconcileStripeBilling).toHaveBeenCalledWith(
      retryMocks.getStripeClient.mock.results[0].value,
      "cus_test"
    );
    expect(retryMocks.retrieve).not.toHaveBeenCalled();
    expect(retryMocks.processStripeEvent).not.toHaveBeenCalled();
  });

  it("rejects corrupted reconciliation evidence before claiming work", async () => {
    retryMocks.maybeSingle.mockResolvedValue({
      data: {
        ...billingEventRow,
        event_type: "admin.billing.reconcile",
        payload: { identifier: "evt_not_supported" },
        provider_event_id: "reconcile_operation_id"
      },
      error: null
    });

    const response = await POST(new Request("http://localhost:3000"), params);

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "billing_reconciliation_payload_invalid"
    });
    expect(retryMocks.beginBillingEventAttempt).not.toHaveBeenCalled();
    expect(retryMocks.reconcileStripeBilling).not.toHaveBeenCalled();
  });

  it("logs lookup details but returns a stable query error", async () => {
    const databaseError = { message: "sensitive database detail" };
    retryMocks.maybeSingle.mockResolvedValue({ data: null, error: databaseError });

    const response = await POST(new Request("http://localhost:3000"), params);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "billing_event_lookup_failed"
    });
    expect(retryMocks.reportOperationalError).toHaveBeenCalledWith(
      "stripe.webhook.retry_lookup_failed",
      databaseError,
      { billingEventId: "00000000-0000-4000-8000-000000000501" }
    );
  });

  it("preserves the receipt and suppresses processing details on retry failure", async () => {
    retryMocks.processStripeEvent.mockRejectedValue(
      new Error("sensitive processing detail")
    );

    const response = await POST(new Request("http://localhost:3000"), params);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      event: {
        attemptCount: 2,
        createdAt: "2026-07-14T11:59:00.000Z",
        customerId: "cus_test",
        disputeId: null,
        eventType: "checkout.session.completed",
        id: billingEventRow.id,
        lastAttemptedAt: "2026-07-14T12:00:00.000Z",
        objectId: "sub_test",
        objectType: "subscription",
        paymentId: null,
        processedAt: null,
        processingError: "stripe_api_failed",
        processingStartedAt: null,
        provider: "stripe",
        providerEventId: "evt_test",
        status: "failed",
        subscriptionId: "sub_test"
      },
      ok: false,
      reason: "billing_event_retry_failed"
    });
    expect(retryMocks.markBillingEventFailed).toHaveBeenCalledOnce();
    expect(retryMocks.markBillingEventFailed).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000501",
      expect.any(Error),
      claimToken
    );
  });
});
