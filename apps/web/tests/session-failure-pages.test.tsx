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

    expect(html).toContain("账户服务暂不可用");
    expect(html).toContain("暂时无法核实登录或会员数据");
    expect(html.indexOf("账户服务暂不可用")).toBeLessThan(
      html.indexOf("当前方案")
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

    expect(html).toContain("暂时无法确认会员访问权限");
    expect(html).toContain("你的会员状态没有改变");
    expect(html).toContain("暂时无法确认访问权限");
    expect(html).not.toContain("Locked by tier");
  });

  it("keeps restricted detail private without showing an upgrade CTA", async () => {
    const html = renderToStaticMarkup(
      await ContentDetailPage({
        params: Promise.resolve({ slug: restrictedContent.slug })
      })
    );

    expect(html).toContain("访问权限暂时不可用");
    expect(html).toContain(
      "没有显示会员专属内容或私密链接"
    );
    expect(html).toContain("A safe public preview.");
    expect(html).not.toContain("PRIVATE BODY THAT MUST NOT LEAK");
    expect(html).not.toContain("Locked by tier");
    expect(html).not.toContain("查看会员方案");
  });

  it("hides Office Hours links without telling the member to upgrade", async () => {
    const html = renderToStaticMarkup(await OfficeHoursPage());

    expect(html).toContain("暂时无法确认会员访问权限");
    expect(html).toContain("访问权限暂时不可用");
    expect(html).toContain("没有显示会员专属内容或私密链接");
    expect(html).not.toContain("升级后参加");
    expect(html).not.toContain("https://example.com/private-signup");
    expect(html).not.toContain("https://example.com/private-replay");
  });
});
