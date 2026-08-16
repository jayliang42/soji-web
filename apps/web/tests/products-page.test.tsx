import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pageMocks = vi.hoisted(() => ({
  getAccountPurchases: vi.fn(),
  getBillingDeliveryReadiness: vi.fn(),
  getProductSnapshot: vi.fn(),
  getSessionSnapshot: vi.fn()
}));

vi.mock("@/lib/account-purchases", () => ({
  getAccountPurchases: pageMocks.getAccountPurchases
}));
vi.mock("@/lib/billing-readiness", () => ({
  getBillingDeliveryReadiness: pageMocks.getBillingDeliveryReadiness,
  isBillingDeliveryReady: () => true
}));
vi.mock("@/lib/env", () => ({ hasStripeConfig: () => true }));
vi.mock("@/lib/products", () => ({
  getProductSnapshot: pageMocks.getProductSnapshot
}));
vi.mock("@/lib/session", () => ({
  getSessionSnapshot: pageMocks.getSessionSnapshot
}));

import ProductsPage from "@/app/products/page";

const product = {
  bullets: ["A useful workbook"],
  entitlement: "product.digital",
  id: "product-1",
  isActive: true,
  price: 19,
  priceLabel: "$19",
  slug: "workbook",
  summary: "A practical workbook.",
  title: "Wealth workbook"
};

describe("products page purchase safety", () => {
  beforeEach(() => {
    for (const mock of Object.values(pageMocks)) mock.mockReset();
    pageMocks.getSessionSnapshot.mockResolvedValue({
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
    pageMocks.getProductSnapshot.mockResolvedValue({
      items: [product],
      source: "supabase"
    });
    pageMocks.getBillingDeliveryReadiness.mockResolvedValue({});
  });

  it.each(["paid", "no_payment_required"])(
    "replaces checkout with an account access link for a %s product",
    async (status) => {
    pageMocks.getAccountPurchases.mockResolvedValue({
      items: [
        {
          createdAt: "2026-07-14T12:00:00Z",
          downloadReady: true,
          id: "purchase-1",
          productId: "product-1",
          productSlug: "workbook",
          productTitle: "Wealth workbook",
          status
        }
      ]
    });

    const html = renderToStaticMarkup(
      await ProductsPage({ searchParams: Promise.resolve({}) })
    );

    expect(html).toContain("Access purchase");
    expect(html).toContain('/account#purchases-heading');
    expect(html).not.toContain("Buy once");
    }
  );

  it("pauses checkout when purchase history cannot be verified", async () => {
    pageMocks.getAccountPurchases.mockResolvedValue({
      error: "purchase_query_failed",
      items: []
    });

    const html = renderToStaticMarkup(
      await ProductsPage({ searchParams: Promise.resolve({}) })
    );

    expect(html).toContain("Purchase status could not be verified");
    expect(html).toContain("Purchase status unavailable");
    expect(html).not.toContain("Buy once");
  });

  it("routes a disputed owner to account review instead of another checkout", async () => {
    pageMocks.getAccountPurchases.mockResolvedValue({
      items: [
        {
          createdAt: "2026-07-14T12:00:00Z",
          disputeStatus: "under_review",
          downloadReady: false,
          id: "purchase-1",
          productId: "product-1",
          productSlug: "workbook",
          productTitle: "Wealth workbook",
          status: "paid"
        }
      ]
    });

    const html = renderToStaticMarkup(
      await ProductsPage({ searchParams: Promise.resolve({}) })
    );

    expect(html).toContain("Review purchase");
    expect(html).toContain('/account#purchases-heading');
    expect(html).not.toContain("Buy once");
  });

  it("shows every product as included for a Full Access member", async () => {
    pageMocks.getSessionSnapshot.mockResolvedValue({
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
    pageMocks.getAccountPurchases.mockResolvedValue({ items: [] });

    const html = renderToStaticMarkup(
      await ProductsPage({ searchParams: Promise.resolve({}) })
    );

    expect(html).toContain("Download included product");
    expect(html).toContain("Included with your Full Access membership");
    expect(html).not.toContain("Buy once");
  });

  it("places one-time delivery and refund terms beside every product action", async () => {
    pageMocks.getAccountPurchases.mockResolvedValue({ items: [] });

    const html = renderToStaticMarkup(
      await ProductsPage({ searchParams: Promise.resolve({}) })
    );

    expect(html).toContain("One-time purchase");
    expect(html).toContain("Delivered to your GS学院 account");
    expect(html).toContain("digital-product refund policy");
    for (const href of ["/terms", "/refund-policy", "/privacy", "/support"]) {
      expect(html).toContain(`href="${href}"`);
    }
    expect(html).not.toMatch(/type="checkbox"/u);
  });

  it("shows one full recovery path when the catalog and purchase history both fail", async () => {
    pageMocks.getProductSnapshot.mockResolvedValue({
      error: "products_query_failed",
      items: [],
      source: "supabase"
    });
    pageMocks.getAccountPurchases.mockResolvedValue({
      error: "purchase_query_failed",
      items: []
    });

    const html = renderToStaticMarkup(
      await ProductsPage({ searchParams: Promise.resolve({}) })
    );

    expect(html).toContain("Connection paused");
    expect(html).toContain("Products could not be loaded");
    expect(html).toContain(">Try loading again</a>");
    expect(html).toContain(">Read a public guide</a>");
    expect(html).toContain(
      "Checkout stays paused until the catalog returns; no purchase is started."
    );
    expect(html.match(/role="alert"/gu)).toHaveLength(1);
    expect(html).not.toContain("Purchase status could not be verified");
    expect(html).not.toContain("Buy once");
  });
});
