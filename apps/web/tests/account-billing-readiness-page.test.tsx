import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pageMocks = vi.hoisted(() => ({
  getAccountMembershipPurchases: vi.fn(),
  getAccountPurchases: vi.fn(),
  getAccountSubscriptions: vi.fn(),
  getBillingDeliveryReadiness: vi.fn(),
  getCheckoutReturnStatus: vi.fn(),
  getSessionSnapshot: vi.fn()
}));

vi.mock("@/lib/account-purchases", () => ({
  getAccountMembershipPurchases: pageMocks.getAccountMembershipPurchases,
  getAccountPurchases: pageMocks.getAccountPurchases
}));
vi.mock("@/lib/account-subscriptions", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/account-subscriptions")
  >("@/lib/account-subscriptions");
  return {
    ...actual,
    getAccountSubscriptions: pageMocks.getAccountSubscriptions
  };
});
vi.mock("@/lib/billing-readiness", () => ({
  getBillingDeliveryReadiness: pageMocks.getBillingDeliveryReadiness,
  isBillingDeliveryReady: (readiness: {
    stripeWebhookConfigured: boolean;
    supabaseServiceRoleOperational: boolean;
  }) =>
    readiness.stripeWebhookConfigured &&
    readiness.supabaseServiceRoleOperational
}));
vi.mock("@/lib/checkout-return", () => ({
  getCheckoutReturnStatus: pageMocks.getCheckoutReturnStatus
}));
vi.mock("@/lib/session", () => ({
  getSessionSnapshot: pageMocks.getSessionSnapshot
}));
vi.mock("@/components/auth-status", () => ({ AuthStatus: () => null }));

import AccountPage from "@/app/account/page";
import AccountLoading from "@/app/account/loading";

const subscription = {
  billingAdjustments: [],
  cancelAtPeriodEnd: false,
  cancelledAt: null,
  canManage: true,
  createdAt: "2026-07-01T12:00:00Z",
  currentPeriodEndsAt: "2026-08-01T12:00:00Z",
  id: "subscription-id",
  planId: "tier_1",
  planName: "Essential",
  provider: "stripe",
  status: "active"
};

function purchase({
  disputeStatus = null,
  downloadReady = false,
  status = "paid"
}: {
  disputeStatus?: string | null;
  downloadReady?: boolean;
  status?: string;
} = {}) {
  return {
    createdAt: "2026-07-15T12:00:00Z",
    disputeStatus,
    downloadReady,
    id: "purchase-id",
    productId: "product-id",
    productSlug: "wealth-workbook",
    productTitle: "Wealth workbook",
    status
  };
}

async function renderAccount(
  searchParams: {
    checkout?: string;
    purchase?: string;
    session_id?: string;
    view?: string;
  } = {}
) {
  return renderToStaticMarkup(
    await AccountPage({ searchParams: Promise.resolve(searchParams) })
  );
}

