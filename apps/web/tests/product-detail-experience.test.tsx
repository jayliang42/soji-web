import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const detailMocks = vi.hoisted(() => ({
  getAccountPurchases: vi.fn(),
  getBillingDeliveryReadiness: vi.fn(),
  getProductBySlug: vi.fn(),
  getSessionSnapshot: vi.fn()
}));

vi.mock("@/lib/account-purchases", () => ({
  getAccountPurchases: detailMocks.getAccountPurchases
}));
vi.mock("@/lib/billing-readiness", () => ({
  getBillingDeliveryReadiness: detailMocks.getBillingDeliveryReadiness,
  isBillingDeliveryReady: () => true
}));
vi.mock("@/lib/env", () => ({ hasStripeConfig: () => true }));
vi.mock("@/lib/products", () => ({
  getProductBySlug: detailMocks.getProductBySlug
}));
vi.mock("@/lib/session", () => ({
  getSessionSnapshot: detailMocks.getSessionSnapshot
}));

import ProductDetailPage, {
  generateMetadata
} from "@/app/products/[slug]/page";

const product = {
  bullets: [
    "Track net worth and cash runway",
    "Use a monthly and quarterly review checklist"
  ],
  entitlement: "product.digital",
  id: "dashboard",
  isActive: true,
  price: 79,
  priceLabel: "$79",
  slug: "wealth-dashboard",
  summary: "A workbook for tracking the decisions behind the numbers.",
  title: "Wealth Dashboard"
};

describe("product detail experience", () => {
  beforeEach(() => {
    for (const mock of Object.values(detailMocks)) mock.mockReset();
    detailMocks.getProductBySlug.mockResolvedValue({
      item: product,
      source: "demo"
    });
    detailMocks.getSessionSnapshot.mockResolvedValue({
      entitlements: [],
      source: "supabase",
      user: null
    });
    detailMocks.getAccountPurchases.mockResolvedValue({ items: [] });
    detailMocks.getBillingDeliveryReadiness.mockResolvedValue({});
  });

  it("gives a guest complete product context and returns after sign-in", async () => {
    const html = renderToStaticMarkup(
      await ProductDetailPage({
        params: Promise.resolve({ slug: product.slug })
      })
    );

    expect(html).toContain("返回产品列表");
    expect(html).toContain("Wealth Dashboard");
    expect(html).toContain(product.summary);
    expect(html).toContain("一次支付 $79");
    expect(html).toContain("数字下载");
    expect(html).toContain("无需订阅");
    expect(html).toContain("Track net worth and cash runway");
    expect(html).toContain("三步完成购买并下载");
    expect(html).toContain("登录后解锁");
    expect(html).toContain(
      "next=%2Fproducts%2Fwealth-dashboard"
    );
    expect(html).toContain("单次购买");
    expect(html).toContain("分享工具");
    expect(html).toContain("查看 Full Access");
  });

  it("routes an existing owner to Account without checking checkout readiness", async () => {
    detailMocks.getSessionSnapshot.mockResolvedValue({
      entitlements: [],
      source: "supabase",
      user: {
        avatarUrl: null,
        email: "member@example.com",
        fullName: "Member",
        id: "user-1",
        providers: ["email"],
        roles: ["member"],
        tier: "free"
      }
    });
    detailMocks.getAccountPurchases.mockResolvedValue({
      items: [
        {
          createdAt: "2026-07-30T00:00:00.000Z",
          disputeStatus: null,
          downloadReady: true,
          id: "purchase-1",
          productId: product.id,
          productSlug: product.slug,
          productTitle: product.title,
          status: "paid"
        }
      ]
    });

    const html = renderToStaticMarkup(
      await ProductDetailPage({
        params: Promise.resolve({ slug: product.slug })
      })
    );

    expect(html).toContain("进入已解锁内容");
    expect(html).toContain('/account#purchases-heading');
    expect(html).not.toContain("立即解锁");
    expect(detailMocks.getBillingDeliveryReadiness).not.toHaveBeenCalled();
  });

  it("gives Full Access members the included product download", async () => {
    detailMocks.getSessionSnapshot.mockResolvedValue({
      entitlements: ["product.digital"],
      source: "supabase",
      user: {
        avatarUrl: null,
        email: "member@example.com",
        fullName: "Member",
        id: "user-1",
        providers: ["email"],
        roles: ["member"],
        tier: "tier_1"
      }
    });

    const html = renderToStaticMarkup(
      await ProductDetailPage({
        params: Promise.resolve({ slug: product.slug })
      })
    );

    expect(html).toContain("Full Access 已包含");
    expect(html).toContain("下载已包含内容");
    expect(html).not.toContain("立即解锁");
    expect(detailMocks.getBillingDeliveryReadiness).not.toHaveBeenCalled();
  });

  it("shows a bounded catalog recovery state without a purchase action", async () => {
    detailMocks.getProductBySlug.mockResolvedValue({
      error: "product_query_failed",
      item: null,
      source: "supabase"
    });

    const html = renderToStaticMarkup(
      await ProductDetailPage({
        params: Promise.resolve({ slug: product.slug })
      })
    );

    expect(html).toContain("暂时无法加载此产品");
    expect(html).toContain("重新加载");
    expect(html).not.toContain("立即解锁");
    expect(detailMocks.getAccountPurchases).not.toHaveBeenCalled();
  });

  it("publishes product-specific metadata from public catalog fields", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: product.slug })
    });

    expect(metadata).toMatchObject({
      alternates: { canonical: "/products/wealth-dashboard" },
      description: product.summary,
      openGraph: {
        description: product.summary,
        title: product.title
      },
      title: product.title
    });
  });
});
