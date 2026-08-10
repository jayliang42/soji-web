import { beforeEach, describe, expect, it, vi } from "vitest";

const subscriptionMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  eq: vi.fn(),
  from: vi.fn(),
  order: vi.fn(),
  reportOperationalError: vi.fn(),
  select: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: subscriptionMocks.createSupabaseServerClient
}));
vi.mock("@/lib/observability", () => ({
  reportOperationalError: subscriptionMocks.reportOperationalError
}));

import {
  getAccountSubscriptions,
  getSubscriptionBillingPresentation,
  hasOpenStripeMembership,
  isManageableSubscriptionStatus
} from "@/lib/account-subscriptions";

const baseSubscription = {
  billingAdjustments: [],
  canManage: true,
  cancelAtPeriodEnd: false,
  cancelledAt: null,
  createdAt: "2026-07-01T12:00:00Z",
  currentPeriodEndsAt: "2026-08-01T12:00:00Z",
  id: "subscription-id",
  planId: "tier_2" as const,
  planName: "Tier 2",
  provider: "stripe" as const,
  status: "active"
};

function adjustment(
  kind: "dispute" | "refund",
  status: string,
  blocksAccess = false,
  observedAt = "2026-07-10T12:00:00Z"
) {
  return {
    blocksAccess,
    kind,
    observedAt,
    status,
    supersededAt: null
  };
}

