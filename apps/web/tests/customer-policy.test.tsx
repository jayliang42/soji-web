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
import { PurchaseDisclosure } from "@/components/purchase-disclosure";
import {
  customerPolicyRoutes,
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
  usePathname: () => "/"
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
});

describe("public customer policy pages", () => {
  const pages = [
    ["Support", SupportPage, supportMetadata],
    ["Privacy", PrivacyPage, privacyMetadata],
    ["Terms", TermsPage, termsMetadata],
    ["Refund policy", RefundPolicyPage, refundPolicyMetadata],
    [
      "Financial disclaimer",
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
      expect(html).toContain("Updated");
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

  it("states current cancellation, refund, privacy, and education boundaries", () => {
    const html = pages
      .map(([, Page]) => renderToStaticMarkup(<Page />))
      .join("\n");

    expect(html).toContain("Stripe");
    expect(html).toContain("Supabase");
    expect(html).toContain("cancel");
    expect(html).toContain("full refund");
    expect(html).toContain("partial refund");
    expect(html).toContain("not individualized investment");
    expect(html).toContain("do not sell personal information");
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

    expect(html).toContain("Explore");
    expect(html).toContain("Support &amp; policies");
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

  it("renders exact membership and product purchase disclosures without local consent", () => {
    const membership = renderToStaticMarkup(
      <PurchaseDisclosure priceLabel="$128" variant="membership" />
    );
    const product = renderToStaticMarkup(
      <PurchaseDisclosure variant="product" />
    );

    expect(membership).toContain("$128 billed monthly until canceled");
    expect(membership).toContain("Stripe Customer Portal");
    expect(membership).toContain("paid period and billing status");
    expect(product).toContain("One-time purchase");
    expect(product).toContain("Delivered to your Soji account");
    expect(product).toContain("digital-product refund policy");

    for (const html of [membership, product]) {
      for (const href of ["/terms", "/refund-policy", "/privacy", "/support"]) {
        expect(html).toContain(`href="${href}"`);
      }
      expect(html).not.toMatch(/type="checkbox"|prechecked|pre-checked/iu);
    }
  });
});
