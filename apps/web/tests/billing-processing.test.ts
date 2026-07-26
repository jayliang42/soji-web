import { describe, expect, it } from "vitest";
import {
  BILLING_PROCESSING_LEASE_MS,
  getBillingRetryDescription,
  isBillingProcessingLeaseActive
} from "@/lib/billing-processing";

describe("billing processing leases", () => {
  const now = Date.parse("2026-07-15T12:00:00.000Z");

  it("keeps an in-progress claim active inside the lease window", () => {
    expect(
      isBillingProcessingLeaseActive(
        "processing",
        new Date(now - BILLING_PROCESSING_LEASE_MS + 1).toISOString(),
        now
      )
    ).toBe(true);
  });

  it("makes an expired claim recoverable", () => {
    expect(
      isBillingProcessingLeaseActive(
        "processing",
        new Date(now - BILLING_PROCESSING_LEASE_MS).toISOString(),
        now
      )
    ).toBe(false);
  });

  it("does not treat invalid or completed state as an active lease", () => {
    expect(isBillingProcessingLeaseActive("processing", "invalid", now)).toBe(false);
    expect(
      isBillingProcessingLeaseActive("processed", new Date(now).toISOString(), now)
    ).toBe(false);
  });

  it("describes the recovery source for each billing event type", () => {
    expect(getBillingRetryDescription("admin.billing.reconcile")).toContain(
      "stored Stripe identifier"
    );
    expect(getBillingRetryDescription("checkout.session.completed")).toContain(
      "original event"
    );
  });
});
