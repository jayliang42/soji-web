import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type {
  BillingEventLog,
  BillingEventSnapshot,
  BillingEventStatus
} from "@soji/types";
import {
  AdminBillingEvents,
  executeBillingEventRetry,
  getBillingEventHeadingId,
  getBillingReconciliationResultMessage,
  getBillingReconciliationValidationMessage,
  getBillingRetryResultMessage
} from "@/components/admin-billing-events";

const baseEvent: BillingEventLog = {
  attemptCount: 1,
  createdAt: "2026-07-15T12:00:00.000Z",
  customerId: "cus_customer_reference",
  disputeId: "du_dispute_reference",
  eventType: "charge.dispute.created",
  id: "00000000-0000-4000-8000-000000000501",
  lastAttemptedAt: "2026-07-15T12:00:01.000Z",
  objectId: "du_dispute_reference",
  objectType: "dispute",
  paymentId: "pi_payment_reference",
  processedAt: null,
  processingError: null,
  processingStartedAt: null,
  provider: "stripe",
  providerEventId: "evt_provider_reference",
  status: "received",
  subscriptionId: "sub_subscription_reference"
};

function event(
  status: BillingEventStatus,
  overrides: Partial<BillingEventLog> = {}
): BillingEventLog {
  return {
    ...baseEvent,
    id: `00000000-0000-4000-8000-00000000050${status.length}`,
    status,
    ...overrides
  };
}

function snapshot(
  items: BillingEventLog[],
  overrides: Partial<BillingEventSnapshot> = {}
): BillingEventSnapshot {
  return {
    items,
    page: 1,
    pageSize: 25,
    source: "supabase",
    totalItems: items.length,
    totalPages: 1,
    ...overrides
  };
}

function render(
  items: BillingEventLog[],
  overrides: Partial<BillingEventSnapshot> = {}
) {
  return renderToStaticMarkup(
    <AdminBillingEvents canInspect snapshot={snapshot(items, overrides)} />
  );
}

