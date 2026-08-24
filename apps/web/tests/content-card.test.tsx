import type { ContentItem } from "@soji/types";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ContentCard } from "@/components/content-card";

const item = {
  body: "Member-only body",
  coverImage: "/covers/wealth-without-drift.webp",
  coverImageAlt: "Paper decision map beside a pencil and linen ledger.",
  id: "content-id",
  publishedAt: "2026-07-19T21:47:56.62735+00:00",
  requiredEntitlements: ["content.basic"],
  preview: "A practical public preview.",
  slug: "march-update-pack",
  summary: "A practical monthly update.",
  tags: ["planning", "family", "cash flow", "hidden fourth tag"],
  title: "March 2026 Update Pack",
  type: "article",
  visibility: "members_only"
} satisfies ContentItem;

describe("content card", () => {
  it("renders the owned 4:3 cover, publication metadata, and only three tags", () => {
    const html = renderToStaticMarkup(
      <ContentCard accessMode="preview" featured item={item} />
    );

    expect(html).toContain(
      '<time dateTime="2026-07-19T21:47:56.62735+00:00">2026年7月19日</time>'
    );
    expect(html).toContain('src="/covers/wealth-without-drift.webp"');
    expect(html).toContain('alt="Paper decision map beside a pencil and linen ledger."');
    expect(html).toContain('width="1200"');
    expect(html).toContain('height="900"');
    expect(html).toContain("lg:grid-cols-2");
    expect(html).toContain("lg:border-r");
    expect(html).toContain("planning");
    expect(html).toContain("family");
    expect(html).toContain("cash flow");
    expect(html).not.toContain("hidden fourth tag");
    expect(html).not.toContain(">2026-07-19T21:47:56.62735+00:00<");
  });

  it.each([
    {
      accessMode: "full" as const,
      expectedAction: "阅读全文",
      expectedLabel: "已包含在你的会员权益中",
      isAuthenticated: true
    },
    {
      accessMode: "preview" as const,
      expectedAction: "阅读预览",
      expectedLabel: "公开预览",
      isAuthenticated: false
    },
    {
      accessMode: "preview" as const,
      expectedAction: "查看权限",
      expectedLabel: "Full Access 会员权益可读",
      isAuthenticated: true
    },
    {
      accessMode: "locked" as const,
      expectedAction: "查看权限",
      expectedLabel: "Full Access 会员权益可读",
      isAuthenticated: true
    },
    {
      accessMode: "unavailable" as const,
      expectedAction: "查看权限",
      expectedLabel: "暂时无法确认访问权限",
      isAuthenticated: true
    }
  ])(
    "uses a human label and exact action for $accessMode access",
    ({ accessMode, expectedAction, expectedLabel, isAuthenticated }) => {
      const html = renderToStaticMarkup(
        <ContentCard
          accessMode={accessMode}
          isAuthenticated={isAuthenticated}
          item={item}
        />
      );

      expect(html).toContain(expectedLabel);
      expect(html).toContain(`>${expectedAction}</a>`);
      expect(html).not.toContain(">阅读</a>");
      expect(html).not.toContain("content.basic");
      expect(html).not.toContain("members_only");
    }
  );

  it("labels a public full article without implying a paid membership", () => {
    const html = renderToStaticMarkup(
      <ContentCard
        accessMode="full"
        item={{ ...item, requiredEntitlements: [], visibility: "public" }}
      />
    );

    expect(html).toContain("公开内容 · 可阅读全文");
    expect(html).toContain(">阅读全文</a>");
    expect(html).not.toContain("已包含在你的会员权益中");
  });

  it("does not present internal demo taxonomy as reader-facing topics", () => {
    const html = renderToStaticMarkup(
      <ContentCard
        accessMode="full"
        item={{ ...item, tags: ["demo", "supporting", "family"] }}
      />
    );

    expect(html).toContain(">family<");
    expect(html).not.toContain(">demo<");
    expect(html).not.toContain(">supporting<");
  });

  it("turns public topics into library discovery links", () => {
    const html = renderToStaticMarkup(
      <ContentCard accessMode="full" item={item} />
    );

    expect(html).toContain('href="/library?q=planning"');
    expect(html).toContain('aria-label="浏览与planning相关的内容"');
    expect(html).toContain("min-h-11");
    expect(html).toContain('aria-label="Save March 2026 Update Pack for later"');
  });

  it("supports an h3 title when nested below a related-reading heading", () => {
    const html = renderToStaticMarkup(
      <ContentCard accessMode="full" headingLevel={3} item={item} />
    );

    expect(html).toContain(`<h3`);
    expect(html).toContain(`>${item.title}</h3>`);
    expect(html).not.toContain(`>${item.title}</h2>`);
  });
});
