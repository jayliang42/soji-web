import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import FinancialDisclaimerPage, {
  metadata as financialDisclaimerMetadata
} from "@/app/financial-disclaimer/page";
import RootLayout from "@/app/layout";
import PrivacyPage, { metadata as privacyMetadata } from "@/app/privacy/page";
import RefundPolicyPage, {
  metadata as refundPolicyMetadata
} from "@/app/refund-policy/page";
import SupportPage, { metadata as supportMetadata } from "@/app/support/page";
import TermsPage, { metadata as termsMetadata } from "@/app/terms/page";
import { MembershipTerms } from "@/components/membership-terms";
import { PurchaseDisclosure } from "@/components/purchase-disclosure";
import {
  customerPolicyRoutes,
  getCheckoutCustomerPolicyReadiness,
  getCustomerPolicyReadiness
} from "@/lib/customer-policy";

vi.mock("@/lib/session", () => ({
  getSessionSnapshot: vi.fn(async () => ({
    entitlements: [],
    source: "supabase",
    user: null
  }))
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams()
}));

const readyConfiguration = {
  policiesApproved: "true",
  stripeTermsAcceptanceReady: "true",
  supportUrl: "https://support.soji.co/help"
};

describe("customer policy configuration", () => {
  it("uses exact canonical public routes and exposes no configured secret", () => {
    expect(customerPolicyRoutes).toEqual({
      disclaimer: "/financial-disclaimer",
      privacy: "/privacy",
      refund: "/refund-policy",
      support: "/support",
      terms: "/terms"
    });
    expect(JSON.stringify(customerPolicyRoutes)).not.toMatch(
      /secret|service_role|stripe_key/iu
    );
  });

  it("accepts an approved, durable HTTPS support destination", () => {
    expect(getCustomerPolicyReadiness(readyConfiguration)).toEqual({
      ready: true,
      reasons: [],
      supportUrl: "https://support.soji.co/help"
    });
  });

  it.each([
    [
      "missing support",
      { ...readyConfiguration, supportUrl: "" },
      ["support_destination_required"]
    ],
    [
      "malformed support",
      { ...readyConfiguration, supportUrl: "support inbox" },
      ["support_destination_invalid"]
    ],
    [
      "placeholder support",
      { ...readyConfiguration, supportUrl: "https://support.example.com/help" },
      ["support_destination_placeholder"]
    ],
    [
      "unapproved policy drafts",
      { ...readyConfiguration, policiesApproved: "false" },
      ["policies_not_approved"]
    ],
    [
      "Stripe Terms not configured",
      { ...readyConfiguration, stripeTermsAcceptanceReady: "false" },
      ["stripe_terms_acceptance_not_ready"]
    ]
  ])("fails closed for %s", (_label, configuration, reasons) => {
    expect(getCustomerPolicyReadiness(configuration)).toMatchObject({
      ready: false,
      reasons
    });
  });

  it("allows checkout testing to skip only the support gate with a test Stripe key", () => {
    vi.stubEnv("SOJI_CHECKOUT_TEST_MODE", "true");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_checkout_only");

    try {
      expect(
        getCheckoutCustomerPolicyReadiness({
          ...readyConfiguration,
          supportUrl: ""
        })
      ).toEqual({
        ready: true,
        reasons: [],
        supportUrl: null
      });
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("keeps the support gate enabled for live Stripe keys", () => {
    vi.stubEnv("SOJI_CHECKOUT_TEST_MODE", "true");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_checkout_only");

    try {
      expect(
        getCheckoutCustomerPolicyReadiness({
          ...readyConfiguration,
          supportUrl: ""
        })
      ).toMatchObject({
        ready: false,
        reasons: ["support_destination_required"]
      });
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("public customer policy pages", () => {
  const pages = [
    ["帮助中心", SupportPage, supportMetadata],
    ["隐私政策", PrivacyPage, privacyMetadata],
    ["使用条款", TermsPage, termsMetadata],
    ["退款政策", RefundPolicyPage, refundPolicyMetadata],
    [
      "财务免责声明",
      FinancialDisclaimerPage,
      financialDisclaimerMetadata
    ]
  ] as const;

  it("gives every page unique metadata and one readable H1", () => {
    const titles = pages.map(([, , metadata]) => metadata.title);
    const descriptions = pages.map(([, , metadata]) => metadata.description);

    expect(new Set(titles).size).toBe(pages.length);
    expect(new Set(descriptions).size).toBe(pages.length);

    for (const [title, Page] of pages) {
      const html = renderToStaticMarkup(<Page />);
      expect(html.match(/<h1(?:\s|>)/gu)).toHaveLength(1);
      expect(html).toContain(title);
      expect(html).toContain("更新于");
      expect(html).toMatch(/<h2(?:\s|>)/u);
    }
  });

  it("keeps support and all policies reciprocally reachable", () => {
    for (const [, Page] of pages) {
      const html = renderToStaticMarkup(<Page />);
      for (const route of Object.values(customerPolicyRoutes)) {
        expect(html).toContain(`href="${route}"`);
      }
    }
  });

  it("routes common support tasks before asking a customer to contact support", () => {
    const html = renderToStaticMarkup(<SupportPage />);

    expect(html).toContain("选择最接近的问题类型");
    expect(html).toContain('href="/login?next=/account"');
    expect(html).toContain('href="/account?view=subscriptions"');
    expect(html).toContain('href="/account?view=purchases"');
    expect(html).toContain('href="/refund-policy#access"');
    expect(html).toContain("发送一条清楚的帮助请求");
    expect(html).toContain("请求整理工具");
    expect(html).toContain("整理我的请求");
    expect(html).toContain('href="/library"');
    expect(html).toContain('href="/office-hours"');
  });

  it("shows the configured support channel after the self-service paths", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPPORT_URL", "mailto:help@soji.test");

    try {
      const html = renderToStaticMarkup(<SupportPage />);

      expect(html).toContain("帮助渠道已可用");
      expect(html).toContain("请求整理工具");
      expect(html.indexOf("选择最接近的问题类型")).toBeLessThan(
        html.indexOf("请求整理工具")
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("states current cancellation, refund, privacy, and education boundaries", () => {
    const html = pages
      .map(([, Page]) => renderToStaticMarkup(<Page />))
      .join("\n");

    expect(html).toContain("Stripe");
    expect(html).toContain("Supabase");
    expect(html).toContain("取消");
    expect(html).toContain("全额退款");
    expect(html).toContain("不构成针对个人的投资");
    expect(html).toContain("不会出售个人信息");
    expect(html).not.toMatch(
      /guaranteed returns|licensed financial advice|response within \d+|Soji LLC|binding arbitration/iu
    );
  });
});

describe("customer trust links", () => {
  it("groups Explore and all five support links in the global footer", async () => {
    const html = renderToStaticMarkup(
      await RootLayout({ children: <main>Page</main> })
    );

    expect(html).toContain("网站内容");
    expect(html).toContain("支持与政策");
    for (const href of [
      "/library",
      "/pricing",
      "/products",
      "/office-hours",
      "/account",
      ...Object.values(customerPolicyRoutes)
    ]) {
      expect(html).toContain(`href="${href}"`);
    }
    expect(html).toContain("min-h-11");
  });

  it("renders shared membership terms and product disclosures without local consent", () => {
    const membership = renderToStaticMarkup(
      <MembershipTerms />
    );
    const product = renderToStaticMarkup(
      <PurchaseDisclosure variant="product" />
    );

    expect(membership).toContain("一次付款，完整访问");
    expect(membership).toContain("一次支付 $99");
    expect(membership).toContain("不会自动续费");
    expect(membership).toContain("包含的权益");
    expect(product).toContain("电子产品付款后不予退款");
    expect(product).toContain("交付到你的 GS学院账号");
    expect(product).toContain("退款政策");

    for (const html of [membership, product]) {
      for (const href of ["/terms", "/refund-policy", "/privacy", "/support"]) {
        expect(html).toContain(`href="${href}"`);
      }
      expect(html).not.toMatch(/type="checkbox"|prechecked|pre-checked/iu);
    }
  });
});
