import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

const reconciliationMocks = vi.hoisted(() => ({
  closeMissingCustomerSubscriptions: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
  rpc: vi.fn(),
  syncSubscriptionEntitlements: vi.fn()
}));

vi.mock("@/lib/stripe-webhook", () => reconciliationMocks);
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: reconciliationMocks.createSupabaseAdminClient
}));

import {
  getStripeBillingIdentifierKind,
  getStripeReconciliationPayloadIdentifier,
  reconcileStripeBilling
} from "@/lib/stripe-reconciliation";

function createStripeMock(subscriptions: Stripe.Subscription[]) {
  return {
    subscriptions: {
      list: vi.fn(() => ({
        async *[Symbol.asyncIterator]() {
          for (const subscription of subscriptions) {
            yield subscription;
          }
        }
      })),
      retrieve: vi.fn(async () => subscriptions[0])
    }
  } as unknown as Stripe;
}

function paidInvoicePayment(
  overrides: Partial<Stripe.InvoicePayment> = {}
): Stripe.InvoicePayment {
  return {
    id: "ip_latest",
    invoice: "in_latest",
    object: "invoice_payment",
    payment: {
      payment_intent: "pi_latest_paid",
      type: "payment_intent"
    },
    status: "paid",
    status_transitions: {
      canceled_at: null,
      paid_at: 1784214000
    },
    ...overrides
  } as Stripe.InvoicePayment;
}

function createPaidEvidenceStripe({
  invoicePayments,
  latestInvoice = {
    id: "in_latest",
    object: "invoice"
  } as Stripe.Invoice,
  subscription = {
    id: "sub_123",
    latest_invoice: "in_latest"
  } as Stripe.Subscription
}: {
  invoicePayments: Stripe.InvoicePayment[];
  latestInvoice?: Stripe.Invoice;
  subscription?: Stripe.Subscription;
}) {
  const invoiceRetrieve = vi.fn().mockResolvedValue(latestInvoice);
  const invoicePaymentsList = vi.fn().mockResolvedValue({
    data: invoicePayments
  });
  const subscriptionRetrieve = vi.fn().mockResolvedValue(subscription);

  return {
    invoicePaymentsList,
    invoiceRetrieve,
    stripe: {
      invoicePayments: { list: invoicePaymentsList },
      invoices: { retrieve: invoiceRetrieve },
      subscriptions: {
        list: vi.fn(),
        retrieve: subscriptionRetrieve
      }
    } as unknown as Stripe,
    subscription,
    subscriptionRetrieve
  };
}

