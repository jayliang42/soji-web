import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const webhookMocks = vi.hoisted(() => ({
  beginBillingEventAttempt: vi.fn(),
  createOperationalLog: vi.fn((value) => value),
  env: { STRIPE_WEBHOOK_SECRET: "whsec_test" as string | undefined },
  getStripeClient: vi.fn(),
  isRecoverableIgnoredGuestPaymentEvent: vi.fn(),
  logOperationalEvent: vi.fn(),
  markBillingEventFailed: vi.fn(),
  markBillingEventIgnored: vi.fn(),
  markBillingEventProcessed: vi.fn(),
  processStripeEvent: vi.fn(),
  recordStripeBillingEvent: vi.fn(),
  reportOperationalError: vi.fn()
}));

vi.mock("@/lib/env", () => ({ env: webhookMocks.env }));
vi.mock("@/lib/stripe", () => ({
  getStripeClient: webhookMocks.getStripeClient
}));
vi.mock("@/lib/observability", () => ({
  createOperationalLog: webhookMocks.createOperationalLog,
  logOperationalEvent: webhookMocks.logOperationalEvent,
  reportOperationalError: webhookMocks.reportOperationalError
}));
vi.mock("@/lib/stripe-webhook", () => ({
  beginBillingEventAttempt: webhookMocks.beginBillingEventAttempt,
  markBillingEventFailed: webhookMocks.markBillingEventFailed,
  markBillingEventIgnored: webhookMocks.markBillingEventIgnored,
  markBillingEventProcessed: webhookMocks.markBillingEventProcessed,
  isRecoverableIgnoredGuestPaymentEvent:
    webhookMocks.isRecoverableIgnoredGuestPaymentEvent,
  processStripeEvent: webhookMocks.processStripeEvent,
  recordStripeBillingEvent: webhookMocks.recordStripeBillingEvent
}));

import { POST } from "@/app/api/webhooks/stripe/route";

function request(headers?: HeadersInit) {
  return new NextRequest("http://localhost:3000/api/webhooks/stripe", {
    body: "{}",
    headers,
    method: "POST"
  });
}

