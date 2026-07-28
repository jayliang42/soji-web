import type { ContentItem } from "@soji/types";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ContentCard } from "@/components/content-card";

const item = {
  body: "Member-only body",
  coverImageAlt: "",
  id: "content-id",
  publishedAt: "2026-07-19T21:47:56.62735+00:00",
  requiredEntitlements: [],
  preview: "A practical public preview.",
  slug: "march-update-pack",
  summary: "A practical monthly update.",
  tags: [],
  title: "March 2026 Update Pack",
  type: "monthly_update",
  visibility: "public"
} satisfies ContentItem;

describe("content card", () => {
  it("renders a readable, machine-associated publication date", () => {
    const html = renderToStaticMarkup(<ContentCard accessMode="preview" item={item} />);

    expect(html).toContain(
      '<time dateTime="2026-07-19T21:47:56.62735+00:00">Jul 19, 2026</time>'
    );
    expect(html).toContain("Monthly update");
    expect(html).not.toContain(">2026-07-19T21:47:56.62735+00:00<");
  });
});
