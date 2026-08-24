import type { ContentItem } from "@soji/types";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pageMocks = vi.hoisted(() => ({
  getContentBySlug: vi.fn(),
  getContentSnapshot: vi.fn(),
  getSessionSnapshot: vi.fn()
}));

vi.mock("@/lib/content", () => ({
  getContentBySlug: pageMocks.getContentBySlug,
  getContentSnapshot: pageMocks.getContentSnapshot
}));

vi.mock("@/lib/session", () => ({
  getSessionSnapshot: pageMocks.getSessionSnapshot
}));

import ContentDetailPage from "@/app/library/[slug]/page";
import LibraryPage from "@/app/library/page";

const flagship = {
  body: [
    "## Full member guide",
    "PRIVATE PHASE3 BODY",
    "This is the complete member-only decision reset."
  ].join("\n\n"),
  coverImage: "/covers/wealth-without-drift.webp",
  coverImageAlt:
    "Paper decision map, pencil, linen ledger, and ceramic dish in warm window light.",
  id: "flagship-content",
  preview:
    "Most money drift starts when small decisions remain open. This useful public opening turns those questions into a focused 30-day plan.",
  publishedAt: "2026-07-28T00:00:00.000Z",
  requiredEntitlements: ["content.basic"],
  slug: "wealth-without-drift",
  summary:
    "A focused reset for turning open money questions into a values-led, cash-aware 30-day plan.",
  tags: ["decision-making", "cash flow", "family", "30-day reset"],
  title: "Wealth Without Drift: A 90-Minute Decision Reset",
  type: "article",
  visibility: "members_only"
} satisfies ContentItem;

const guestSession = {
  entitlements: [],
  source: "supabase" as const,
  user: null
};

function memberSession(entitlements: ContentItem["requiredEntitlements"]) {
  return {
    entitlements,
    source: "supabase" as const,
    user: {
      avatarUrl: null,
      email: "reader@example.com",
      fullName: "Reader",
      id: "reader-id",
      providers: ["email"] as const,
      roles: ["member"] as const,
      tier: entitlements.length > 0 ? ("tier_1" as const) : ("free" as const)
    }
  };
}

describe("editorial library pages", () => {
  beforeEach(() => {
    for (const mock of Object.values(pageMocks)) {
      mock.mockReset();
    }
    pageMocks.getContentSnapshot.mockResolvedValue({
      items: [flagship],
      source: "supabase"
    });
    pageMocks.getContentBySlug.mockResolvedValue({
      item: flagship,
      source: "supabase"
    });
    pageMocks.getSessionSnapshot.mockResolvedValue(guestSession);
  });

  it("features the owned flagship cover and guest preview action in the collection", async () => {
    const html = renderToStaticMarkup(await LibraryPage());

    expect(html).toContain("帮助你做出更清晰决定的指南");
    expect(html).toContain('src="/covers/wealth-without-drift.webp"');
    expect(html).toContain(flagship.coverImageAlt);
    expect(html).toContain("lg:col-span-2");
    expect(html).toContain("公开预览");
    expect(html).toContain(">阅读预览</a>");
    expect(html).not.toContain("content.basic");
    expect(html).not.toContain("members_only");
    expect(html).not.toContain("Supabase");
  });

  it("renders a useful anonymous preview and destination-aware access actions", async () => {
    const html = renderToStaticMarkup(
      await ContentDetailPage({
        params: Promise.resolve({ slug: flagship.slug })
      })
    );

    expect(html).toContain("公开预览");
    expect(html).toContain("Most money drift starts when small decisions remain open.");
    expect(html).toContain(">比较解锁方式</a>");
    expect(html).toContain(">登录并检查权益</a>");
    expect(html).toContain("next=%2Flibrary%2Fwealth-without-drift");
    expect(html).not.toContain("PRIVATE PHASE3 BODY");
    expect(html).not.toContain("content.basic");
  });

  it("gives a signed-in reader a tier-specific lock without leaking the body", async () => {
    pageMocks.getSessionSnapshot.mockResolvedValue(memberSession([]));

    const html = renderToStaticMarkup(
      await ContentDetailPage({
        params: Promise.resolve({ slug: flagship.slug })
      })
    );

    expect(html).toContain("Full Access 会员权益可读");
    expect(html).toContain("Most money drift starts when small decisions remain open.");
    expect(html).toContain(">查看所需会员权益</a>");
    expect(html).not.toContain("登录并检查权益");
    expect(html).not.toContain("PRIVATE PHASE3 BODY");
  });

  it("shows the complete guide to an entitled reader with no conversion block", async () => {
    pageMocks.getSessionSnapshot.mockResolvedValue(memberSession(["content.basic"]));

    const html = renderToStaticMarkup(
      await ContentDetailPage({
        params: Promise.resolve({ slug: flagship.slug })
      })
    );

    expect(html).toContain("已包含在你的会员权益中");
    expect(html).toContain("PRIVATE PHASE3 BODY");
    expect(html).not.toContain("比较解锁方式");
    expect(html).not.toContain("登录并检查权益");
    expect(html).not.toContain("查看所需会员权益");
  });

  it("fails closed with calm recovery copy and no upgrade prompt", async () => {
    pageMocks.getSessionSnapshot.mockResolvedValue({
      ...memberSession([]),
      error: "session_query_failed"
    });

    const html = renderToStaticMarkup(
      await ContentDetailPage({
        params: Promise.resolve({ slug: flagship.slug })
      })
    );

    expect(html).toContain("访问权限暂时不可用");
    expect(html).toContain(
      "我们目前无法确认访问权限，因此没有显示会员专属内容或私密链接。"
    );
    expect(html).toContain("Most money drift starts when small decisions remain open.");
    expect(html).toContain('href="/support"');
    expect(html).not.toContain("PRIVATE PHASE3 BODY");
    expect(html).not.toContain("比较解锁方式");
    expect(html).not.toContain("upgrade");
  });
});
