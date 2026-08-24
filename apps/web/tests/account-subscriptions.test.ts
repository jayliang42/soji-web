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
        accessLabel: "访问权限有效",
        detail: null,
        primaryLabel: "有效",
        tone: "success"
      }
    ],
    [
      "trialing",
      false,
      {
        accessLabel: "访问权限有效",
        detail: null,
        primaryLabel: "试用中",
        tone: "success"
      }
    ],
    [
      "active",
      true,
      {
        accessLabel: "访问权限有效",
        detail: null,
        primaryLabel: "将在当前周期结束时取消",
        tone: "success"
      }
    ],
    [
      "incomplete",
      false,
      {
        accessLabel: "暂不可访问",
        detail:
          "请在账单管理中完成或更新付款。Stripe 确认订阅有效后，访问权限才会恢复。",
        primaryLabel: "付款未完成",
        tone: "warning"
      }
    ],
    [
      "past_due",
      false,
      {
        accessLabel: "访问权限已暂停",
        detail:
          "请在账单管理中更新付款。Stripe 确认订阅有效后，访问权限才会恢复。",
        primaryLabel: "付款异常",
        tone: "warning"
      }
    ],
    [
      "unpaid",
      false,
      {
        accessLabel: "访问权限已暂停",
        detail:
          "请在账单管理中检查付款。Stripe 确认订阅有效后，访问权限才会恢复。",
        primaryLabel: "尚未付款",
        tone: "warning"
      }
    ],
    [
      "paused",
      false,
      {
        accessLabel: "访问权限已暂停",
        detail:
          "请在账单管理中检查订阅。仅打开账单页面不会自动恢复访问权限。",
        primaryLabel: "已暂停",
        tone: "warning"
      }
    ],
    [
      "incomplete_expired",
      false,
      {
        accessLabel: "无访问权限",
        detail: "请选择会员方案并重新发起结账。",
        primaryLabel: "结账已过期",
        tone: "neutral"
      }
    ],
    [
      "canceled",
      false,
      {
        accessLabel: "访问权限已结束",
        detail: null,
        primaryLabel: "已取消",
        tone: "neutral"
      }
    ],
    [
      "future_provider_state",
      false,
      {
        accessLabel: "暂不可访问",
        detail:
          "暂时无法核实此订阅状态。请重试并确认状态后再使用会员内容。",
        primaryLabel: "状态不可用",
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
      accessLabel: "访问权限已暂停",
      detail: "付款争议审核期间，访问权限会暂停。",
      primaryLabel: "付款存在争议",
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
      accessLabel: "访问权限已结束",
      detail: "这笔付款已不再提供会员访问权限。",
      primaryLabel: "付款争议败诉",
      tone: "error"
    });
    expect(
      getSubscriptionBillingPresentation({
        ...baseSubscription,
        billingAdjustments: [resolved, fullyRefunded, open]
      }).primaryLabel
    ).toBe("付款存在争议");
    expect(
      getSubscriptionBillingPresentation({
        ...baseSubscription,
        billingAdjustments: [resolved, fullyRefunded]
      })
    ).toEqual({
      accessLabel: "访问权限已结束",
      detail: "全额退款后，此订阅的访问权限已结束。",
      primaryLabel: "付款已退款",
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
        accessLabel: "访问权限有效",
        detail:
          "付款争议已解决，此订阅当前有效。",
        primaryLabel: "有效",
        tone: "success"
      });
      expect(
        getSubscriptionBillingPresentation({
          ...baseSubscription,
          billingAdjustments: [adjustment("dispute", status)],
          status: "past_due"
        })
      ).toEqual({
        accessLabel: "访问权限已暂停",
        detail:
          "付款争议已解决，但此订阅当前仍不符合访问条件。",
        primaryLabel: "付款异常",
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
      accessLabel: "访问权限有效",
      detail: "访问权限会持续到当前已付款周期结束。",
      primaryLabel: "已部分退款",
      tone: "success"
    });
    expect(
      getSubscriptionBillingPresentation({
        ...baseSubscription,
        billingAdjustments: [adjustment("refund", "partially_refunded")],
        status: "paused"
      })
    ).toEqual({
      accessLabel: "访问权限已暂停",
      detail: "已记录部分退款，但不会因此恢复访问权限。",
      primaryLabel: "已暂停",
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
      accessLabel: "访问权限有效",
      detail: null,
      primaryLabel: "有效",
      tone: "success"
    });
    expect(JSON.stringify(presentation)).not.toMatch(/dp_|pi_|sub_|cus_/);
  });
});
