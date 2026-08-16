import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pricingMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getAccountPurchases: vi.fn(),
  getAccountSubscriptions: vi.fn(),
  getBillingDeliveryReadiness: vi.fn(),
  getProductSnapshot: vi.fn(),
  getSessionSnapshot: vi.fn(),
  releaseProductCheckout: vi.fn(),
  releaseSubscriptionCheckout: vi.fn()
}));

vi.mock("@/lib/account-purchases", () => ({
  getAccountPurchases: pricingMocks.getAccountPurchases
}));
vi.mock("@/lib/account-subscriptions", () => ({
  getAccountSubscriptions: pricingMocks.getAccountSubscriptions,
  hasOpenStripeMembership: (items: Array<{ provider: string; status: string }>) =>
    items.some(
      (item) =>
        item.provider === "stripe" &&
        ["active", "trialing", "incomplete", "past_due", "unpaid", "paused"].includes(
          item.status
        )
    )
}));
vi.mock("@/lib/billing-readiness", () => ({
  getBillingDeliveryReadiness: pricingMocks.getBillingDeliveryReadiness,
  isBillingDeliveryReady: () => true
}));
vi.mock("@/lib/env", () => ({ hasStripeConfig: () => true }));
vi.mock("@/lib/products", () => ({
  getProductSnapshot: pricingMocks.getProductSnapshot
}));
vi.mock("@/lib/product-checkout-release", () => ({
  releaseProductCheckout: pricingMocks.releaseProductCheckout
}));
vi.mock("@/lib/session", () => ({
  getSessionSnapshot: pricingMocks.getSessionSnapshot
}));
vi.mock("@/lib/subscription-checkout-release", () => ({
  releaseSubscriptionCheckout: pricingMocks.releaseSubscriptionCheckout
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: pricingMocks.createSupabaseServerClient
}));

import PricingPage from "@/app/pricing/page";

const singleCaseProduct = {
  bullets: ["一次性解锁 1 篇案例"],
  entitlement: "product.case_study_single",
  id: "00000000-0000-4000-8000-000000000501",
  isActive: true,
  price: 5,
  priceLabel: "$5",
  slug: "case-study-single",
  stripePriceId: "price_single_case",
  summary: "解锁一篇真实录取案例，聚焦一个具体申请问题。",
  title: "单篇真实录取案例"
};

const signedInSession = {
  entitlements: [],
  source: "supabase" as const,
  user: {
    avatarUrl: null,
    email: "member@example.com",
    fullName: "Member",
    id: "user-id",
    providers: ["email"],
    roles: ["member"],
    tier: "free"
  }
};

describe("pricing checkout safety", () => {
  beforeEach(() => {
    for (const mock of Object.values(pricingMocks)) mock.mockReset();
    pricingMocks.getSessionSnapshot.mockResolvedValue(signedInSession);
    pricingMocks.getProductSnapshot.mockResolvedValue({
      items: [singleCaseProduct],
      source: "supabase"
    });
    pricingMocks.getAccountPurchases.mockResolvedValue({ items: [] });
    pricingMocks.getAccountSubscriptions.mockResolvedValue({ items: [] });
    pricingMocks.getBillingDeliveryReadiness.mockResolvedValue({});
    pricingMocks.createSupabaseServerClient.mockResolvedValue({ rpc: vi.fn() });
    pricingMocks.releaseProductCheckout.mockResolvedValue({ ok: true });
    pricingMocks.releaseSubscriptionCheckout.mockResolvedValue({ ok: true });
  });

  it("renders one-time $5 single-case and $99 Full Access checkouts", async () => {
    const html = renderToStaticMarkup(
      await PricingPage({ searchParams: Promise.resolve({}) })
    );

    expect(html).toContain("单篇真实录取案例");
    expect(html).toContain("55篇真实录取案例合集");
    expect(html).toContain("$5");
    expect(html).toContain("$99");
    expect(html).toContain("立即解锁");
    expect(html).toContain("一次性解锁全部 55 篇");
    expect(html).toContain("两档均为一次性支付");
    expect(html).not.toContain("monthly");
  });

  it("routes an existing Full Access owner away from both duplicate checkouts", async () => {
    pricingMocks.getSessionSnapshot.mockResolvedValue({
      ...signedInSession,
      entitlements: ["content.all", "product.digital"]
    });
    pricingMocks.getAccountSubscriptions.mockResolvedValue({
      items: [{ provider: "stripe", status: "active" }]
    });

    const html = renderToStaticMarkup(
      await PricingPage({ searchParams: Promise.resolve({}) })
    );

    expect(html).toContain("下载已包含内容");
    expect(html).toContain("查看已解锁内容");
    expect(html.match(/一次性解锁全部 55 篇/gu) ?? []).toHaveLength(1);
    expect(pricingMocks.getBillingDeliveryReadiness).not.toHaveBeenCalled();
  });

  it("keeps the $99 checkout fail-closed when membership state is unavailable", async () => {
    pricingMocks.getAccountSubscriptions.mockResolvedValue({
      error: "subscription_query_failed",
      items: []
    });

    const html = renderToStaticMarkup(
      await PricingPage({ searchParams: Promise.resolve({}) })
    );

    expect(html).toContain("购买状态暂时无法确认");
    expect(html).toContain("Checkout unavailable");
    expect(html).toContain("立即解锁");
  });

  it("keeps the $5 checkout disabled until its server product is configured", async () => {
    pricingMocks.getProductSnapshot.mockResolvedValue({
      items: [],
      source: "supabase"
    });

    const html = renderToStaticMarkup(
      await PricingPage({ searchParams: Promise.resolve({}) })
    );

    expect(html).toContain("支付配置中");
    expect(html).toContain("一次性解锁全部 55 篇");
  });

  it("places product and Full Access policy terms next to the two offers", async () => {
    const html = renderToStaticMarkup(
      await PricingPage({ searchParams: Promise.resolve({}) })
    );

    expect(html).toContain("Digital product purchase terms");
    expect(html).toContain("One billing rhythm for full access");
    expect(html.split('href="/refund-policy"')).toHaveLength(4);
    expect(html).not.toMatch(/type="checkbox"/u);
  });

  it("releases the Full Access retry guard after a cancelled Stripe checkout", async () => {
    const supabase = { rpc: vi.fn() };
    pricingMocks.createSupabaseServerClient.mockResolvedValue(supabase);

    const html = renderToStaticMarkup(
      await PricingPage({
        searchParams: Promise.resolve({ checkout: "cancelled" })
      })
    );

    expect(pricingMocks.releaseSubscriptionCheckout).toHaveBeenCalledWith(
      supabase
    );
    expect(pricingMocks.releaseProductCheckout).not.toHaveBeenCalled();
    expect(html).toContain("账号没有被扣款，可以重新发起结账");
  });

  it("releases only the cancelled $5 product retry guard", async () => {
    const supabase = { rpc: vi.fn() };
    pricingMocks.createSupabaseServerClient.mockResolvedValue(supabase);

    await PricingPage({
      searchParams: Promise.resolve({
        product: "case-study-single",
        purchase: "cancelled"
      })
    });

    expect(pricingMocks.releaseProductCheckout).toHaveBeenCalledWith(
      supabase,
      "case-study-single"
    );
    expect(pricingMocks.releaseSubscriptionCheckout).not.toHaveBeenCalled();
  });
});
