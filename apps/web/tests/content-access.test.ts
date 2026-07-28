import { describe, expect, it } from "vitest";
import type { ContentItem } from "@soji/types";
import {
  getContentAccessMode,
  getVisibleContentBody
} from "@/lib/content-access";

function contentItem(overrides: Partial<ContentItem> = {}): ContentItem {
  return {
    body: "PRIVATE BODY THAT MUST NOT LEAK",
    coverImageAlt: "A pencil beside a handwritten decision map.",
    id: "content-1",
    preview: "A useful public opening that is distinct from the summary.",
    publishedAt: "2026-07-13T00:00:00.000Z",
    requiredEntitlements: ["content.basic"],
    slug: "member-guide",
    summary: "A safe public summary.",
    tags: [],
    title: "Member guide",
    type: "article",
    visibility: "members_only",
    ...overrides
  };
}

describe("content access policy", () => {
  it("always exposes public content", () => {
    const item = contentItem({ visibility: "public" });
    expect(
      getContentAccessMode(item, { entitlements: [], isAuthenticated: false })
    ).toBe("full");
    expect(
      getContentAccessMode(item, {
        accessUnavailable: true,
        entitlements: [],
        isAuthenticated: false
      })
    ).toBe("full");
  });

  it("distinguishes an unverified restricted access state from a real tier lock", () => {
    const item = contentItem({ visibility: "purchase_required" });
    expect(
      getContentAccessMode(item, {
        accessUnavailable: true,
        entitlements: [],
        isAuthenticated: true
      })
    ).toBe("unavailable");
    expect(getVisibleContentBody(item, "unavailable")).toBe(item.preview);
    expect(getVisibleContentBody(item, "unavailable")).not.toContain("PRIVATE BODY");
  });

  it("gives anonymous users only a members-only preview", () => {
    const item = contentItem({ requiredEntitlements: [] });
    expect(
      getContentAccessMode(item, { entitlements: [], isAuthenticated: false })
    ).toBe("preview");
  });

  it("allows a signed-in member when no extra entitlement is required", () => {
    const item = contentItem({ requiredEntitlements: [] });
    expect(
      getContentAccessMode(item, { entitlements: [], isAuthenticated: true })
    ).toBe("full");
  });

  it("requires all configured member entitlements", () => {
    const item = contentItem({
      requiredEntitlements: ["content.basic", "library.templates"]
    });
    expect(
      getContentAccessMode(item, {
        entitlements: ["content.basic"],
        isAuthenticated: true
      })
    ).toBe("preview");
    expect(
      getContentAccessMode(item, {
        entitlements: ["content.basic", "library.templates"],
        isAuthenticated: true
      })
    ).toBe("full");
  });

  it("fails closed when purchase-required content has no entitlement rule", () => {
    const item = contentItem({
      requiredEntitlements: [],
      visibility: "purchase_required"
    });
    expect(
      getContentAccessMode(item, { entitlements: [], isAuthenticated: true })
    ).toBe("locked");
  });

  it("never exposes private body text in preview or locked modes", () => {
    const item = contentItem();
    expect(getVisibleContentBody(item, "preview")).toBe(item.preview);
    expect(getVisibleContentBody(item, "preview")).not.toBe(item.summary);
    expect(getVisibleContentBody(item, "preview")).not.toContain("PRIVATE BODY");
    expect(getVisibleContentBody(item, "locked")).toBeNull();
    expect(getVisibleContentBody(item, "full")).toBe(item.body);
  });
});