describe("account billing management readiness", () => {
  beforeEach(() => {
    for (const mock of Object.values(pageMocks)) mock.mockReset();
    pageMocks.getSessionSnapshot.mockResolvedValue({
      entitlements: [],
      source: "supabase",
      user: {
        avatarUrl: null,
        email: "member@example.com",
        fullName: "Member",
        id: "user-id",
        providers: ["email"],
        roles: ["member"],
        tier: "tier_1"
      }
    });
    pageMocks.getAccountPurchases.mockResolvedValue({ items: [] });
    pageMocks.getAccountMembershipPurchases.mockResolvedValue({ items: [] });
    pageMocks.getAccountSubscriptions.mockResolvedValue({
      items: [subscription]
    });
    pageMocks.getCheckoutReturnStatus.mockResolvedValue({
      kind: null,
      state: "none"
    });
    pageMocks.getBillingDeliveryReadiness.mockResolvedValue({
      stripeWebhookConfigured: true,
      supabaseServiceRoleOperational: true
    });
  });

  it("preserves Account billing geometry without flashing authoritative states", () => {
    const html = renderToStaticMarkup(<AccountLoading />);

    expect(html).toContain('role="status"');
    expect(html).toContain("正在加载账户和账单信息…");
    expect(html).toContain('data-loading-section="current-tier"');
    expect(html).toContain('data-loading-section="subscriptions"');
    expect(html).toContain('data-loading-section="purchases"');
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).not.toContain(">Free<");
    expect(html).not.toContain("No access");
    expect(html).not.toContain(
      "No membership subscriptions have been recorded for this account."
    );
    expect(html).not.toContain(
      "No standalone purchases have been recorded for this account."
    );
  });

  it("renders neutral placeholders when account truth cannot be verified", async () => {
    pageMocks.getSessionSnapshot.mockResolvedValue({
      entitlements: ["content.basic"],
      error: "session_query_failed",
      source: "supabase",
      user: {
        avatarUrl: null,
        email: "member@example.com",
        fullName: "Member",
        id: "user-id",
        providers: ["email"],
        roles: ["member"],
        tier: "free"
      }
    });

    const html = await renderAccount();

    expect(html).toContain("账户服务暂不可用");
    expect(html).toContain("会员状态不可用");
    expect(html).toContain("暂时无法核实权益。");
    expect(html).not.toMatch(/\bFree\b/);
    expect(html).not.toContain("No paid benefits are active yet.");
    expect(html).not.toContain("基础月度文章");
  });

  it("suppresses successful billing truth and actions when session truth is degraded", async () => {
    pageMocks.getSessionSnapshot.mockResolvedValue({
      entitlements: ["content.basic"],
      error: "session_query_failed",
      source: "supabase",
      user: {
        avatarUrl: null,
        email: "member@example.com",
        fullName: "Member",
        id: "user-id",
        providers: ["email"],
        roles: ["member"],
        tier: "tier_1"
      }
    });
    pageMocks.getAccountSubscriptions.mockResolvedValue({
      items: [subscription]
    });
    pageMocks.getAccountPurchases.mockResolvedValue({
      items: [purchase({ downloadReady: true })]
    });
    pageMocks.getCheckoutReturnStatus.mockResolvedValue({
      kind: "product",
      state: "confirmed"
    });

    const html = await renderAccount({ view: "subscriptions" });

    expect(html).toContain("无法核实订阅");
    expect(html).toContain("无法核实购买记录");
    expect(html).not.toContain(">有效<");
    expect(html).not.toContain("访问权限有效");
    expect(html).not.toContain("可以下载");
    expect(html).not.toContain("下载文件");
    expect(html).not.toContain(">管理账单<");
    expect(html).not.toContain("账单管理不可用");
    expect(html).not.toContain("升级会员");
    expect(html).not.toContain("付款已确认");
    expect(pageMocks.getBillingDeliveryReadiness).not.toHaveBeenCalled();
  });

  it("keeps membership options collapsed until the member chooses Upgrade", async () => {
    pageMocks.getAccountSubscriptions.mockResolvedValue({ items: [] });

    const html = renderToStaticMarkup(
      await AccountPage({ searchParams: Promise.resolve({}) })
    );

    expect(html).toContain(">升级会员<");
    expect(html).toContain("/account?view=subscriptions#membership-options");
    expect(html).not.toContain("选择会员升级方案");
  });

  it("provides account wayfinding and useful next-step links", async () => {
    pageMocks.getAccountSubscriptions.mockResolvedValue({ items: [] });

    const html = await renderAccount();

    expect(html).toContain('aria-label="账户页面分区"');
    expect(html).toContain('href="#account-overview"');
    expect(html).toContain('href="#account-membership"');
    expect(html).toContain('href="#account-purchases"');
    expect(html).toContain('href="#account-profile"');
    expect(html).toContain('href="/library"');
    expect(html).toContain(">浏览资料库<");
    expect(html).toContain('href="/office-hours"');
    expect(html).toContain(">查看线上答疑<");
    expect(html).not.toContain(">浏览实用工具<");
  });

  it("shows plan choices inside Account for the subscriptions view", async () => {
    pageMocks.getAccountSubscriptions.mockResolvedValue({ items: [] });

    const html = renderToStaticMarkup(
      await AccountPage({
        searchParams: Promise.resolve({ view: "subscriptions" })
      })
    );

    expect(html).toContain("选择会员升级方案");
    expect(html).toContain("无需离开账户页即可比较访问权限和支持服务。");
    expect(html).toContain("Full Access");
    expect(html).toContain("$99");
  });

  it("shows a one-time Full Access payment in billing history", async () => {
    pageMocks.getAccountSubscriptions.mockResolvedValue({ items: [] });
    pageMocks.getSessionSnapshot.mockResolvedValue({
      entitlements: ["content.all"],
      source: "supabase",
      user: {
        avatarUrl: null,
        email: "member@example.com",
        fullName: "Member",
        id: "user-id",
        providers: ["google"],
        roles: ["member"],
        tier: "tier_1"
      }
    });
    pageMocks.getAccountMembershipPurchases.mockResolvedValue({
      items: [
        {
          createdAt: "2026-08-24T19:09:48Z",
          disputeStatus: null,
          id: "membership-purchase-1",
          planId: "tier_1",
          planName: "Full Access",
          provider: "stripe",
          status: "paid"
        }
      ]
    });

    const html = await renderAccount();

    expect(html).toContain("购买记录");
    expect(html).toContain("一次性会员购买");
    expect(html).toContain("Full Access");
    expect(html).toContain("付款已确认");
    expect(html).toContain("Full Access 权限有效");
    expect(html).toContain("Stripe");
    expect(html).toContain("2026年8月24日");
    expect(html).not.toContain("No standalone purchases yet");
  });

  it.each([
    {
      disputeStatus: null,
      expected: ["已退款", "访问权限已结束"],
      name: "full refund",
      status: "refunded"
    },
    {
      disputeStatus: "needs_response",
      expected: ["付款存在争议", "访问权限已暂停"],
      name: "open dispute",
      status: "paid"
    }
  ])("shows conservative membership billing truth for $name", async ({
    disputeStatus,
    expected,
    status
  }) => {
    pageMocks.getAccountSubscriptions.mockResolvedValue({ items: [] });
    pageMocks.getAccountMembershipPurchases.mockResolvedValue({
      items: [
        {
          createdAt: "2026-08-24T19:09:48Z",
          disputeStatus,
          id: "membership-purchase-1",
          planId: "tier_1",
          planName: "Full Access",
          provider: "stripe",
          status
        }
      ]
    });

    const html = await renderAccount();

    for (const copy of expected) expect(html).toContain(copy);
    expect(html).not.toContain("Full Access 权限有效");
  });

  it("locks Portal controls when secure billing updates cannot be received", async () => {
    pageMocks.getBillingDeliveryReadiness.mockResolvedValue({
      stripeWebhookConfigured: false,
      supabaseServiceRoleOperational: true
    });

    const html = renderToStaticMarkup(
      await AccountPage({ searchParams: Promise.resolve({}) })
    );

    expect(html).toContain("账单管理暂不可用");
    expect(html).toContain(
      "在安全记录账单更新之前，订阅修改已暂停。你当前的订阅没有改变。"
    );
    expect(html).toContain("账单管理不可用");
    expect(html).toContain(
      "在安全记录账单更新之前，相关修改已暂停。请稍后刷新账户页重试。"
    );
    expect(html).not.toContain(">管理账单<");
  });

  it("keeps Portal controls available when secure billing delivery is ready", async () => {
    pageMocks.getBillingDeliveryReadiness.mockResolvedValue({
      stripeWebhookConfigured: true,
      supabaseServiceRoleOperational: true
    });

    const html = renderToStaticMarkup(
      await AccountPage({ searchParams: Promise.resolve({}) })
    );

    expect(html).toContain("管理账单");
    expect(html).toContain(
      "将打开 Stripe，用于更新付款方式或取消此订阅。"
    );
    expect(html).not.toContain("账单管理暂不可用");
  });

  it.each([
    {
      adjustments: [],
      expected: ["有效", "访问权限有效", "续费日期", "2026年8月1日"],
      name: "active",
      status: "active"
    },
    {
      adjustments: [
        {
          blocksAccess: true,
          kind: "dispute",
          observedAt: "2026-07-10T12:00:00Z",
          status: "under_review",
          supersededAt: null
        }
      ],
      expected: [
        "付款存在争议",
        "访问权限已暂停",
        "付款争议审核期间，访问权限会暂停。"
      ],
      name: "open dispute",
      status: "active"
    },
    {
      adjustments: [
        {
          blocksAccess: true,
          kind: "dispute",
          observedAt: "2026-07-10T12:00:00Z",
          status: "lost",
          supersededAt: null
        }
      ],
      expected: [
        "付款争议败诉",
        "访问权限已结束",
        "这笔付款已不再提供会员访问权限。"
      ],
      name: "lost dispute",
      status: "active"
    },
    {
      adjustments: [
        {
          blocksAccess: true,
          kind: "refund",
          observedAt: "2026-07-10T12:00:00Z",
          status: "refunded",
          supersededAt: null
        }
      ],
      expected: [
        "付款已退款",
        "访问权限已结束",
        "全额退款后，此订阅的访问权限已结束。"
      ],
      name: "full refund",
      status: "active"
    },
    {
      adjustments: [
        {
          blocksAccess: false,
          kind: "refund",
          observedAt: "2026-07-10T12:00:00Z",
          status: "partially_refunded",
          supersededAt: null
        }
      ],
      expected: [
        "付款异常",
        "访问权限已暂停",
        "已记录部分退款，但不会因此恢复访问权限。"
      ],
      name: "partial refund on an ineligible subscription",
      status: "past_due"
    },
    {
      adjustments: [
        {
          blocksAccess: false,
          kind: "dispute",
          observedAt: "2026-07-10T12:00:00Z",
          status: "won",
          supersededAt: null
        }
      ],
      expected: [
        "付款异常",
        "访问权限已暂停",
        "付款争议已解决，但此订阅当前仍不符合访问条件。"
      ],
      name: "resolved dispute on an ineligible subscription",
      status: "past_due"
    },
    {
      adjustments: [],
      expected: [
        "状态不可用",
        "暂不可访问",
        "暂时无法核实此订阅状态。请重试并确认状态后再使用会员内容。"
      ],
      name: "unknown provider state",
      status: "future_provider_state"
    }
  ])("renders exact membership truth for $name", async ({
    adjustments,
    expected,
    status
  }) => {
    pageMocks.getAccountSubscriptions.mockResolvedValue({
      items: [
        {
          ...subscription,
          billingAdjustments: adjustments,
          status
        }
      ]
    });

    const html = await renderAccount();

    for (const copy of expected) expect(html).toContain(copy);
    expect(html).not.toContain("future_provider_state");
    expect(html).not.toMatch(/dp_secret|pi_secret|sub_secret|cus_secret/);
  });

  it("uses semantic cancellation and trial dates", async () => {
    pageMocks.getAccountSubscriptions.mockResolvedValue({
      items: [
        {
          ...subscription,
          cancelAtPeriodEnd: true,
          currentPeriodEndsAt: "2026-08-01T12:00:00Z"
        },
        {
          ...subscription,
          id: "trial",
          status: "trialing"
        },
        {
          ...subscription,
          cancelledAt: "2026-07-20T12:00:00Z",
          canManage: false,
          id: "canceled",
          status: "canceled"
        }
      ]
    });

    const html = await renderAccount();

    expect(html).toContain("访问权限有效至");
    expect(html).toContain("试用结束于");
    expect(html).toContain("结束于");
    expect(html).toContain('dateTime="2026-08-01T12:00:00Z"');
    expect(html).toContain('dateTime="2026-07-20T12:00:00Z"');
  });

  it("does not let a confirmed return query render active access", async () => {
    pageMocks.getCheckoutReturnStatus.mockResolvedValue({
      kind: "subscription",
      state: "confirmed"
    });
    pageMocks.getAccountSubscriptions.mockResolvedValue({ items: [] });

    const html = await renderAccount({
      checkout: "success",
      session_id: "cs_test_return"
    });

    expect(html).toContain("付款已确认");
    expect(html).toContain(
      "安全 webhook 完成同步后，会员权限会显示在下方。"
    );
    expect(html).not.toContain("访问权限有效");
    expect(html).not.toContain("Access granted");
  });

  it("renders query failures without false empty states", async () => {
    pageMocks.getAccountSubscriptions.mockResolvedValue({
      error: "subscription_query_failed",
      items: []
    });
    pageMocks.getAccountPurchases.mockResolvedValue({
      error: "purchase_query_failed",
      items: []
    });

    const html = await renderAccount();

    expect(html).toContain("无法刷新订阅");
    expect(html).toContain("无法刷新购买记录");
    expect(html).not.toContain(
      "No membership subscriptions have been recorded for this account."
    );
    expect(html).not.toContain(
      "No standalone purchases have been recorded for this account."
    );
  });

  it("shows a full refund as ended access instead of pending delivery", async () => {
    pageMocks.getAccountSubscriptions.mockResolvedValue({ items: [] });
    pageMocks.getAccountPurchases.mockResolvedValue({
      items: [
        purchase({
          disputeStatus: "won",
          downloadReady: true,
          status: "refunded"
        })
      ]
    });

    const html = renderToStaticMarkup(
      await AccountPage({ searchParams: Promise.resolve({}) })
    );

    expect(html).toContain("已退款");
    expect(html).toContain("访问权限已结束");
    expect(html).not.toContain("Delivery pending");
    expect(html).not.toContain(`/api/account/purchases/purchase-id/download`);
  });

  it("keeps download access visible after a partial refund", async () => {
    pageMocks.getAccountSubscriptions.mockResolvedValue({ items: [] });
    pageMocks.getAccountPurchases.mockResolvedValue({
      items: [
        purchase({ downloadReady: true, status: "partially_refunded" })
      ]
    });

    const html = renderToStaticMarkup(
      await AccountPage({ searchParams: Promise.resolve({}) })
    );

    expect(html).toContain("已部分退款");
    expect(html).toContain(`/api/account/purchases/purchase-id/download`);
    expect(html).toContain(">下载文件<");
    expect(html).toContain('aria-label="下载 Wealth workbook"');
    expect(html).toContain("可以下载");
    expect(html).not.toContain("访问权限已结束");
  });

  it("shows an open dispute as paused access without a download command", async () => {
    pageMocks.getAccountSubscriptions.mockResolvedValue({ items: [] });
    pageMocks.getAccountPurchases.mockResolvedValue({
      items: [
        purchase({ disputeStatus: "needs_response" })
      ]
    });

    const html = renderToStaticMarkup(
      await AccountPage({ searchParams: Promise.resolve({}) })
    );

    expect(html).toContain("付款存在争议");
    expect(html).toContain("访问权限已暂停");
    expect(html).not.toContain(`/api/account/purchases/purchase-id/download`);
  });

  it("restores the download command after a dispute win", async () => {
    pageMocks.getAccountSubscriptions.mockResolvedValue({ items: [] });
    pageMocks.getAccountPurchases.mockResolvedValue({
      items: [
        purchase({ disputeStatus: "won", downloadReady: true })
      ]
    });

    const html = renderToStaticMarkup(
      await AccountPage({ searchParams: Promise.resolve({}) })
    );

    expect(html).toContain("付款已确认 · 付款争议胜诉");
    expect(html).toContain("可以下载");
    expect(html).toContain(`/api/account/purchases/purchase-id/download`);
    expect(html).not.toContain("访问权限已暂停");
  });

  it.each([
    {
      disputeStatus: null,
      downloadReady: true,
      expectedAccess: "可以下载",
      expectedPrimary: "付款已确认",
      shouldDownload: true,
      status: "paid"
    },
    {
      disputeStatus: null,
      downloadReady: true,
      expectedAccess: "可以下载",
      expectedPrimary: "付款已确认",
      shouldDownload: true,
      status: "no_payment_required"
    },
    {
      disputeStatus: null,
      downloadReady: false,
      expectedAccess: "Stripe 确认付款后即可下载。",
      expectedPrimary: "付款待确认",
      shouldDownload: false,
      status: "pending"
    },
    {
      disputeStatus: null,
      downloadReady: false,
      expectedAccess: "暂不可交付",
      expectedPrimary: "付款已确认",
      shouldDownload: false,
      status: "paid"
    },
    {
      disputeStatus: "lost",
      downloadReady: true,
      expectedAccess: "访问权限已结束",
      expectedPrimary: "付款争议败诉",
      shouldDownload: false,
      status: "paid"
    },
    {
      disputeStatus: "warning_closed",
      downloadReady: true,
      expectedAccess: "可以下载",
      expectedPrimary: "付款已确认 · 调查已结束",
      shouldDownload: true,
      status: "paid"
    },
    {
      disputeStatus: null,
      downloadReady: true,
      expectedAccess: "暂不可交付",
      expectedPrimary: "状态不可用",
      shouldDownload: false,
      status: "future_payment_state"
    }
  ])(
    "renders product $expectedPrimary truth and authorizes only eligible downloads",
    async ({
      disputeStatus,
      downloadReady,
      expectedAccess,
      expectedPrimary,
      shouldDownload,
      status
    }) => {
      pageMocks.getAccountSubscriptions.mockResolvedValue({ items: [] });
      pageMocks.getAccountPurchases.mockResolvedValue({
        items: [purchase({ disputeStatus, downloadReady, status })]
      });

      const html = await renderAccount();

      expect(html).toContain(expectedPrimary);
      expect(html).toContain(expectedAccess);
      expect(html.includes(">下载文件<")).toBe(shouldDownload);
      expect(html).not.toContain("future_payment_state");
    }
  );
});
