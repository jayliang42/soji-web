import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

const syncMocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  customerEq: vi.fn(),
  from: vi.fn(),
  providerEq: vi.fn(),
  rpc: vi.fn()
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: syncMocks.createSupabaseAdminClient
}));

import {
  beginBillingEventAttempt,
  closeMissingCustomerSubscriptions,
  markBillingEventFailed,
  markBillingEventIgnored,
  markBillingEventProcessed,
  processStripeEvent,
  recordStripeBillingEvent,
  syncSubscriptionEntitlements
} from "@/lib/stripe-webhook";

const userId = "00000000-0000-4000-8000-000000000101";
const productId = "00000000-0000-4000-8000-000000000201";

function subscription(
  overrides: Partial<Stripe.Subscription> = {}
): Stripe.Subscription {
  return {
    canceled_at: null,
    cancel_at_period_end: false,
    customer: "cus_test",
    id: "sub_test",
    items: {
      data: [
        {
          current_period_end: 1786708800,
          id: "si_membership",
          object: "subscription_item"
        } as Stripe.SubscriptionItem
      ],
      has_more: false,
      object: "list",
      url: "/v1/subscription_items?subscription=sub_test"
    },
    metadata: { planId: "tier_2", userId },
    status: "active",
    ...overrides
  } as Stripe.Subscription;
}

function subscriptionInvoice(
  overrides: Partial<Stripe.Invoice> = {}
): Stripe.Invoice {
  return {
    id: "in_subscription",
    object: "invoice",
    parent: {
      quote_details: null,
      subscription_details: {
        metadata: null,
        subscription: "sub_test"
      },
      type: "subscription_details"
    },
    ...overrides
  } as Stripe.Invoice;
}

function invoicePayment(
  overrides: Partial<Stripe.InvoicePayment> = {}
): Stripe.InvoicePayment {
  return {
    id: "ip_test",
    invoice: "in_subscription",
    object: "invoice_payment",
    payment: {
      payment_intent: "pi_subscription",
      type: "payment_intent"
    },
    status: "paid",
    ...overrides
  } as Stripe.InvoicePayment;
}