describe("Admin Billing incident ledger", () => {
  it("renders receipt and every processing outcome as distinct exact badges", () => {
    const now = Date.now();
    const html = render([
      event("received"),
      event("processing", {
        id: "00000000-0000-4000-8000-000000000511",
        processingStartedAt: new Date(now - 1_000).toISOString()
      }),
      event("processing", {
        id: "00000000-0000-4000-8000-000000000512",
        processingStartedAt: new Date(now - 130_000).toISOString()
      }),
      event("processed", {
        processedAt: "2026-07-15T12:00:02.000Z"
      }),
      event("ignored", {
        processedAt: "2026-07-15T12:00:02.000Z"
      }),
      event("failed", {
        processingError:
          "private@example.com Stripe secret sk_test_must_not_render"
      })
    ]);

    expect(html.match(/Receipt · Received/g)).toHaveLength(6);
    expect(html).toContain("Processing · Awaiting");
    expect(html).toContain("Processing · In progress");
    expect(html).toContain("Processing · Lease expired");
    expect(html).toContain("Processing · Complete");
    expect(html).toContain("Processing · No handler");
    expect(html).toContain("Processing · Failed");
    expect(html).toContain("Received and stored");
    expect(html).not.toContain("private@example.com");
    expect(html).not.toContain("sk_test_must_not_render");
  });

  it.each([
    ["received", null, true],
    ["failed", null, true],
    [
      "processing",
      new Date(Date.now() - 130_000).toISOString(),
      true
    ],
    ["processing", new Date().toISOString(), false],
    ["processed", null, false],
    ["ignored", null, false]
  ] as const)(
    "shows Retry only for %s with processing start %s",
    (status, processingStartedAt, retryVisible) => {
      const html = render([
        event(status, {
          processingStartedAt
        })
      ]);

      expect(html.includes("Retry processing")).toBe(retryVisible);
    }
  );

  it("renders four ordered evidence columns, semantic dates, and selectable bounded references", () => {
    const html = render([baseEvent]);
    const received = html.indexOf(">Received<");
    const processing = html.indexOf(">Processing<");
    const attempts = html.indexOf(">Attempts<");
    const object = html.indexOf(">Object<");

    expect(received).toBeGreaterThan(-1);
    expect(received).toBeLessThan(processing);
    expect(processing).toBeLessThan(attempts);
    expect(attempts).toBeLessThan(object);
    expect(html).toContain(
      '<time dateTime="2026-07-15T12:00:00.000Z"'
    );
    expect(html).toContain("evt_provider_reference");
    expect(html).toContain("du_dispute_reference");
    expect(html).toContain("pi_payment_reference");
    expect(html).toContain("sub_subscription_reference");
    expect(html).toContain("cus_customer_reference");
    expect(html).toContain("[overflow-wrap:anywhere]");
    expect(html).toContain("select-text");
    expect(html).not.toContain("payload");
  });

  it("uses exact type-aware recovery guidance", () => {
    const original = render([event("failed")]);
    const synthetic = render([
      event("failed", {
        eventType: "admin.billing.reconcile",
        objectId: "sub_subscription_reference",
        objectType: "subscription"
      })
    ]);

    expect(original).toContain(
      "Retry loads the original event from Stripe and runs the same idempotent processor."
    );
    expect(synthetic).toContain(
      "Retry uses the stored Stripe identifier and refreshes the current subscription state."
    );
  });

  it("provides one shared polite live region and exact event focus targets", () => {
    const html = render([baseEvent]);

    expect(html.match(/aria-live="polite"/g)).toHaveLength(1);
    expect(html).toContain('id="billing-event-action-message"');
    expect(html).toContain(
      'id="billing-event-heading-00000000-0000-4000-8000-000000000501"'
    );
    expect(html).toContain('tabindex="-1"');
    expect(getBillingEventHeadingId(baseEvent.id)).toBe(
      `billing-event-heading-${baseEvent.id}`
    );
  });

  it("keeps validation and recovery result announcements exact and stable", () => {
    expect(getBillingReconciliationValidationMessage("evt_wrong")).toBe(
      "Enter a Stripe subscription ID (sub_…) or customer ID (cus_…)."
    );
    expect(getBillingReconciliationValidationMessage("sub_valid123")).toBeNull();
    expect(
      getBillingReconciliationResultMessage({
        staleSubscriptionsClosed: 2,
        subscriptionsSynced: 3
      })
    ).toBe("Reconciled 3 subscription(s); closed 2 stale local record(s).");
    expect(getBillingRetryResultMessage("processed")).toBe(
      "Billing event processed successfully."
    );
    expect(getBillingRetryResultMessage("ignored")).toBe(
      "Billing event stored; this event type has no GS学院 handler."
    );
    expect(getBillingRetryResultMessage("active")).toContain(
      "already being processed"
    );
    expect(getBillingRetryResultMessage("failed")).toContain(
      "could not be retried"
    );
    expect(getBillingRetryResultMessage("retryable")).toContain(
      "retryable again"
    );
  });

  it("applies the complete successful retry snapshot and restores focus to the event", async () => {
    const eventId = baseEvent.id;
    const settledEvent = event("processed", {
      attemptCount: 2,
      id: eventId,
      lastAttemptedAt: "2026-07-15T12:01:00.000Z",
      processedAt: "2026-07-15T12:01:01.000Z",
      processingError: null,
      processingStartedAt: null
    });
    const updatedEvents: BillingEventLog[] = [];
    const focusTargets: string[] = [];
    const messages: Array<{ heading: string } | null> = [];
    const pendingSnapshots: string[][] = [];

    const started = await executeBillingEventRetry({
      eventId,
      fetchImpl: async () =>
        new Response(JSON.stringify({ event: settledEvent, ok: true })),
      onEvent: (updatedEvent) => updatedEvents.push(updatedEvent),
      onFocus: (targetId) => focusTargets.push(targetId),
      onMessage: (message) => messages.push(message),
      onPendingChange: (pendingIds) =>
        pendingSnapshots.push([...pendingIds]),
      pendingIds: new Set()
    });

    expect(started).toBe(true);
    expect(updatedEvents).toEqual([settledEvent]);
    expect(updatedEvents[0]).toMatchObject({
      attemptCount: 2,
      lastAttemptedAt: "2026-07-15T12:01:00.000Z"
    });
    expect(pendingSnapshots).toEqual([[eventId], []]);
    expect(messages.at(-1)?.heading).toBe(
      "Billing event processed successfully."
    );
    expect(focusTargets).toEqual([getBillingEventHeadingId(eventId)]);
  });

  it("applies failed-attempt evidence and focuses the recovery message", async () => {
    const failedEvent = event("failed", {
      attemptCount: 3,
      id: baseEvent.id,
      lastAttemptedAt: "2026-07-15T12:02:00.000Z",
      processingError: "stripe_api_failed"
    });
    const updatedEvents: BillingEventLog[] = [];
    const focusTargets: string[] = [];
    const messages: Array<{ heading: string; tone: string } | null> = [];

    await executeBillingEventRetry({
      eventId: baseEvent.id,
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            event: failedEvent,
            ok: false,
            reason: "billing_event_retry_failed"
          }),
          { status: 500 }
        ),
      onEvent: (updatedEvent) => updatedEvents.push(updatedEvent),
      onFocus: (targetId) => focusTargets.push(targetId),
      onMessage: (message) => messages.push(message),
      onPendingChange: () => undefined,
      pendingIds: new Set()
    });

    expect(updatedEvents).toEqual([failedEvent]);
    expect(messages.at(-1)).toMatchObject({
      heading: expect.stringContaining("could not be retried"),
      tone: "error"
    });
    expect(focusTargets).toEqual(["billing-event-action-message"]);
  });

  it("replaces a stale retryable row with the active lease snapshot", async () => {
    const processingStartedAt = new Date().toISOString();
    const activeLeaseEvent = event("processing", {
      attemptCount: 2,
      id: baseEvent.id,
      lastAttemptedAt: processingStartedAt,
      processingError: null,
      processingStartedAt
    });
    const onEvent = vi.fn();
    const onFocus = vi.fn();
    const onMessage = vi.fn();

    await executeBillingEventRetry({
      eventId: baseEvent.id,
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            event: activeLeaseEvent,
            ok: false,
            reason: "event_processing_in_progress"
          }),
          { status: 409 }
        ),
      onEvent,
      onFocus,
      onMessage,
      onPendingChange: () => undefined,
      pendingIds: new Set()
    });

    expect(onEvent).toHaveBeenCalledWith(activeLeaseEvent);
    expect(onMessage).toHaveBeenLastCalledWith({
      heading: expect.stringContaining("already being processed"),
      tone: "status"
    });
    expect(onFocus).toHaveBeenCalledWith("billing-event-action-message");

    const activeHtml = render([activeLeaseEvent]);
    expect(activeHtml).toContain("Processing · In progress");
    expect(activeHtml).not.toContain("Retry processing");

    const expiredHtml = render([
      {
        ...activeLeaseEvent,
        processingStartedAt: new Date(Date.now() - 130_000).toISOString()
      }
    ]);
    expect(expiredHtml).toContain("Processing · Lease expired");
    expect(expiredHtml).toContain("Retry processing");
  });

  it("replaces an unclaimed row with its failed retryable snapshot and matching message", async () => {
    const failedEvent = event("failed", {
      attemptCount: 2,
      id: baseEvent.id,
      lastAttemptedAt: new Date().toISOString(),
      processingError: "stripe_api_failed",
      processingStartedAt: null
    });
    const onEvent = vi.fn();
    const onMessage = vi.fn();

    await executeBillingEventRetry({
      eventId: baseEvent.id,
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            event: failedEvent,
            ok: false,
            reason: "event_retryable_state_changed"
          }),
          { status: 409 }
        ),
      onEvent,
      onFocus: () => undefined,
      onMessage,
      onPendingChange: () => undefined,
      pendingIds: new Set()
    });

    expect(onEvent).toHaveBeenCalledWith(failedEvent);
    expect(onMessage).toHaveBeenLastCalledWith({
      heading: expect.stringContaining("retryable again"),
      tone: "status"
    });
    const html = render([failedEvent]);
    expect(html).toContain("Processing · Failed");
    expect(html).toContain("Retry processing");
  });

  it("replaces an unclaimed row with its expired lease snapshot and matching message", async () => {
    const processingStartedAt = new Date(Date.now() - 120_000).toISOString();
    const expiredEvent = event("processing", {
      attemptCount: 2,
      id: baseEvent.id,
      lastAttemptedAt: processingStartedAt,
      processingError: null,
      processingStartedAt
    });
    const onEvent = vi.fn();
    const onMessage = vi.fn();

    await executeBillingEventRetry({
      eventId: baseEvent.id,
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            event: expiredEvent,
            ok: false,
            reason: "event_retryable_state_changed"
          }),
          { status: 409 }
        ),
      onEvent,
      onFocus: () => undefined,
      onMessage,
      onPendingChange: () => undefined,
      pendingIds: new Set()
    });

    expect(onEvent).toHaveBeenCalledWith(expiredEvent);
    expect(onMessage).toHaveBeenLastCalledWith({
      heading: expect.stringContaining("retryable again"),
      tone: "status"
    });
    const html = render([expiredEvent]);
    expect(html).toContain("Processing · Lease expired");
    expect(html).toContain("Retry processing");
  });

  it("allows concurrent retries for different records while rejecting a duplicate record retry", async () => {
    const firstId = "00000000-0000-4000-8000-000000000601";
    const secondId = "00000000-0000-4000-8000-000000000602";
    const resolvers = new Map<
      string,
      (response: Pick<Response, "json" | "ok">) => void
    >();
    const pendingIds = new Set<string>();
    const pendingSnapshots: string[][] = [];
    const focusTargets: string[] = [];
    const fetchImpl = vi.fn(
      (input: RequestInfo | URL) =>
        new Promise<Pick<Response, "json" | "ok">>((resolve) => {
          resolvers.set(String(input), resolve);
        })
    );
    const callbacks = {
      fetchImpl,
      onEvent: () => undefined,
      onFocus: (targetId: string) => focusTargets.push(targetId),
      onMessage: () => undefined,
      onPendingChange: (currentIds: ReadonlySet<string>) =>
        pendingSnapshots.push([...currentIds].sort()),
      pendingIds
    };

    const firstRetry = executeBillingEventRetry({
      ...callbacks,
      eventId: firstId
    });
    const duplicateRetry = executeBillingEventRetry({
      ...callbacks,
      eventId: firstId
    });
    const secondRetry = executeBillingEventRetry({
      ...callbacks,
      eventId: secondId
    });

    await expect(duplicateRetry).resolves.toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(pendingIds).toEqual(new Set([firstId, secondId]));

    for (const eventId of [firstId, secondId]) {
      const settledEvent = event("processed", {
        id: eventId,
        attemptCount: 2,
        lastAttemptedAt: "2026-07-15T12:03:00.000Z",
        processedAt: "2026-07-15T12:03:01.000Z"
      });
      resolvers.get(`/api/admin/billing-events/${eventId}/retry`)?.(
        new Response(JSON.stringify({ event: settledEvent, ok: true }))
      );
    }

    await expect(Promise.all([firstRetry, secondRetry])).resolves.toEqual([
      true,
      true
    ]);
    expect(pendingIds.size).toBe(0);
    expect(pendingSnapshots).toContainEqual([firstId, secondId]);
    expect(focusTargets.sort()).toEqual(
      [
        getBillingEventHeadingId(firstId),
        getBillingEventHeadingId(secondId)
      ].sort()
    );
  });

  it("uses the approved control copy, helper text, and responsive target geometry", () => {
    const html = render([baseEvent]);

    expect(html).toContain(
      "Signed Stripe receipts and their independent GS学院 processing outcomes."
    );
    expect(html).toContain("Reconcile from Stripe");
    expect(html).toContain("sub_… or cus_…");
    expect(html).toContain(
      "Pulls current Stripe subscription data, reapplies access rules, and records a synthetic receipt. Use a subscription or customer ID only."
    );
    expect(html).toContain("Search billing events");
    expect(html).toContain(
      "Event, dispute, payment, subscription, or customer ID"
    );
    expect(html).toContain("Processing status");
    expect(html).toContain("min-h-11");
    expect(html).toContain("w-full");
  });

  it("keeps role denial free of operational controls and offers Account", () => {
    const html = renderToStaticMarkup(
      <AdminBillingEvents canInspect={false} snapshot={snapshot([])} />
    );

    expect(html).toContain(
      "Admin role required to inspect billing events."
    );
    expect(html).toContain(
      "Return to Account"
    );
    expect(html).toContain('href="/account"');
    expect(html).not.toContain("Reconcile billing");
    expect(html).not.toContain("Search events");
  });

  it("distinguishes initial failure from a true empty ledger without raw reasons", () => {
    const failed = render([], { error: "sensitive database detail" });
    const empty = render([]);

    expect(failed).toContain("Billing events could not be loaded.");
    expect(failed).toContain(
      "Refresh this workspace or check service health before taking a recovery action."
    );
    expect(failed).toContain('role="alert"');
    expect(failed).not.toContain("sensitive database detail");
    expect(failed).not.toContain("No billing events recorded yet.");

    expect(empty).toContain("No billing events recorded yet.");
    expect(empty).toContain(
      "Signed Stripe receipts will appear here after the webhook stores them."
    );
    expect(empty).not.toContain("Billing events could not be loaded.");
  });

  it("keeps fixed pagination controls and excludes destructive billing actions", () => {
    const html = render([baseEvent]);

    expect(html).toContain("Showing 1–1 of 1");
    expect(html).toContain("Previous");
    expect(html).toContain("Page 1 of 1");
    expect(html).toContain("Next");
    expect(html).not.toContain("Cancel subscription");
    expect(html).not.toContain("Issue refund");
    expect(html).not.toContain("Accept dispute");
    expect(html).not.toContain("Delete receipt");
    expect(html).not.toContain("Clear event");
  });
});