describe("account subscription history", () => {
  beforeEach(() => {
    for (const mock of Object.values(subscriptionMocks)) mock.mockReset();
    subscriptionMocks.from.mockReturnValue({ select: subscriptionMocks.select });
    subscriptionMocks.select.mockReturnValue({ eq: subscriptionMocks.eq });
    subscriptionMocks.eq.mockReturnValue({ order: subscriptionMocks.order });
    subscriptionMocks.createSupabaseServerClient.mockResolvedValue({
      from: subscriptionMocks.from
    });
  });

  it("keeps checkout blocked for every Stripe status that still needs management", () => {
    expect(
      ["active", "trialing", "incomplete", "past_due", "unpaid", "paused"].every(
        isManageableSubscriptionStatus
      )
    ).toBe(true);
    expect(isManageableSubscriptionStatus("canceled")).toBe(false);
    expect(isManageableSubscriptionStatus("incomplete_expired")).toBe(false);
    expect(
      hasOpenStripeMembership([
        {
          billingAdjustments: [],
          canManage: true,
          cancelAtPeriodEnd: false,
          cancelledAt: null,
          createdAt: "2026-07-01T12:00:00Z",
          currentPeriodEndsAt: null,
          id: "subscription-id",
          planId: "tier_1",
          planName: "Tier 1",
          provider: "stripe",
          status: "past_due"
        }
      ])
    ).toBe(true);
  });

  it("does not query subscription data for guests or demo sessions", async () => {
    await expect(getAccountSubscriptions(undefined, "supabase")).resolves.toEqual({
      items: []
    });
    await expect(getAccountSubscriptions("demo-user", "demo")).resolves.toEqual({
      items: [
        expect.objectContaining({
          canManage: false,
          planId: "tier_1",
          status: "canceled"
        })
      ]
    });
    expect(subscriptionMocks.from).not.toHaveBeenCalled();
  });

  it("maps status, period cancellation, and portal availability", async () => {
    subscriptionMocks.order.mockResolvedValue({
      data: [
        {
          cancel_at_period_end: true,
          cancelled_at: null,
          created_at: "2026-07-01T12:00:00Z",
          current_period_ends_at: "2026-08-01T12:00:00Z",
          id: "subscription-id",
          plan_id: "tier_2",
          provider: "stripe",
          provider_customer_id: "cus_existing",
          subscription_billing_adjustments: [
            {
              blocks_access: true,
              kind: "dispute",
              observed_at: "2026-07-10T12:00:00Z",
              provider_adjustment_id: "dp_secret",
              provider_payment_id: "pi_secret",
              status: "under_review",
              superseded_at: null
            }
          ],
          status: "active"
        }
      ],
      error: null
    });

    await expect(
      getAccountSubscriptions("user-id", "supabase")
    ).resolves.toEqual({
      items: [
        expect.objectContaining({
          canManage: true,
          cancelAtPeriodEnd: true,
          billingAdjustments: [
            {
              blocksAccess: true,
              kind: "dispute",
              observedAt: "2026-07-10T12:00:00Z",
              status: "under_review",
              supersededAt: null
            }
          ],
          planId: "tier_2",
          planName: "Full Access",
          status: "active"
        })
      ]
    });
    const select = subscriptionMocks.select.mock.calls[0]?.[0] as string;
    expect(select).toContain(
      "subscription_billing_adjustments(kind, status, blocks_access, observed_at, superseded_at)"
    );
    expect(select).not.toContain("provider_adjustment_id");
    expect(select).not.toContain("provider_payment_id");
  });

  it("requires Stripe, a Customer binding, and a manageable status for Portal", async () => {
    const row = {
      cancel_at_period_end: false,
      cancelled_at: null,
      created_at: "2026-07-01T12:00:00Z",
      current_period_ends_at: "2026-08-01T12:00:00Z",
      id: "subscription-id",
      plan_id: "tier_2",
      provider: "stripe",
      provider_customer_id: "cus_existing",
      status: "active",
      subscription_billing_adjustments: []
    };
    subscriptionMocks.order.mockResolvedValue({
      data: [
        { ...row, id: "missing-customer", provider_customer_id: null },
        { ...row, id: "canceled", status: "canceled" },
        { ...row, id: "different-provider", provider: "app_store" }
      ],
      error: null
    });

    const snapshot = await getAccountSubscriptions("user-id", "supabase");
    expect(snapshot.items).toHaveLength(3);
    expect(snapshot.items.every((item) => item.canManage === false)).toBe(true);
  });

  it("logs query details and returns a stable account error", async () => {
    const databaseError = { message: "sensitive subscriptions policy detail" };
    subscriptionMocks.order.mockResolvedValue({ data: null, error: databaseError });

    await expect(
      getAccountSubscriptions("user-id", "supabase")
    ).resolves.toEqual({ error: "subscription_query_failed", items: [] });
    expect(subscriptionMocks.reportOperationalError).toHaveBeenCalledWith(
      "account.subscriptions_query_failed",
      databaseError,
      { userId: "user-id" }
    );
  });

  it.each([
    [
      "active",
      false,
      {
        accessLabel: "Access active",
        detail: null,
        primaryLabel: "Active",
        tone: "success"
      }
    ],
    [
      "trialing",
      false,
      {
        accessLabel: "Access active",
        detail: null,
        primaryLabel: "Trial",
        tone: "success"
      }
    ],
    [
      "active",
      true,
      {
        accessLabel: "Access active",
        detail: null,
        primaryLabel: "Cancels at period end",
        tone: "success"
      }
    ],
    [
      "incomplete",
      false,
      {
        accessLabel: "Access unavailable",
        detail:
          "Complete or update payment in billing. Access returns only after Stripe confirms an eligible subscription.",
        primaryLabel: "Payment incomplete",
        tone: "warning"
      }
    ],
    [
      "past_due",
      false,
      {
        accessLabel: "Access paused",
        detail:
          "Update payment in billing. Access returns only after Stripe confirms an eligible subscription.",
        primaryLabel: "Payment issue",
        tone: "warning"
      }
    ],
    [
      "unpaid",
      false,
      {
        accessLabel: "Access paused",
        detail:
          "Review payment in billing. Access returns only after Stripe confirms an eligible subscription.",
        primaryLabel: "Unpaid",
        tone: "warning"
      }
    ],
    [
      "paused",
      false,
      {
        accessLabel: "Access paused",
        detail:
          "Review the subscription in billing. Opening billing does not itself restore access.",
        primaryLabel: "Paused",
        tone: "warning"
      }
    ],
    [
      "incomplete_expired",
      false,
      {
        accessLabel: "No access",
        detail: "Choose a membership plan to start a new checkout.",
        primaryLabel: "Checkout expired",
        tone: "neutral"
      }
    ],
    [
      "canceled",
      false,
      {
        accessLabel: "Access ended",
        detail: null,
        primaryLabel: "Canceled",
        tone: "neutral"
      }
    ],
    [
      "future_provider_state",
      false,
      {
        accessLabel: "Access unavailable",
        detail:
          "We could not verify this subscription state. Try again before relying on access.",
        primaryLabel: "Status unavailable",
        tone: "neutral"
      }
    ]
  ])(
    "maps the %s subscription status without exposing the raw provider value",
    (status, cancelAtPeriodEnd, expected) => {
      expect(
        getSubscriptionBillingPresentation({
          ...baseSubscription,
          cancelAtPeriodEnd,
          status
        })
      ).toEqual(expected);
      expect(JSON.stringify(expected)).not.toContain("future_provider_state");
    }
  );

  it.each([
    "warning_needs_response",
    "warning_under_review",
    "needs_response",
    "under_review"
  ])("pauses access for the open dispute state %s", (status) => {
    expect(
      getSubscriptionBillingPresentation({
        ...baseSubscription,
        billingAdjustments: [adjustment("dispute", status, true)]
      })
    ).toEqual({
      accessLabel: "Access paused",
      detail: "Access is paused while the payment dispute is under review.",
      primaryLabel: "Payment disputed",
      tone: "warning"
    });
  });

  it("prioritizes lost disputes, then open disputes, then full refunds", () => {
    const resolved = adjustment("dispute", "won");
    const fullyRefunded = adjustment("refund", "refunded", true);
    const open = adjustment("dispute", "under_review", true);
    const lost = adjustment("dispute", "lost", true);

    expect(
      getSubscriptionBillingPresentation({
        ...baseSubscription,
        billingAdjustments: [resolved, fullyRefunded, open, lost]
      })
    ).toEqual({
      accessLabel: "Access ended",
      detail: "This payment no longer provides membership access.",
      primaryLabel: "Dispute lost",
      tone: "error"
    });
    expect(
      getSubscriptionBillingPresentation({
        ...baseSubscription,
        billingAdjustments: [resolved, fullyRefunded, open]
      }).primaryLabel
    ).toBe("Payment disputed");
    expect(
      getSubscriptionBillingPresentation({
        ...baseSubscription,
        billingAdjustments: [resolved, fullyRefunded]
      })
    ).toEqual({
      accessLabel: "Access ended",
      detail: "A full refund ended access for this subscription.",
      primaryLabel: "Payment refunded",
      tone: "error"
    });
  });

  it.each(["won", "warning_closed", "prevented"])(
    "maps the resolved dispute state %s through underlying eligibility",
    (status) => {
      expect(
        getSubscriptionBillingPresentation({
          ...baseSubscription,
          billingAdjustments: [adjustment("dispute", status)]
        })
      ).toEqual({
        accessLabel: "Access active",
        detail:
          "The payment dispute is resolved and this subscription is eligible.",
        primaryLabel: "Active",
        tone: "success"
      });
      expect(
        getSubscriptionBillingPresentation({
          ...baseSubscription,
          billingAdjustments: [adjustment("dispute", status)],
          status: "past_due"
        })
      ).toEqual({
        accessLabel: "Access paused",
        detail:
          "The payment dispute is resolved, but this subscription is not currently eligible.",
        primaryLabel: "Payment issue",
        tone: "warning"
      });
    }
  );

  it("keeps partial refunds active only when the underlying subscription is eligible", () => {
    expect(
      getSubscriptionBillingPresentation({
        ...baseSubscription,
        billingAdjustments: [adjustment("refund", "partially_refunded")]
      })
    ).toEqual({
      accessLabel: "Access active",
      detail: "Access continues through the current paid period.",
      primaryLabel: "Partially refunded",
      tone: "success"
    });
    expect(
      getSubscriptionBillingPresentation({
        ...baseSubscription,
        billingAdjustments: [adjustment("refund", "partially_refunded")],
        status: "paused"
      })
    ).toEqual({
      accessLabel: "Access paused",
      detail: "A partial refund was recorded; it does not restore access.",
      primaryLabel: "Paused",
      tone: "warning"
    });
  });

  it("ignores superseded adjustments and never exposes provider identifiers", () => {
    const presentation = getSubscriptionBillingPresentation({
      ...baseSubscription,
      billingAdjustments: [
        {
          ...adjustment("dispute", "lost", true),
          supersededAt: "2026-07-20T12:00:00Z"
        }
      ]
    });

    expect(presentation).toEqual({
      accessLabel: "Access active",
      detail: null,
      primaryLabel: "Active",
      tone: "success"
    });
    expect(JSON.stringify(presentation)).not.toMatch(/dp_|pi_|sub_|cus_/);
  });
});