describe("Stripe webhook state synchronization", () => {
  const claimToken = "00000000-0000-4000-8000-000000000777";

  beforeEach(() => {
    syncMocks.rpc.mockReset();
    syncMocks.from.mockReset();
    syncMocks.providerEq.mockReset();
    syncMocks.customerEq.mockReset();
    syncMocks.createSupabaseAdminClient.mockReturnValue({
      from: syncMocks.from,
      rpc: syncMocks.rpc
    });
  });

  it("claims each billing processing attempt through one service-role RPC", async () => {
    syncMocks.rpc.mockResolvedValue({
      data: {
        attemptCount: 2,
        claimed: true,
        claimToken,
        lastAttemptedAt: "2026-07-14T12:00:00.000Z",
        status: "processing"
      },
      error: null
    });

    await expect(beginBillingEventAttempt("billing-event-id")).resolves.toEqual({
      attemptCount: 2,
      claimed: true,
      claimToken,
      lastAttemptedAt: "2026-07-14T12:00:00.000Z",
      status: "processing"
    });
    expect(syncMocks.rpc).toHaveBeenCalledWith("begin_billing_event_attempt", {
      p_billing_event_id: "billing-event-id"
    });
  });

  it("persists only minimal Stripe receipt metadata", async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: "billing-event-id", processed_at: null, status: "received" },
      error: null
    });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    syncMocks.from.mockReturnValue({ insert });
    const event = {
      api_version: "2025-04-30.basil",
      created: 1784124000,
      data: {
        object: {
          customer_details: { email: "private@example.com" },
          id: "cs_test_private",
          metadata: { internalNote: "do not persist" },
          object: "checkout.session"
        }
      },
      id: "evt_minimal_receipt",
      livemode: false,
      type: "checkout.session.completed"
    } as unknown as Stripe.Event;

    await expect(recordStripeBillingEvent(event)).resolves.toMatchObject({
      duplicate: false,
      event: { id: "billing-event-id", status: "received" }
    });

    expect(insert).toHaveBeenCalledWith({
      event_type: "checkout.session.completed",
      payload: {
        apiVersion: "2025-04-30.basil",
        created: 1784124000,
        id: "evt_minimal_receipt",
        livemode: false,
        objectId: "cs_test_private",
        objectType: "checkout.session",
        type: "checkout.session.completed"
      },
      provider: "stripe",
      provider_event_id: "evt_minimal_receipt",
      status: "received"
    });
  });

  it("adds only bounded direct refund and dispute references to receipts", async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: "billing-event-id", processed_at: null, status: "received" },
      error: null
    });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    syncMocks.from.mockReturnValue({ insert });
    const event = {
      api_version: "2025-04-30.basil",
      created: 1784124000,
      data: {
        object: {
          amount: 1900,
          charge: "ch_direct_reference",
          customer: "cus_must_not_be_inferred",
          id: "du_direct_reference",
          metadata: {
            customerEmail: "private@example.com",
            token: "secret"
          },
          object: "dispute",
          payment_intent: "pi_direct_reference"
        }
      },
      id: "evt_direct_references",
      livemode: false,
      type: "charge.dispute.created"
    } as unknown as Stripe.Event;

    await recordStripeBillingEvent(event);

    expect(insert).toHaveBeenCalledWith({
      event_type: "charge.dispute.created",
      payload: {
        apiVersion: "2025-04-30.basil",
        chargeId: "ch_direct_reference",
        created: 1784124000,
        disputeId: "du_direct_reference",
        id: "evt_direct_references",
        livemode: false,
        objectId: "du_direct_reference",
        objectType: "dispute",
        paymentId: "pi_direct_reference",
        type: "charge.dispute.created"
      },
      provider: "stripe",
      provider_event_id: "evt_direct_references",
      status: "received"
    });
    const insertedReceipt = (insert.mock.calls as unknown[][])[0]?.[0];
    expect(JSON.stringify(insertedReceipt)).not.toContain(
      "private@example.com"
    );
    expect(JSON.stringify(insertedReceipt)).not.toContain("secret");
  });

  it("reports an active billing claim without inventing attempt metadata", async () => {
    syncMocks.rpc.mockResolvedValue({
      data: { claimed: false, status: "processing" },
      error: null
    });

    await expect(beginBillingEventAttempt("billing-event-id")).resolves.toEqual({
      claimed: false,
      status: "processing"
    });
  });

  it("settles processed, ignored, and failed attempts only with their claim token", async () => {
    syncMocks.rpc
      .mockResolvedValueOnce({
        data: {
          processedAt: "2026-07-14T12:00:01.000Z",
          settled: true,
          status: "processed"
        },
        error: null
      })
      .mockResolvedValueOnce({
        data: {
          processedAt: "2026-07-14T12:00:02.000Z",
          settled: true,
          status: "ignored"
        },
        error: null
      })
      .mockResolvedValueOnce({
        data: { processedAt: null, settled: true, status: "failed" },
        error: null
      });

    await expect(
      markBillingEventProcessed("billing-event-id", claimToken)
    ).resolves.toBe("2026-07-14T12:00:01.000Z");
    await expect(
      markBillingEventIgnored("billing-event-id", claimToken)
    ).resolves.toBe("2026-07-14T12:00:02.000Z");
    await expect(
      markBillingEventFailed("billing-event-id", new Error("sync failed"), claimToken)
    ).resolves.toBe("sync failed");

    expect(syncMocks.rpc).toHaveBeenNthCalledWith(1, "finish_billing_event_attempt", {
      p_billing_event_id: "billing-event-id",
      p_claim_token: claimToken,
      p_error: undefined,
      p_result_status: "processed",
      p_succeeded: true
    });
    expect(syncMocks.rpc).toHaveBeenNthCalledWith(2, "finish_billing_event_attempt", {
      p_billing_event_id: "billing-event-id",
      p_claim_token: claimToken,
      p_error: undefined,
      p_result_status: "ignored",
      p_succeeded: true
    });
    expect(syncMocks.rpc).toHaveBeenNthCalledWith(3, "finish_billing_event_attempt", {
      p_billing_event_id: "billing-event-id",
      p_claim_token: claimToken,
      p_error: "sync failed",
      p_result_status: undefined,
      p_succeeded: false
    });
  });

  it("rejects settlement after its billing lease was lost", async () => {
    syncMocks.rpc.mockResolvedValue({
      data: { settled: false },
      error: null
    });

    await expect(
      markBillingEventProcessed("billing-event-id", claimToken)
    ).rejects.toThrow("billing_event_attempt_lease_lost");
  });

  it("syncs subscription, entitlements, and effective tier through one RPC", async () => {
    syncMocks.rpc.mockResolvedValue({ data: "tier_2", error: null });

    await expect(
      syncSubscriptionEntitlements({ subscription: subscription() })
    ).resolves.toMatchObject({
      action: "synced",
      effectiveTier: "tier_2",
      planId: "tier_2",
      userId
    });

    expect(syncMocks.rpc).toHaveBeenCalledOnce();
    expect(syncMocks.rpc).toHaveBeenCalledWith(
      "sync_stripe_subscription_state",
      expect.objectContaining({
        p_cancel_at_period_end: false,
        p_current_period_ends_at: "2026-08-14T12:00:00.000Z",
        p_plan_id: "tier_2",
        p_provider_customer_id: "cus_test",
        p_provider_subscription_id: "sub_test",
        p_status: "active",
        p_user_id: userId
      })
    );
  });

  it.each([
    {
      items: {
        data: [],
        has_more: false,
        object: "list" as const,
        url: "/v1/subscription_items?subscription=sub_test"
      },
      name: "missing"
    },
    {
      items: {
        data: [
          {
            current_period_end: 1786708800,
            id: "si_membership",
            object: "subscription_item"
          } as Stripe.SubscriptionItem,
          {
            current_period_end: 1789387200,
            id: "si_ambiguous",
            object: "subscription_item"
          } as Stripe.SubscriptionItem
        ],
        has_more: false,
        object: "list" as const,
        url: "/v1/subscription_items?subscription=sub_test"
      },
      name: "ambiguous"
    },
    {
      items: {
        data: [
          {
            current_period_end: null,
            id: "si_period_missing",
            object: "subscription_item"
          } as unknown as Stripe.SubscriptionItem
        ],
        has_more: false,
        object: "list" as const,
        url: "/v1/subscription_items?subscription=sub_test"
      },
      name: "period-less"
    }
  ])("fails closed for a $name Basil subscription item set", async ({ items }) => {
    await expect(
      syncSubscriptionEntitlements({
        subscription: subscription({ items })
      })
    ).rejects.toThrow("stripe_subscription_period_missing");

    expect(syncMocks.rpc).not.toHaveBeenCalled();
  });

  it("refreshes current Stripe state instead of trusting an old subscription snapshot", async () => {
    syncMocks.rpc.mockResolvedValue({ data: "free", error: null });
    const retrieve = vi.fn().mockResolvedValue(subscription({ status: "canceled" }));
    const event = {
      created: 1784127600,
      data: {
        object: subscription({ status: "active" })
      },
      type: "customer.subscription.updated"
    } as unknown as Stripe.Event;

    await expect(
      processStripeEvent(
        event,
        { subscriptions: { retrieve } } as unknown as Stripe
      )
    ).resolves.toMatchObject({ action: "synced", status: "canceled" });
    expect(retrieve).toHaveBeenCalledWith("sub_test");
    expect(syncMocks.rpc).toHaveBeenCalledWith(
      "sync_stripe_subscription_state",
      expect.objectContaining({
        p_observed_at: expect.any(String),
        p_status: "canceled"
      })
    );
  });

  it("fails malformed subscription ownership metadata before database writes", async () => {
    await expect(
      syncSubscriptionEntitlements({
        subscription: subscription({ metadata: { planId: "tier_2", userId: "bad" } })
      })
    ).rejects.toThrow("stripe_subscription_metadata_missing");

    expect(syncMocks.rpc).not.toHaveBeenCalled();
  });

  it("fails a subscription Checkout receipt without a Subscription ID", async () => {
    const event = {
      data: {
        object: {
          id: "cs_missing_subscription",
          metadata: { planId: "tier_2", userId },
          mode: "subscription",
          subscription: null
        }
      },
      type: "checkout.session.completed"
    } as unknown as Stripe.Event;

    await expect(processStripeEvent(event, {} as Stripe)).rejects.toThrow(
      "stripe_checkout_subscription_missing"
    );
    expect(syncMocks.rpc).not.toHaveBeenCalled();
  });

  it("fails processing when Stripe omits the subscription customer", async () => {
    await expect(
      syncSubscriptionEntitlements({
        subscription: subscription({ customer: null as never })
      })
    ).rejects.toThrow("stripe_subscription_customer_missing");

    expect(syncMocks.rpc).not.toHaveBeenCalled();
  });

  it("derives a paid product entitlement inside the atomic purchase RPC", async () => {
    syncMocks.rpc.mockResolvedValue({ data: "product.digital", error: null });
    const event = {
      data: {
        object: {
          id: "cs_test",
          metadata: { productId, userId },
          mode: "payment",
          payment_intent: "pi_test",
          payment_status: "paid"
        }
      },
      type: "checkout.session.completed"
    } as unknown as Stripe.Event;

    await expect(processStripeEvent(event, {} as Stripe)).resolves.toEqual({
      action: "synced_purchase",
      entitlementId: "product.digital",
      productId,
      userId
    });

    expect(syncMocks.rpc).toHaveBeenCalledWith(
      "sync_stripe_product_purchase",
      expect.objectContaining({
        p_product_id: productId,
        p_provider_payment_id: "pi_test",
        p_status: "paid",
        p_user_id: userId
      })
    );
  });

  it("fails a paid product Checkout receipt without ownership metadata", async () => {
    const event = {
      data: {
        object: {
          id: "cs_missing_purchase_metadata",
          metadata: {},
          mode: "payment",
          payment_intent: "pi_missing_purchase_metadata",
          payment_status: "paid"
        }
      },
      type: "checkout.session.completed"
    } as unknown as Stripe.Event;

    await expect(processStripeEvent(event, {} as Stripe)).rejects.toThrow(
      "stripe_purchase_metadata_missing"
    );
    expect(syncMocks.rpc).not.toHaveBeenCalled();
  });

  it("fulfills a product checkout that requires no payment", async () => {
    syncMocks.rpc.mockResolvedValue({ data: "product.digital", error: null });
    const event = {
      data: {
        object: {
          id: "cs_test_free",
          metadata: { productId, userId },
          mode: "payment",
          payment_intent: null,
          payment_status: "no_payment_required"
        }
      },
      type: "checkout.session.completed"
    } as unknown as Stripe.Event;

    await expect(processStripeEvent(event, {} as Stripe)).resolves.toMatchObject({
      action: "synced_purchase",
      productId,
      userId
    });
    expect(syncMocks.rpc).toHaveBeenCalledWith(
      "sync_stripe_product_purchase",
      expect.objectContaining({
        p_provider_payment_id: "cs_test_free",
        p_status: "no_payment_required"
      })
    );
  });

  it("waits for a delayed payment instead of granting access on session completion", async () => {
    const event = {
      data: {
        object: {
          id: "cs_test_delayed",
          metadata: { productId, userId },
          mode: "payment",
          payment_intent: "pi_delayed",
          payment_status: "unpaid"
        }
      },
      type: "checkout.session.completed"
    } as unknown as Stripe.Event;

    await expect(processStripeEvent(event, {} as Stripe)).resolves.toEqual({
      action: "awaiting_payment",
      paymentStatus: "unpaid"
    });
    expect(syncMocks.rpc).not.toHaveBeenCalled();
  });

  it("fulfills a delayed product payment after Stripe confirms it asynchronously", async () => {
    syncMocks.rpc.mockResolvedValue({ data: "product.digital", error: null });
    const event = {
      data: {
        object: {
          id: "cs_test_delayed",
          metadata: { productId, userId },
          mode: "payment",
          payment_intent: "pi_delayed",
          payment_status: "paid"
        }
      },
      type: "checkout.session.async_payment_succeeded"
    } as unknown as Stripe.Event;

    await expect(processStripeEvent(event, {} as Stripe)).resolves.toMatchObject({
      action: "synced_purchase",
      productId,
      userId
    });
    expect(syncMocks.rpc).toHaveBeenCalledWith(
      "sync_stripe_product_purchase",
      expect.objectContaining({
        p_provider_payment_id: "pi_delayed",
        p_status: "paid"
      })
    );
  });

  it("records an asynchronous payment failure without granting access", async () => {
    const event = {
      data: {
        object: {
          id: "cs_test_failed",
          mode: "payment",
          payment_status: "unpaid"
        }
      },
      type: "checkout.session.async_payment_failed"
    } as unknown as Stripe.Event;

    await expect(processStripeEvent(event, {} as Stripe)).resolves.toEqual({
      action: "payment_failed",
      paymentStatus: "unpaid"
    });
    expect(syncMocks.rpc).not.toHaveBeenCalled();
  });

  it.each([
    {
      amountRefunded: 500,
      expectedStatus: "partially_refunded",
      refunded: false
    },
    { amountRefunded: 1900, expectedStatus: "refunded", refunded: true }
  ])(
    "synchronizes a Stripe charge refund as $expectedStatus",
    async ({ amountRefunded, expectedStatus, refunded }) => {
      syncMocks.rpc.mockResolvedValue({ data: expectedStatus, error: null });
      const invoicePaymentsList = vi.fn();
      const event = {
        created: 1784127600,
        data: {
          object: {
            amount: 1900,
            amount_refunded: amountRefunded,
            currency: "usd",
            id: "ch_product_refund",
            payment_intent: {
              id: "pi_refund_test",
              metadata: { productId, userId }
            },
            refunded
          }
        },
        type: "charge.refunded"
      } as unknown as Stripe.Event;

      await expect(
        processStripeEvent(event, {
          invoicePayments: { list: invoicePaymentsList }
        } as unknown as Stripe)
      ).resolves.toEqual({
        action: "synced_purchase_refund",
        paymentId: "pi_refund_test",
        status: expectedStatus
      });
      expect(invoicePaymentsList).not.toHaveBeenCalled();
      expect(syncMocks.rpc).toHaveBeenCalledWith("sync_stripe_product_refund", {
        p_observed_at: "2026-07-15T15:00:00.000Z",
        p_provider_payment_id: "pi_refund_test",
        p_status: expectedStatus
      });
    }
  );

  it.each([
    {
      amountRefunded: 500,
      expectedStatus: "partially_refunded",
      refunded: false
    },
    { amountRefunded: 1900, expectedStatus: "refunded", refunded: true }
  ])(
    "classifies an invoice payment and synchronizes a subscription refund as $expectedStatus",
    async ({ amountRefunded, expectedStatus, refunded }) => {
      syncMocks.rpc.mockResolvedValue({ data: "tier_2", error: null });
      const paymentIntentRetrieve = vi.fn().mockResolvedValue({
        id: "pi_subscription_refund",
        metadata: {}
      });
      const invoicePaymentsList = vi.fn().mockResolvedValue({
        data: [invoicePayment()]
      });
      const invoiceRetrieve = vi
        .fn()
        .mockResolvedValue(subscriptionInvoice());
      const subscriptionRetrieve = vi
        .fn()
        .mockResolvedValue(subscription());
      const event = {
        created: 1784127600,
        data: {
          object: {
            amount: 1900,
            amount_refunded: amountRefunded,
            currency: "usd",
            id: "ch_subscription_refund",
            payment_intent: "pi_subscription_refund",
            refunded
          }
        },
        type: "charge.refunded"
      } as unknown as Stripe.Event;

      await expect(
        processStripeEvent(event, {
          invoicePayments: { list: invoicePaymentsList },
          invoices: { retrieve: invoiceRetrieve },
          paymentIntents: { retrieve: paymentIntentRetrieve },
          subscriptions: { retrieve: subscriptionRetrieve }
        } as unknown as Stripe)
      ).resolves.toEqual({
        action: "synced_subscription_refund",
        effectiveTier: "tier_2",
        paymentId: "pi_subscription_refund",
        status: expectedStatus,
        subscriptionId: "sub_test"
      });

      expect(paymentIntentRetrieve).toHaveBeenCalledWith(
        "pi_subscription_refund"
      );
      expect(invoicePaymentsList).toHaveBeenCalledWith({
        limit: 2,
        payment: {
          payment_intent: "pi_subscription_refund",
          type: "payment_intent"
        }
      });
      expect(invoiceRetrieve).toHaveBeenCalledWith("in_subscription");
      expect(subscriptionRetrieve).toHaveBeenCalledWith("sub_test");
      expect(syncMocks.rpc).toHaveBeenCalledOnce();
      expect(syncMocks.rpc).toHaveBeenCalledWith(
        "sync_stripe_subscription_adjustment",
        {
          p_amount: amountRefunded,
          p_currency: "usd",
          p_kind: "refund",
          p_observed_at: "2026-07-15T15:00:00.000Z",
          p_provider_adjustment_id: "ch_subscription_refund",
          p_provider_payment_id: "pi_subscription_refund",
          p_provider_subscription_id: "sub_test",
          p_status: expectedStatus
        }
      );
    }
  );

  it("fails a refund receipt when Stripe omits its payment intent", async () => {
    const event = {
      created: 1784127600,
      data: {
        object: {
          amount: 1900,
          amount_refunded: 1900,
          payment_intent: null,
          refunded: true
        }
      },
      type: "charge.refunded"
    } as unknown as Stripe.Event;

    await expect(processStripeEvent(event, {} as Stripe)).rejects.toThrow(
      "stripe_refund_payment_intent_missing"
    );
    expect(syncMocks.rpc).not.toHaveBeenCalled();
  });

  it("synchronizes an open product dispute through the atomic purchase RPC", async () => {
    syncMocks.rpc.mockResolvedValue({ data: "needs_response", error: null });
    const invoicePaymentsList = vi.fn();
    const event = {
      created: 1784127600,
      data: {
        object: {
          charge: "ch_dispute_test",
          id: "du_dispute_test",
          payment_intent: {
            id: "pi_dispute_test",
            metadata: { productId, userId }
          },
          status: "needs_response"
        }
      },
      type: "charge.dispute.created"
    } as unknown as Stripe.Event;

    await expect(
      processStripeEvent(event, {
        invoicePayments: { list: invoicePaymentsList }
      } as unknown as Stripe)
    ).resolves.toEqual({
      action: "synced_purchase_dispute",
      disputeId: "du_dispute_test",
      paymentId: "pi_dispute_test",
      status: "needs_response"
    });
    expect(invoicePaymentsList).not.toHaveBeenCalled();
    expect(syncMocks.rpc).toHaveBeenCalledWith("sync_stripe_product_dispute", {
      p_observed_at: "2026-07-15T15:00:00.000Z",
      p_provider_dispute_id: "du_dispute_test",
      p_provider_payment_id: "pi_dispute_test",
      p_status: "needs_response"
    });
  });

  it("resolves a dispute PaymentIntent through its Charge when Stripe omits it", async () => {
    syncMocks.rpc.mockResolvedValue({ data: "won", error: null });
    const chargeRetrieve = vi.fn().mockResolvedValue({
      payment_intent: "pi_dispute_from_charge"
    });
    const paymentIntentRetrieve = vi.fn().mockResolvedValue({
      id: "pi_dispute_from_charge",
      metadata: { productId, userId }
    });
    const event = {
      created: 1784127600,
      data: {
        object: {
          charge: "ch_dispute_fallback",
          id: "du_dispute_fallback",
          payment_intent: null,
          status: "won"
        }
      },
      type: "charge.dispute.closed"
    } as unknown as Stripe.Event;

    await expect(
      processStripeEvent(event, {
        charges: { retrieve: chargeRetrieve },
        paymentIntents: { retrieve: paymentIntentRetrieve }
      } as unknown as Stripe)
    ).resolves.toMatchObject({
      action: "synced_purchase_dispute",
      paymentId: "pi_dispute_from_charge",
      status: "won"
    });
    expect(chargeRetrieve).toHaveBeenCalledWith("ch_dispute_fallback");
    expect(paymentIntentRetrieve).toHaveBeenCalledWith(
      "pi_dispute_from_charge"
    );
  });

  it.each([
    ["charge.dispute.created", "needs_response"],
    ["charge.dispute.updated", "under_review"],
    ["charge.dispute.closed", "won"],
    ["charge.dispute.funds_withdrawn", "lost"],
    ["charge.dispute.funds_reinstated", "warning_closed"]
  ] as const)(
    "classifies a subscription Invoice Payment and dispatches %s",
    async (eventType, status) => {
      syncMocks.rpc.mockResolvedValue({ data: "tier_2", error: null });
      const invoicePaymentsList = vi.fn().mockResolvedValue({
        data: [
          invoicePayment({
            invoice: subscriptionInvoice()
          })
        ]
      });
      const subscriptionRetrieve = vi
        .fn()
        .mockResolvedValue(subscription());
      const event = {
        created: 1784127600,
        data: {
          object: {
            amount: 12_800,
            charge: "ch_subscription_dispute",
            currency: "usd",
            id: "du_subscription_dispute",
            payment_intent: {
              id: "pi_subscription_dispute",
              metadata: {}
            },
            status
          }
        },
        type: eventType
      } as unknown as Stripe.Event;

      await expect(
        processStripeEvent(event, {
          invoicePayments: { list: invoicePaymentsList },
          subscriptions: { retrieve: subscriptionRetrieve }
        } as unknown as Stripe)
      ).resolves.toEqual({
        action: "synced_subscription_dispute",
        disputeId: "du_subscription_dispute",
        effectiveTier: "tier_2",
        paymentId: "pi_subscription_dispute",
        status,
        subscriptionId: "sub_test"
      });

      expect(invoicePaymentsList).toHaveBeenCalledWith({
        limit: 2,
        payment: {
          payment_intent: "pi_subscription_dispute",
          type: "payment_intent"
        }
      });
      expect(subscriptionRetrieve).toHaveBeenCalledWith("sub_test");
      expect(syncMocks.rpc).toHaveBeenCalledOnce();
      expect(syncMocks.rpc).toHaveBeenCalledWith(
        "sync_stripe_subscription_adjustment",
        {
          p_amount: 12_800,
          p_currency: "usd",
          p_kind: "dispute",
          p_observed_at: "2026-07-15T15:00:00.000Z",
          p_provider_adjustment_id: "du_subscription_dispute",
          p_provider_payment_id: "pi_subscription_dispute",
          p_provider_subscription_id: "sub_test",
          p_status: status
        }
      );
    }
  );

  it("keeps an unmapped non-Soji dispute as a stable ignored outcome", async () => {
    const invoicePaymentsList = vi.fn().mockResolvedValue({ data: [] });
    const event = {
      created: 1784127600,
      data: {
        object: {
          amount: 12_800,
          charge: "ch_external_dispute",
          currency: "usd",
          id: "du_external_dispute",
          payment_intent: {
            id: "pi_external_dispute",
            metadata: {}
          },
          status: "under_review"
        }
      },
      type: "charge.dispute.updated"
    } as unknown as Stripe.Event;

    await expect(
      processStripeEvent(event, {
        invoicePayments: { list: invoicePaymentsList }
      } as unknown as Stripe)
    ).resolves.toEqual({
      action: "ignored",
      reason: "dispute_not_soji_checkout"
    });
    expect(syncMocks.rpc).not.toHaveBeenCalled();
  });

  it.each([
    {
      invoicePayments: [invoicePayment(), invoicePayment({ id: "ip_second" })],
      name: "ambiguous Invoice Payment mapping",
      reason: "stripe_invoice_payment_ambiguous"
    },
    {
      invoicePayments: [
        invoicePayment({
          invoice: {
            deleted: true,
            id: "in_deleted",
            object: "invoice"
          }
        })
      ],
      name: "deleted Invoice",
      reason: "stripe_invoice_payment_invoice_deleted"
    },
    {
      invoicePayments: [
        invoicePayment({
          invoice: subscriptionInvoice({ parent: null })
        })
      ],
      name: "Invoice without a subscription parent",
      reason: "stripe_invoice_payment_subscription_parent_missing"
    }
  ])("fails $name before any adjustment RPC", async ({ invoicePayments, reason }) => {
    const event = {
      created: 1784127600,
      data: {
        object: {
          amount: 12_800,
          charge: "ch_malformed_mapping",
          currency: "usd",
          id: "du_malformed_mapping",
          payment_intent: {
            id: "pi_malformed_mapping",
            metadata: {}
          },
          status: "under_review"
        }
      },
      type: "charge.dispute.updated"
    } as unknown as Stripe.Event;

    await expect(
      processStripeEvent(event, {
        invoicePayments: {
          list: vi.fn().mockResolvedValue({ data: invoicePayments })
        }
      } as unknown as Stripe)
    ).rejects.toThrow(reason);
    expect(syncMocks.rpc).not.toHaveBeenCalled();
  });

  it("fails invalid current Subscription metadata before the adjustment RPC", async () => {
    const invoicePaymentsList = vi.fn().mockResolvedValue({
      data: [
        invoicePayment({
          invoice: subscriptionInvoice()
        })
      ]
    });
    const subscriptionRetrieve = vi.fn().mockResolvedValue(
      subscription({
        metadata: {
          planId: "tier_2",
          userId: "not-a-uuid"
        }
      })
    );
    const event = {
      created: 1784127600,
      data: {
        object: {
          amount: 12_800,
          charge: "ch_invalid_metadata",
          currency: "usd",
          id: "du_invalid_metadata",
          payment_intent: {
            id: "pi_invalid_metadata",
            metadata: {}
          },
          status: "under_review"
        }
      },
      type: "charge.dispute.updated"
    } as unknown as Stripe.Event;

    await expect(
      processStripeEvent(event, {
        invoicePayments: { list: invoicePaymentsList },
        subscriptions: { retrieve: subscriptionRetrieve }
      } as unknown as Stripe)
    ).rejects.toThrow("stripe_subscription_metadata_missing");
    expect(syncMocks.rpc).not.toHaveBeenCalled();
  });

  it("uses the Charge fallback before exact subscription dispute classification", async () => {
    syncMocks.rpc.mockResolvedValue({ data: "tier_2", error: null });
    const chargeRetrieve = vi.fn().mockResolvedValue({
      payment_intent: "pi_subscription_from_charge"
    });
    const paymentIntentRetrieve = vi.fn().mockResolvedValue({
      id: "pi_subscription_from_charge",
      metadata: {}
    });
    const invoicePaymentsList = vi.fn().mockResolvedValue({
      data: [
        invoicePayment({
          invoice: subscriptionInvoice(),
          payment: {
            payment_intent: "pi_subscription_from_charge",
            type: "payment_intent"
          }
        })
      ]
    });
    const subscriptionRetrieve = vi
      .fn()
      .mockResolvedValue(subscription());
    const event = {
      created: 1784127600,
      data: {
        object: {
          amount: 12_800,
          charge: "ch_subscription_fallback",
          currency: "usd",
          id: "du_subscription_fallback",
          payment_intent: null,
          status: "under_review"
        }
      },
      type: "charge.dispute.updated"
    } as unknown as Stripe.Event;

    await expect(
      processStripeEvent(event, {
        charges: { retrieve: chargeRetrieve },
        invoicePayments: { list: invoicePaymentsList },
        paymentIntents: { retrieve: paymentIntentRetrieve },
        subscriptions: { retrieve: subscriptionRetrieve }
      } as unknown as Stripe)
    ).resolves.toMatchObject({
      action: "synced_subscription_dispute",
      paymentId: "pi_subscription_from_charge",
      subscriptionId: "sub_test"
    });
    expect(chargeRetrieve).toHaveBeenCalledWith("ch_subscription_fallback");
    expect(paymentIntentRetrieve).toHaveBeenCalledWith(
      "pi_subscription_from_charge"
    );
    expect(invoicePaymentsList).toHaveBeenCalledWith({
      limit: 2,
      payment: {
        payment_intent: "pi_subscription_from_charge",
        type: "payment_intent"
      }
    });
  });

  it.each([
    {
      eventType: "charge.dispute.funds_withdrawn",
      status: "needs_response"
    },
    {
      eventType: "charge.dispute.funds_reinstated",
      status: "won"
    }
  ] as const)(
    "synchronizes $eventType through the same idempotent dispute state machine",
    async ({ eventType, status }) => {
      syncMocks.rpc.mockResolvedValue({ data: status, error: null });
      const event = {
        created: 1784127600,
        data: {
          object: {
            charge: "ch_dispute_funds",
            id: "du_dispute_funds",
            payment_intent: {
              id: "pi_dispute_funds",
              metadata: { productId, userId }
            },
            status
          }
        },
        type: eventType
      } as unknown as Stripe.Event;

      await expect(processStripeEvent(event, {} as Stripe)).resolves.toMatchObject({
        action: "synced_purchase_dispute",
        paymentId: "pi_dispute_funds",
        status
      });
    }
  );

  it("surfaces an RPC failure so the receipt can be marked failed and retried", async () => {
    syncMocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "transaction_rolled_back" }
    });

    await expect(
      syncSubscriptionEntitlements({ subscription: subscription() })
    ).rejects.toThrow("transaction_rolled_back");
  });

  it("closes stale customer subscriptions through the atomic synchronization RPC", async () => {
    syncMocks.rpc.mockResolvedValue({ data: 1, error: null });

    await expect(
      closeMissingCustomerSubscriptions(
        "cus_test",
        new Set(["sub_remote", "sub_also_remote"]),
        "2026-07-26T12:30:00.000Z"
      )
    ).resolves.toBe(1);

    expect(syncMocks.rpc).toHaveBeenCalledOnce();
    expect(syncMocks.rpc).toHaveBeenCalledWith(
      "close_missing_stripe_customer_subscriptions",
      {
        p_provider_customer_id: "cus_test",
        p_reconciliation_started_at: "2026-07-26T12:30:00.000Z",
        p_remote_subscription_ids: ["sub_also_remote", "sub_remote"]
      }
    );
  });

  it("surfaces stale-close RPC failures so customer reconciliation stays retryable", async () => {
    syncMocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "atomic_close_failed" }
    });

    await expect(
      closeMissingCustomerSubscriptions(
        "cus_test",
        new Set(),
        "2026-07-26T12:30:00.000Z"
      )
    ).rejects.toThrow("atomic_close_failed");
  });
});
