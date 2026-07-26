import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type {
  BillingEventLog,
  BillingEventSnapshot,
  BillingEventStatus
} from "@soji/types";
import { AdminBillingEvents } from "@/components/admin-billing-events";

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
    expect(html).toContain('tabIndex="-1"');
  });

  it("uses the approved control copy, helper text, and responsive target geometry", () => {
    const html = render([baseEvent]);

    expect(html).toContain(
      "Signed Stripe receipts and their independent Soji processing outcomes."
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
