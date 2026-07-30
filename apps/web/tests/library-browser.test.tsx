import type { ContentCardItem } from "@/components/content-card";
import {
  getLibraryFilterHref,
  LibraryBrowser
} from "@/components/library-browser";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

function item(
  id: string,
  title: string,
  tags: string[],
  type: ContentCardItem["type"] = "article"
): ContentCardItem {
  return {
    coverImageAlt: "",
    id,
    publishedAt: "2026-07-30",
    requiredEntitlements: [],
    slug: id,
    summary: `${title} summary`,
    tags,
    title,
    type,
    visibility: "public"
  };
}

const entries = [
  {
    accessMode: "full" as const,
    item: item("money-audit", "The First Money Audit", ["audit"])
  },
  {
    accessMode: "full" as const,
    item: item(
      "salary-playbook",
      "Salary Negotiation Playbook",
      ["negotiation"],
      "case_study"
    )
  },
  {
    accessMode: "full" as const,
    item: item("family-scripts", "Family Money Scripts", ["family", "scripts"])
  }
];

describe("library browser", () => {
  it("renders accessible search, format, focus, and result controls", () => {
    const html = renderToStaticMarkup(
      <LibraryBrowser entries={entries} isAuthenticated={false} />
    );

    expect(html).toContain("What would feel useful right now?");
    expect(html).toContain('type="search"');
    expect(html).toContain("All formats");
    expect(html).toContain('aria-label="Filter guides by focus"');
    expect(html).toContain("3 guides in the library");
  });

  it("honors a goal-focused entry path before hydration", () => {
    const html = renderToStaticMarkup(
      <LibraryBrowser
        entries={entries}
        initialFocus="career"
        isAuthenticated={false}
      />
    );

    expect(html).toContain("Salary Negotiation Playbook");
    expect(html).not.toContain("The First Money Audit");
    expect(html).not.toContain("Family Money Scripts");
    expect(html).toContain("1 guide match your filters");
  });

  it("honors shareable query and format filters before hydration", () => {
    const html = renderToStaticMarkup(
      <LibraryBrowser
        entries={entries}
        initialFormat="case_study"
        initialQuery="salary"
        isAuthenticated={false}
      />
    );

    expect(html).toContain('value="salary"');
    expect(html).toContain(
      '<option value="case_study" selected="">Case study</option>'
    );
    expect(html).toContain("Salary Negotiation Playbook");
    expect(html).not.toContain("The First Money Audit");
    expect(html).not.toContain("Family Money Scripts");
    expect(html).toContain("1 guide match your filters");
  });

  it("falls back to the full library for an unknown focus", () => {
    const html = renderToStaticMarkup(
      <LibraryBrowser
        entries={entries}
        initialFocus="not-a-real-focus"
        isAuthenticated={false}
      />
    );

    expect(html).toContain("3 guides in the library");
  });

  it("builds a compact shareable URL and omits inactive filters", () => {
    expect(
      getLibraryFilterHref({
        focus: "family",
        format: "article",
        query: " cash flow "
      })
    ).toBe("/library?focus=family&format=article&q=cash+flow");
    expect(
      getLibraryFilterHref({ focus: "all", format: "all", query: " " })
    ).toBe("/library");
  });
});
