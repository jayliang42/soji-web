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

    expect(html).toContain("Back to Library");
    expect(html).toContain("Guide details");
    expect(html).toContain("Share guide");
    expect(html).toContain(
      'aria-label="Save A Calmer Decision for later"'
    );
    expect(html).toContain("1 min public opening");
    expect(html).toContain("Public opening complete");
    expect(html).toContain('href="/pricing#plan-tier_1"');
    expect(html).toContain('href="/login?next=%2Flibrary%2Freader-guide"');
    expect(html).toContain("decision-making");
    expect(html).toContain("family");
    expect(html).toContain('href="/library?q=decision-making"');
    expect(html).toContain('href="/library?q=family"');
    expect(html).toContain('aria-label="Browse guides about family"');
    expect(html).not.toContain(">demo<");
    expect(html).not.toContain(">supporting<");
    expect(html).not.toContain("PRIVATE MEMBER BODY");
    expect(html).not.toContain("In this guide");
    expect(html).not.toContain("Choose a next move");
    expect(html).toContain("Keep reading");
    expect(html).toContain("Continue with a nearby question.");
    expect(html).toContain("A Shared Family Question");
    expect(html).toContain("The Next Decision");
    expect(html).toContain("A Planning Template");
    expect(html).toContain("Public · Full article");
    expect(html).toContain("Public preview");
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
    expect(html).toContain("In this guide");
    expect(html).toContain('href="#full-guide"');
    expect(html).toContain('href="#choose-a-next-move"');
    expect(html).toContain('id="full-guide"');
    expect(html).toContain('id="choose-a-next-move"');
    expect(html).toContain("Choose the next useful step");
    expect(html).toContain('href="/library"');
    expect(html).toContain('href="/products"');
    expect(html).toContain('href="/office-hours"');
    expect(html).toContain("Keep reading");
    expect(html).toContain("Included in your membership");
    expect(html).toContain("Included with Tier 2 membership");
    expect(html).not.toContain("RELATED MEMBER BODY");
    expect(html).not.toContain("RELATED TEMPLATE BODY");
    expect(html).not.toContain("Public opening complete");
    expect(html).not.toContain("Compare membership");
  });
});
