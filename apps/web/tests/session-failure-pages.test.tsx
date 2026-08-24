import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pageMocks = vi.hoisted(() => ({
  getAccountMembershipPurchases: vi.fn(),
  getAccountPurchases: vi.fn(),
  getAccountSubscriptions: vi.fn(),
  getCheckoutReturnStatus: vi.fn(),
  getContentBySlug: vi.fn(),
  getContentSnapshot: vi.fn(),
  getOfficeHourSnapshot: vi.fn(),
  getSessionSnapshot: vi.fn()
}));

vi.mock("@/lib/account-purchases", () => ({
  getAccountMembershipPurchases: pageMocks.getAccountMembershipPurchases,
  getAccountPurchases: pageMocks.getAccountPurchases
}));
vi.mock("@/lib/account-subscriptions", () => ({
  getAccountSubscriptions: pageMocks.getAccountSubscriptions,
  hasOpenStripeMembership: () => false
}));
vi.mock("@/lib/checkout-return", () => ({
  getCheckoutReturnStatus: pageMocks.getCheckoutReturnStatus
}));
vi.mock("@/lib/session", () => ({
  getSessionSnapshot: pageMocks.getSessionSnapshot
}));
vi.mock("@/lib/content", () => ({
  getContentBySlug: pageMocks.getContentBySlug,
  getContentSnapshot: pageMocks.getContentSnapshot
}));
vi.mock("@/lib/office-hours", () => ({
  getOfficeHourSnapshot: pageMocks.getOfficeHourSnapshot
}));
vi.mock("@/components/auth-status", () => ({
  AuthStatus: () => null
}));

import AccountPage from "@/app/account/page";
import AdminPage from "@/app/admin/page";
import ContentDetailPage from "@/app/library/[slug]/page";
import LibraryPage from "@/app/library/page";
import OfficeHoursPage from "@/app/office-hours/page";

const degradedSession = {
  entitlements: [],
  error: "session_query_failed",
  source: "supabase" as const,
  user: {
    avatarUrl: null,
    email: "admin@example.com",
    fullName: "Admin Operator",
    id: "user-id",
    providers: ["email"],
    roles: ["member"],
    tier: "free"
  }
};

const restrictedContent = {
  body: "PRIVATE BODY THAT MUST NOT LEAK",
  coverImageAlt: "",
  id: "content-id",
  publishedAt: "2026-07-15T12:00:00Z",
  preview: "A safe public preview.",
  requiredEntitlements: ["content.basic"],
  slug: "restricted-guide",
  summary: "A safe public summary.",
  tags: [],
  title: "Restricted guide",
  type: "article",
  visibility: "purchase_required"
} as const;

describe("session failure pages", () => {
  beforeEach(() => {
    for (const mock of Object.values(pageMocks)) {
      mock.mockReset();
    }
    pageMocks.getSessionSnapshot.mockResolvedValue(degradedSession);
    pageMocks.getAccountMembershipPurchases.mockResolvedValue({ items: [] });
    pageMocks.getAccountPurchases.mockResolvedValue({ items: [] });
    pageMocks.getAccountSubscriptions.mockResolvedValue({ items: [] });
    pageMocks.getCheckoutReturnStatus.mockResolvedValue({ state: "none" });
    pageMocks.getContentSnapshot.mockResolvedValue({
      items: [restrictedContent],
      source: "supabase"
    });
    pageMocks.getContentBySlug.mockResolvedValue({
      item: restrictedContent,
      source: "supabase"
    });
    pageMocks.getOfficeHourSnapshot.mockResolvedValue({
      items: [
        {
          id: "office-hour-id",
          replayUrl: "https://example.com/private-replay",
          requiredEntitlements: ["office_hours.join"],
          signupUrl: "https://example.com/private-signup",
          startsAt: "2026-07-20T18:00:00Z",
          title: "Member office hour"
        }
      ],
      source: "supabase"
    });
  });

  it("puts the conservative Account warning before degraded membership data", async () => {
    const html = renderToStaticMarkup(
      await AccountPage({ searchParams: Promise.resolve({}) })
    );

    expect(html).toContain("Account services are temporarily unavailable");
    expect(html).toContain("Authentication or membership data could not be verified");
    expect(html.indexOf("Account services are temporarily unavailable")).toBeLessThan(
      html.indexOf("Current tier")
    );
  });

  it("reports an Admin data outage instead of claiming the role was removed", async () => {
    const html = renderToStaticMarkup(
      await AdminPage({ searchParams: Promise.resolve({}) })
    );

    expect(html).toContain("Admin services are unavailable.");
    expect(html).toContain("Authentication or role data could not be verified");
    expect(html).not.toContain("Admin access required.");
  });

  it("marks restricted Library cards unavailable without claiming a tier lock", async () => {
    const html = renderToStaticMarkup(await LibraryPage());

    expect(html).toContain("Membership access is temporarily unavailable");
    expect(html).toContain("Your membership has not been changed");
    expect(html).toContain("Access temporarily unavailable");
    expect(html).not.toContain("Locked by tier");
  });

  it("keeps restricted detail private without showing an upgrade CTA", async () => {
    const html = renderToStaticMarkup(
      await ContentDetailPage({
        params: Promise.resolve({ slug: restrictedContent.slug })
      })
    );

    expect(html).toContain("Access temporarily unavailable");
    expect(html).toContain(
      "No member-only content or private links have been shown"
    );
    expect(html).toContain("A safe public preview.");
    expect(html).not.toContain("PRIVATE BODY THAT MUST NOT LEAK");
    expect(html).not.toContain("Locked by tier");
    expect(html).not.toContain("View membership");
  });

  it("hides Office Hours links without telling the member to upgrade", async () => {
    const html = renderToStaticMarkup(await OfficeHoursPage());

    expect(html).toContain("Membership access is temporarily unavailable");
    expect(html).toContain("Access unavailable");
    expect(html).toContain("No member-only content or private links have been shown");
    expect(html).not.toContain("Upgrade to join");
    expect(html).not.toContain("https://example.com/private-signup");
    expect(html).not.toContain("https://example.com/private-replay");
  });
});
