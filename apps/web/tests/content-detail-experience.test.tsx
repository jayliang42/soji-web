import type { ContentItem } from "@soji/types";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const detailMocks = vi.hoisted(() => ({
  getContentBySlug: vi.fn(),
  getSessionSnapshot: vi.fn()
}));

vi.mock("@/lib/content", () => ({
  getContentBySlug: detailMocks.getContentBySlug
}));

vi.mock("@/lib/session", () => ({
  getSessionSnapshot: detailMocks.getSessionSnapshot
}));

import ContentDetailPage from "@/app/library/[slug]/page";

const guide = {
  body: [
    "## Full guide",
    "",
    "PRIVATE MEMBER BODY with a complete decision process.",
    "",
    "## Choose a next move",
    "",
    "Finish with one dated action."
  ].join("\n"),
  coverImage: "",
  coverImageAlt: "A calm editorial decision map.",
  id: "reader-guide",
  preview:
    "This public opening helps a reader name the decision before the complete guide continues.",
  publishedAt: "2026-07-28T00:00:00.000Z",
  requiredEntitlements: ["content.basic"],
  slug: "reader-guide",
  summary: "A practical guide for one calmer decision.",
  tags: ["decision-making", "family", "demo", "supporting"],
  title: "A Calmer Decision",
  type: "article",
  visibility: "members_only"
} satisfies ContentItem;

const relatedGuides = [
  {
    ...guide,
    body: "RELATED PUBLIC BODY should never render on the current page.",
    id: "related-public",
    preview: "Related public preview.",
    publishedAt: "2026-07-27T00:00:00.000Z",
    requiredEntitlements: [],
    slug: "related-public",
    summary: "A public guide connected by a family decision.",
    tags: ["family"],
    title: "A Shared Family Question",
    visibility: "public"
  },
  {
    ...guide,
    body: "RELATED MEMBER BODY should never render on the current page.",
    id: "related-member",
    preview: "Related member preview.",
    publishedAt: "2026-07-26T00:00:00.000Z",
    slug: "related-member",
    summary: "A member guide connected by decision-making.",
    tags: ["decision-making"],
    title: "The Next Decision",
  },
  {
    ...guide,
    body: "RELATED TEMPLATE BODY should never render on the current page.",
    id: "related-template",
    preview: "Related template preview.",
    publishedAt: "2026-07-29T00:00:00.000Z",
    requiredEntitlements: ["library.templates"],
    slug: "related-template",
    summary: "A template for a later planning step.",
    tags: ["planning"],
    title: "A Planning Template",
    type: "template",
    visibility: "purchase_required"
  }
] satisfies ContentItem[];

const guestSession = {
  entitlements: [],
  source: "supabase" as const,
  user: null
};

describe("content detail reading experience", () => {
  beforeEach(() => {
    detailMocks.getContentBySlug.mockReset();
    detailMocks.getSessionSnapshot.mockReset();
    detailMocks.getContentBySlug.mockResolvedValue({
      item: guide,
      items: [guide, ...relatedGuides],
      source: "supabase"
    });
    detailMocks.getSessionSnapshot.mockResolvedValue(guestSession);
  });

  it("frames a guest preview as a readable article with an exact plan next step", async () => {
    const html = renderToStaticMarkup(
      await ContentDetailPage({
        params: Promise.resolve({ slug: guide.slug })
      })
    );

    expect(html).toContain("返回内容库");
    expect(html).toContain("指南详情");
    expect(html).toContain("分享指南");
    expect(html).toContain(
      'aria-label="《A Calmer Decision》的阅读进度"'
    );
    expect(html).toContain('id="guide-reading-body"');
    expect(html).toContain(
      'aria-label="收藏《A Calmer Decision》稍后阅读"'
    );
    expect(html).toContain("约 1 分钟公开预览");
    expect(html).toContain("免费内容已读完");
    expect(html).toContain('href="/pricing#plan-tier_1"');
    expect(html).toContain('href="/login?next=%2Flibrary%2Freader-guide"');
    expect(html).toContain("decision-making");
    expect(html).toContain("family");
    expect(html).toContain('href="/library?q=decision-making"');
    expect(html).toContain('href="/library?q=family"');
    expect(html).toContain('aria-label="浏览关于 family 的指南"');
    expect(html).not.toContain(">demo<");
    expect(html).not.toContain(">supporting<");
    expect(html).not.toContain("PRIVATE MEMBER BODY");
    expect(html).not.toContain("本文目录");
    expect(html).not.toContain("Choose a next move");
    expect(html).toContain("继续阅读");
    expect(html).toContain("从相关问题继续探索");
    expect(html).toContain("A Shared Family Question");
    expect(html).toContain("The Next Decision");
    expect(html).toContain("A Planning Template");
    expect(html).toContain("公开内容 · 可阅读全文");
    expect(html).toContain("公开预览");
    expect(html).toContain('href="/library/related-public"');
    expect(html).toContain('href="/library/related-member"');
    expect(html).toContain('href="/library/related-template"');
    expect(html).not.toContain("RELATED PUBLIC BODY");
    expect(html).not.toContain("RELATED MEMBER BODY");
    expect(html).not.toContain("RELATED TEMPLATE BODY");
  });

  it("gives an entitled reader useful next steps after the full guide", async () => {
    detailMocks.getSessionSnapshot.mockResolvedValue({
      entitlements: ["content.basic"],
      source: "supabase",
      user: {
        avatarUrl: null,
        email: "reader@example.com",
        fullName: "Reader",
        id: "reader-id",
        providers: ["email"],
        roles: ["member"],
        tier: "tier_1"
      }
    });

    const html = renderToStaticMarkup(
      await ContentDetailPage({
        params: Promise.resolve({ slug: guide.slug })
      })
    );

    expect(html).toContain("PRIVATE MEMBER BODY");
    expect(html).toContain("本文目录");
    expect(html).toContain('href="#full-guide"');
    expect(html).toContain('href="#choose-a-next-move"');
    expect(html).toContain('id="full-guide"');
    expect(html).toContain('id="choose-a-next-move"');
    expect(html).toContain("选择下一步最有帮助的内容");
    expect(html).toContain('href="/library"');
    expect(html).not.toContain('href="/products"');
    expect(html).toContain('href="/office-hours"');
    expect(html).toContain("继续阅读");
    expect(html).toContain("已包含在你的会员权益中");
    expect(html).toContain("Full Access 会员权益可读");
    expect(html).not.toContain("RELATED MEMBER BODY");
    expect(html).not.toContain("RELATED TEMPLATE BODY");
    expect(html).not.toContain("免费内容已读完");
    expect(html).not.toContain("比较解锁方式");
  });

  it("does not mount reading progress when no guide body is visible", async () => {
    detailMocks.getContentBySlug.mockResolvedValue({
      item: { ...guide, preview: "" },
      items: [{ ...guide, preview: "" }],
      source: "supabase"
    });

    const html = renderToStaticMarkup(
      await ContentDetailPage({
        params: Promise.resolve({ slug: guide.slug })
      })
    );

    expect(html).not.toContain("PRIVATE MEMBER BODY");
    expect(html).not.toContain("guide-reading-body");
    expect(html).not.toContain("Reading progress for A Calmer Decision");
  });
});
