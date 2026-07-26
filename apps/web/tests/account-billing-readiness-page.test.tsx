import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pageMocks = vi.hoisted(() => ({
  getAccountPurchases: vi.fn(),
  getAccountSubscriptions: vi.fn(),
  getBillingDeliveryReadiness: vi.fn(),
  getCheckoutReturnStatus: vi.fn(),
  getSessionSnapshot: vi.fn()
}));

vi.mock("@/lib/account-purchases", () => ({
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
    expect(html).toContain("Loading account billing…");
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

  it("keeps membership options collapsed until the member chooses Upgrade", async () => {
    pageMocks.getAccountSubscriptions.mockResolvedValue({ items: [] });

    const html = renderToStaticMarkup(
      await AccountPage({ searchParams: Promise.resolve({}) })
    );

    expect(html).toContain(">Upgrade<");
    expect(html).toContain("/account?view=subscriptions#membership-options");
    expect(html).not.toContain("Upgrade your membership");
  });

  it("shows plan choices inside Account for the subscriptions view", async () => {
    pageMocks.getAccountSubscriptions.mockResolvedValue({ items: [] });

    const html = renderToStaticMarkup(
      await AccountPage({
        searchParams: Promise.resolve({ view: "subscriptions" })
      })
    );

    expect(html).toContain("Upgrade your membership");
    expect(html).toContain("Compare access and support without leaving your account.");
    expect(html).toContain("Tier 1");
    expect(html).toContain("Tier 2");
    expect(html).toContain("Tier 3");
  });

  it("locks Portal controls when secure billing updates cannot be received", async () => {
    pageMocks.getBillingDeliveryReadiness.mockResolvedValue({
      stripeWebhookConfigured: false,
      supabaseServiceRoleOperational: true
    });

    const html = renderToStaticMarkup(
      await AccountPage({ searchParams: Promise.resolve({}) })
    );

    expect(html).toContain("Billing management is temporarily unavailable");
    expect(html).toContain(
      "Subscription changes are paused until secure billing updates can be recorded. Your current subscription has not been changed. Refresh Account and try again later. If billing remains unavailable, use the published Support link."
    );
    expect(html).toContain("Billing unavailable");
    expect(html).toContain(
      "Changes are paused until secure billing updates can be recorded. Refresh Account and try again later."
    );
    expect(html).not.toContain("Manage billing");
  });

  it("keeps Portal controls available when secure billing delivery is ready", async () => {
    pageMocks.getBillingDeliveryReadiness.mockResolvedValue({
      stripeWebhookConfigured: true,
      supabaseServiceRoleOperational: true
    });

    const html = renderToStaticMarkup(
      await AccountPage({ searchParams: Promise.resolve({}) })
    );

    expect(html).toContain("Manage billing");
    expect(html).toContain(
      "Opens Stripe to update payment methods or cancel this subscription."
    );
    expect(html).not.toContain("Billing management is temporarily unavailable");
  });

  it.each([
    {
      adjustments: [],
      expected: ["Active", "Access active", "Renews", "Aug 1, 2026"],
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
        "Payment disputed",
        "Access paused",
        "Access is paused while the payment dispute is under review."
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
        "Dispute lost",
        "Access ended",
        "This payment no longer provides membership access."
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
        "Payment refunded",
        "Access ended",
        "A full refund ended access for this subscription."
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
        "Payment issue",
        "Access paused",
        "A partial refund was recorded; it does not restore access."
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
        "Payment issue",
        "Access paused",
        "The payment dispute is resolved, but this subscription is not currently eligible."
      ],
      name: "resolved dispute on an ineligible subscription",
      status: "past_due"
    },
    {
      adjustments: [],
      expected: [
        "Status unavailable",
        "Access unavailable",
        "We could not verify this subscription state. Try again before relying on access."
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

    expect(html).toContain("Access through");
    expect(html).toContain("Trial ends");
    expect(html).toContain("Ended");
    expect(html).toContain('datetime="2026-08-01T12:00:00Z"');
    expect(html).toContain('datetime="2026-07-20T12:00:00Z"');
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

    expect(html).toContain("Payment confirmed.");
    expect(html).toContain(
      "Membership access will appear after the secure webhook finishes syncing."
    );
    expect(html).not.toContain("Access active");
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

    expect(html).toContain("Subscriptions could not be refreshed");
    expect(html).toContain("Purchases could not be refreshed");
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
        purchase({ status: "refunded" })
      ]
    });

    const html = renderToStaticMarkup(
      await AccountPage({ searchParams: Promise.resolve({}) })
    );

    expect(html).toContain("Refunded");
    expect(html).toContain("Access ended");
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

    expect(html).toContain("Partially refunded");
    expect(html).toContain(`/api/account/purchases/purchase-id/download`);
    expect(html).toContain(">Download file<");
    expect(html).toContain('aria-label="Download Wealth workbook"');
    expect(html).toContain("Download available");
    expect(html).not.toContain("Access ended");
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

    expect(html).toContain("Payment disputed");
    expect(html).toContain("Access paused");
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

    expect(html).toContain("Payment confirmed · Dispute won");
    expect(html).toContain("Download available");
    expect(html).toContain(`/api/account/purchases/purchase-id/download`);
    expect(html).not.toContain("Access paused");
  });

  it.each([
    {
      disputeStatus: null,
      downloadReady: false,
      expectedAccess: "Download available after Stripe confirms payment.",
      expectedPrimary: "Payment pending",
      status: "pending"
    },
    {
      disputeStatus: null,
      downloadReady: false,
      expectedAccess: "Delivery unavailable",
      expectedPrimary: "Payment confirmed",
      status: "paid"
    },
    {
      disputeStatus: "lost",
      downloadReady: true,
      expectedAccess: "Access ended",
      expectedPrimary: "Dispute lost",
      status: "paid"
    },
    {
      disputeStatus: "warning_closed",
      downloadReady: true,
      expectedAccess: "Download available",
      expectedPrimary: "Payment confirmed · Inquiry closed",
      status: "paid"
    }
  ])(
    "renders product $expectedPrimary truth and authorizes only eligible downloads",
    async ({
      disputeStatus,
      downloadReady,
      expectedAccess,
      expectedPrimary,
      status
    }) => {
      pageMocks.getAccountSubscriptions.mockResolvedValue({ items: [] });
      pageMocks.getAccountPurchases.mockResolvedValue({
        items: [purchase({ disputeStatus, downloadReady, status })]
      });

      const html = await renderAccount();

      expect(html).toContain(expectedPrimary);
      expect(html).toContain(expectedAccess);
      const shouldDownload =
        downloadReady &&
        !["lost", "needs_response", "under_review"].includes(
          disputeStatus ?? ""
        );
      expect(html.includes(">Download file<")).toBe(shouldDownload);
    }
  );
});