describe("Stripe webhook boundary", () => {
  const claimToken = "00000000-0000-4000-8000-000000000777";

  beforeEach(() => {
    webhookMocks.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    webhookMocks.getStripeClient.mockReset();
    webhookMocks.isRecoverableIgnoredGuestPaymentEvent.mockReset();
    webhookMocks.isRecoverableIgnoredGuestPaymentEvent.mockReturnValue(false);
    webhookMocks.createOperationalLog.mockClear();
    webhookMocks.logOperationalEvent.mockClear();
    webhookMocks.reportOperationalError.mockClear();
    webhookMocks.beginBillingEventAttempt.mockReset();
    webhookMocks.markBillingEventFailed.mockReset();
    webhookMocks.markBillingEventIgnored.mockReset();
    webhookMocks.markBillingEventProcessed.mockReset();
    webhookMocks.processStripeEvent.mockReset();
    webhookMocks.recordStripeBillingEvent.mockReset();
  });

  function configuredStripe(event: { id: string; type: string }) {
    return {
      webhooks: { constructEvent: vi.fn(() => event) }
    };
  }

  it("does not acknowledge delivery when signature verification is unavailable", async () => {
    webhookMocks.getStripeClient.mockReturnValue(null);

    const response = await POST(request());

    expect(response.status).toBe(501);
    expect(await response.json()).toEqual({ error: "Webhook not configured" });
  });

  it("does not expose the Stripe SDK signature error", async () => {
    webhookMocks.getStripeClient.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn(() => {
          throw new Error("sensitive SDK verification details");
        })
      }
    });

    const response = await POST(request({ "stripe-signature": "bad_signature" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_stripe_signature" });
    expect(webhookMocks.logOperationalEvent).toHaveBeenCalledOnce();
  });

  it("records an ignored outcome only after the signed receipt is durable", async () => {
    const event = { id: "evt_success", type: "checkout.session.completed" };
    webhookMocks.getStripeClient.mockReturnValue(configuredStripe(event));
    webhookMocks.recordStripeBillingEvent.mockResolvedValue({
      duplicate: false,
      event: { id: "receipt-id", processed_at: null, status: "received" }
    });
    webhookMocks.beginBillingEventAttempt.mockResolvedValue({
      attemptCount: 1,
      claimed: true,
      claimToken,
      lastAttemptedAt: "2026-07-14T12:00:00.000Z",
      status: "processing"
    });
    webhookMocks.processStripeEvent.mockResolvedValue({ action: "ignored" });
    webhookMocks.markBillingEventIgnored.mockResolvedValue(
      "2026-07-14T12:00:01.000Z"
    );

    const response = await POST(request({ "stripe-signature": "valid" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ received: true });
    expect(webhookMocks.recordStripeBillingEvent).toHaveBeenCalledWith(event);
    expect(webhookMocks.beginBillingEventAttempt).toHaveBeenCalledWith("receipt-id");
    expect(webhookMocks.processStripeEvent).toHaveBeenCalledAfter(
      webhookMocks.beginBillingEventAttempt
    );
    expect(webhookMocks.markBillingEventIgnored).toHaveBeenCalledWith(
      "receipt-id",
      claimToken
    );
    expect(webhookMocks.markBillingEventProcessed).not.toHaveBeenCalled();
  });

  it("settles handled events as processed", async () => {
    const event = { id: "evt_processed", type: "checkout.session.completed" };
    webhookMocks.getStripeClient.mockReturnValue(configuredStripe(event));
    webhookMocks.recordStripeBillingEvent.mockResolvedValue({
      duplicate: false,
      event: { id: "receipt-id", processed_at: null, status: "received" }
    });
    webhookMocks.beginBillingEventAttempt.mockResolvedValue({
      attemptCount: 1,
      claimed: true,
      claimToken,
      lastAttemptedAt: "2026-07-14T12:00:00.000Z",
      status: "processing"
    });
    webhookMocks.processStripeEvent.mockResolvedValue({ action: "synced" });
    webhookMocks.markBillingEventProcessed.mockResolvedValue(
      "2026-07-14T12:00:01.000Z"
    );

    const response = await POST(request({ "stripe-signature": "valid" }));

    expect(response.status).toBe(200);
    expect(webhookMocks.markBillingEventProcessed).toHaveBeenCalledWith(
      "receipt-id",
      claimToken
    );
    expect(webhookMocks.markBillingEventIgnored).not.toHaveBeenCalled();
  });

  it("acknowledges a duplicate ignored receipt without claiming it again", async () => {
    const event = { id: "evt_ignored", type: "invoice.created" };
    webhookMocks.getStripeClient.mockReturnValue(configuredStripe(event));
    webhookMocks.recordStripeBillingEvent.mockResolvedValue({
      duplicate: true,
      event: { id: "receipt-id", processed_at: null, status: "ignored" }
    });

    const response = await POST(request({ "stripe-signature": "valid" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      duplicate: true,
      received: true,
      result: { action: "already_ignored" }
    });
    expect(webhookMocks.beginBillingEventAttempt).not.toHaveBeenCalled();
  });

  it("recovers a previously ignored guest test payment from a signed resend", async () => {
    const event = {
      data: { object: { metadata: { kind: "guest_membership" } } },
      id: "evt_guest_recovery",
      livemode: false,
      type: "checkout.session.completed"
    };
    webhookMocks.getStripeClient.mockReturnValue(configuredStripe(event));
    webhookMocks.recordStripeBillingEvent.mockResolvedValue({
      duplicate: true,
      event: { id: "receipt-id", processed_at: null, status: "ignored" }
    });
    webhookMocks.isRecoverableIgnoredGuestPaymentEvent.mockReturnValue(true);
    webhookMocks.processStripeEvent.mockResolvedValue({
      action: "recorded_guest_membership_payment",
      status: "paid_unclaimed"
    });

    const response = await POST(request({ "stripe-signature": "valid" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      duplicate: true,
      received: true,
      recovered: true,
      result: {
        action: "recorded_guest_membership_payment",
        status: "paid_unclaimed"
      }
    });
    expect(webhookMocks.processStripeEvent).toHaveBeenCalledWith(
      event,
      webhookMocks.getStripeClient.mock.results[0]?.value
    );
    expect(webhookMocks.beginBillingEventAttempt).not.toHaveBeenCalled();
  });

  it("reports a guest payment recovery failure without exposing details", async () => {
    const event = {
      data: { object: { metadata: { kind: "guest_membership" } } },
      id: "evt_guest_recovery_failed",
      livemode: false,
      type: "checkout.session.completed"
    };
    const sensitiveError = new Error("sensitive recovery failure");
    webhookMocks.getStripeClient.mockReturnValue(configuredStripe(event));
    webhookMocks.recordStripeBillingEvent.mockResolvedValue({
      duplicate: true,
      event: { id: "receipt-id", processed_at: null, status: "ignored" }
    });
    webhookMocks.isRecoverableIgnoredGuestPaymentEvent.mockReturnValue(true);
    webhookMocks.processStripeEvent.mockRejectedValue(sensitiveError);

    const response = await POST(request({ "stripe-signature": "valid" }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "billing_event_processing_failed",
      received: true,
      type: event.type
    });
    expect(webhookMocks.reportOperationalError).toHaveBeenCalledWith(
      "stripe.webhook.ignored_guest_recovery_failed",
      sensitiveError,
      {
        billingEventId: "receipt-id",
        eventId: event.id,
        eventType: event.type
      }
    );
    expect(webhookMocks.beginBillingEventAttempt).not.toHaveBeenCalled();
  });

  it("confirms receipt without exposing processing details when processing fails", async () => {
    const event = { id: "evt_failed", type: "customer.subscription.updated" };
    const sensitiveError = new Error("sensitive database constraint detail");
    webhookMocks.getStripeClient.mockReturnValue(configuredStripe(event));
    webhookMocks.recordStripeBillingEvent.mockResolvedValue({
      duplicate: false,
      event: { id: "receipt-id", processed_at: null, status: "received" }
    });
    webhookMocks.beginBillingEventAttempt.mockResolvedValue({
      attemptCount: 1,
      claimed: true,
      claimToken,
      lastAttemptedAt: "2026-07-14T12:00:00.000Z",
      status: "processing"
    });
    webhookMocks.processStripeEvent.mockRejectedValue(sensitiveError);
    webhookMocks.markBillingEventFailed.mockResolvedValue(sensitiveError.message);

    const response = await POST(request({ "stripe-signature": "valid" }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "billing_event_processing_failed",
      received: true,
      type: event.type
    });
    expect(webhookMocks.markBillingEventFailed).toHaveBeenCalledWith(
      "receipt-id",
      sensitiveError,
      claimToken
    );
  });

  it("returns a retryable response while another worker owns the receipt", async () => {
    const event = { id: "evt_duplicate", type: "customer.subscription.updated" };
    webhookMocks.getStripeClient.mockReturnValue(configuredStripe(event));
    webhookMocks.recordStripeBillingEvent.mockResolvedValue({
      duplicate: true,
      event: { id: "receipt-id", processed_at: null, status: "processing" }
    });
    webhookMocks.beginBillingEventAttempt.mockResolvedValue({
      claimed: false,
      status: "processing"
    });

    const response = await POST(request({ "stripe-signature": "valid" }));

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      received: true,
      result: { action: "processing_in_progress" }
    });
    expect(webhookMocks.processStripeEvent).not.toHaveBeenCalled();
    expect(webhookMocks.markBillingEventFailed).not.toHaveBeenCalled();
  });

  it("does not claim receipt when durable persistence fails", async () => {
    const event = { id: "evt_unstored", type: "checkout.session.completed" };
    webhookMocks.getStripeClient.mockReturnValue(configuredStripe(event));
    webhookMocks.recordStripeBillingEvent.mockRejectedValue(
      new Error("database unavailable")
    );

    const response = await POST(request({ "stripe-signature": "valid" }));

    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ received: false });
    expect(webhookMocks.beginBillingEventAttempt).not.toHaveBeenCalled();
  });
});
