import type { ContentItem } from "@soji/types";
import { describe, expect, it } from "vitest";
import { getRelatedContentItems } from "@/lib/related-content";

function createItem(
  id: string,
  overrides: Partial<ContentItem> = {}
): ContentItem {
  return {
    body: `${id} body`,
    coverImageAlt: "",
    id,
    preview: `${id} preview`,
    publishedAt: "2026-01-01",
    requiredEntitlements: [],
    slug: id,
    summary: `${id} summary`,
    tags: [],
    title: id,
    type: "article",
    visibility: "public",
    ...overrides
  };
}

describe("related content", () => {
  it("prioritizes shared public topics before content type and recency", () => {
    const current = createItem("current", {
      tags: ["family", "cash flow"],
      type: "article"
    });
    const newestSameType = createItem("newest-same-type", {
      publishedAt: "2026-07-30",
      type: "article"
    });
    const oneSharedTopic = createItem("one-shared-topic", {
      publishedAt: "2026-01-01",
      tags: ["family"],
      type: "template"
    });
    const twoSharedTopics = createItem("two-shared-topics", {
      publishedAt: "2025-01-01",
      tags: ["Cash Flow", " family "],
      type: "case_study"
    });

    expect(
      getRelatedContentItems(current, [
        newestSameType,
        oneSharedTopic,
        twoSharedTopics
      ]).map((item) => item.id)
    ).toEqual(["two-shared-topics", "one-shared-topic", "newest-same-type"]);
  });

  it("does not treat internal taxonomy as a reader-facing relationship", () => {
    const current = createItem("current", {
      tags: ["demo", "supporting"],
      type: "template"
    });
    const olderInternalMatch = createItem("older-internal-match", {
      publishedAt: "2026-01-01",
      tags: ["DEMO", " supporting "],
      type: "article"
    });
    const newerFallback = createItem("newer-fallback", {
      publishedAt: "2026-07-30",
      type: "article"
    });

    expect(
      getRelatedContentItems(current, [olderInternalMatch, newerFallback]).map(
        (item) => item.id
      )
    ).toEqual(["newer-fallback", "older-internal-match"]);
  });

  it("excludes the current item, respects the limit, and breaks ties by slug", () => {
    const current = createItem("current");
    const alpha = createItem("alpha", { publishedAt: "not-a-date" });
    const beta = createItem("beta", { publishedAt: "not-a-date" });

    expect(
      getRelatedContentItems(current, [beta, current, alpha], 1).map(
        (item) => item.id
      )
    ).toEqual(["alpha"]);
    expect(getRelatedContentItems(current, [alpha], 0)).toEqual([]);
  });
});