describe("Stripe billing reconciliation", () => {
  beforeEach(() => {
    reconciliationMocks.closeMissingCustomerSubscriptions.mockReset();
    reconciliationMocks.createSupabaseAdminClient.mockReset();
    reconciliationMocks.rpc.mockReset();
    reconciliationMocks.syncSubscriptionEntitlements.mockReset();
    reconciliationMocks.createSupabaseAdminClient.mockReturnValue({
      rpc: reconciliationMocks.rpc
    });
    reconciliationMocks.closeMissingCustomerSubscriptions.mockResolvedValue(0);
    reconciliationMocks.rpc.mockResolvedValue({
      data: "tier_2",
      error: null
    });
    reconciliationMocks.syncSubscriptionEntitlements.mockResolvedValue({
      action: "synced"
    });
  });

  it("classifies only Stripe customer and subscription IDs", () => {
    expect(getStripeBillingIdentifierKind("sub_123ABC")).toBe("subscription");
    expect(getStripeBillingIdentifierKind("cus_123ABC")).toBe("customer");
    expect(getStripeBillingIdentifierKind("evt_123ABC")).toBeNull();
    expect(getStripeBillingIdentifierKind("cus_123-ABC")).toBeNull();
  });

  it("extracts only a supported identifier from stored reconciliation evidence", () => {
    expect(
      getStripeReconciliationPayloadIdentifier({
        identifier: "cus_123ABC",
        requestedBy: "admin-id"
      })
    ).toBe("cus_123ABC");
    expect(
      getStripeReconciliationPayloadIdentifier({ identifier: "evt_123ABC" })
    ).toBeNull();
    expect(getStripeReconciliationPayloadIdentifier([])).toBeNull();
  });

  it("retrieves and syncs one subscription", async () => {
    const subscription = { id: "sub_123" } as Stripe.Subscription;
    const stripe = createStripeMock([subscription]);

    await expect(reconcileStripeBilling(stripe, "sub_123")).resolves.toEqual({
      identifier: "sub_123",
      kind: "subscription",
      staleSubscriptionsClosed: 0,
      subscriptionsSynced: 1
    });
    expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith("sub_123");
    expect(reconciliationMocks.syncSubscriptionEntitlements).toHaveBeenCalledWith({
      subscription
    });
    expect(
      reconciliationMocks.closeMissingCustomerSubscriptions
    ).not.toHaveBeenCalled();
    expect(reconciliationMocks.rpc).not.toHaveBeenCalled();
  });

  it.each([
    {
      effectiveTier: "tier_2",
      label: "later",
      paidAt: 1784214000
    },
    {
      effectiveTier: "free",
      label: "same-time",
      paidAt: 1784127600
    },
    {
      effectiveTier: "free",
      label: "older",
      paidAt: 1784041200
    }
  ] as const)(
    "passes exact $label paid evidence to the authoritative database reconciliation RPC",
    async ({ effectiveTier, paidAt }) => {
      reconciliationMocks.rpc.mockResolvedValue({
        data: effectiveTier,
        error: null
      });
      const fixture = createPaidEvidenceStripe({
        invoicePayments: [
          paidInvoicePayment({
            status_transitions: {
              canceled_at: null,
              paid_at: paidAt
            }
          })
        ]
      });

      await expect(
        reconcileStripeBilling(fixture.stripe, "sub_123")
      ).resolves.toEqual({
        identifier: "sub_123",
        kind: "subscription",
        staleSubscriptionsClosed: 0,
        subscriptionsSynced: 1
      });

      expect(fixture.subscriptionRetrieve).toHaveBeenCalledWith("sub_123");
      expect(
        reconciliationMocks.syncSubscriptionEntitlements
      ).toHaveBeenCalledWith({
        subscription: fixture.subscription
      });
      expect(fixture.invoiceRetrieve).toHaveBeenCalledWith("in_latest");
      expect(fixture.invoicePaymentsList).toHaveBeenCalledWith({
        invoice: "in_latest",
        limit: 2,
        status: "paid"
      });
      expect(reconciliationMocks.rpc).toHaveBeenCalledWith(
        "reconcile_stripe_subscription_paid_payment",
        {
          p_observed_at: new Date(paidAt * 1000).toISOString(),
          p_provider_payment_id: "pi_latest_paid",
          p_provider_subscription_id: "sub_123"
        }
      );
    }
  );

  it("does not infer a paid state when the latest Invoice has no paid payment", async () => {
    const fixture = createPaidEvidenceStripe({ invoicePayments: [] });

    await expect(
      reconcileStripeBilling(fixture.stripe, "sub_123")
    ).resolves.toMatchObject({
      subscriptionsSynced: 1
    });
    expect(fixture.invoicePaymentsList).toHaveBeenCalledWith({
      invoice: "in_latest",
      limit: 2,
      status: "paid"
    });
    expect(reconciliationMocks.rpc).not.toHaveBeenCalled();
  });

  it("rejects ambiguous paid Invoice Payments before database reconciliation", async () => {
    const fixture = createPaidEvidenceStripe({
      invoicePayments: [
        paidInvoicePayment(),
        paidInvoicePayment({ id: "ip_second" })
      ]
    });

    await expect(
      reconcileStripeBilling(fixture.stripe, "sub_123")
    ).rejects.toThrow("stripe_paid_invoice_payment_ambiguous");
    expect(reconciliationMocks.rpc).not.toHaveBeenCalled();
  });

  it("rejects Charge-only paid Invoice evidence before database reconciliation", async () => {
    const fixture = createPaidEvidenceStripe({
      invoicePayments: [
        paidInvoicePayment({
          payment: {
            charge: "ch_paid_without_payment_intent",
            type: "charge"
          }
        })
      ]
    });

    await expect(
      reconcileStripeBilling(fixture.stripe, "sub_123")
    ).rejects.toThrow("stripe_paid_invoice_payment_not_payment_intent");
    expect(reconciliationMocks.rpc).not.toHaveBeenCalled();
  });

  it("rejects paid Invoice evidence without a provider paid timestamp", async () => {
    const fixture = createPaidEvidenceStripe({
      invoicePayments: [
        paidInvoicePayment({
          status_transitions: {
            canceled_at: null,
            paid_at: null
          }
        })
      ]
    });

    await expect(
      reconcileStripeBilling(fixture.stripe, "sub_123")
    ).rejects.toThrow("stripe_paid_invoice_payment_timestamp_missing");
    expect(reconciliationMocks.rpc).not.toHaveBeenCalled();
  });

  it("syncs every customer subscription and closes stale local records", async () => {
    const subscriptions = [
      { id: "sub_one" } as Stripe.Subscription,
      { id: "sub_two" } as Stripe.Subscription
    ];
    const stripe = createStripeMock(subscriptions);
    reconciliationMocks.closeMissingCustomerSubscriptions.mockResolvedValue(2);

    await expect(reconcileStripeBilling(stripe, "cus_123")).resolves.toEqual({
      identifier: "cus_123",
      kind: "customer",
      staleSubscriptionsClosed: 2,
      subscriptionsSynced: 2
    });
    expect(stripe.subscriptions.list).toHaveBeenCalledWith({
      customer: "cus_123",
      limit: 100,
      status: "all"
    });
    expect(
      reconciliationMocks.closeMissingCustomerSubscriptions
    ).toHaveBeenCalledWith("cus_123", new Set(["sub_one", "sub_two"]));
  });

  it("fails before calling Stripe for unsupported identifiers", async () => {
    const stripe = createStripeMock([]);

    await expect(reconcileStripeBilling(stripe, "evt_123")).rejects.toThrow(
      "invalid_stripe_billing_identifier"
    );
    expect(stripe.subscriptions.list).not.toHaveBeenCalled();
    expect(stripe.subscriptions.retrieve).not.toHaveBeenCalled();
  });
});
