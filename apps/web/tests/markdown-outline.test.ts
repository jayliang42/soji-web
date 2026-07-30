import { describe, expect, it } from "vitest";
import { getMarkdownOutline } from "@/lib/markdown-outline";

describe("markdown outline", () => {
  it("extracts readable, nested, stable headings", () => {
    expect(
      getMarkdownOutline(
        [
          "# A **clear** start",
          "",
          "## Compare [the options](/pricing)",
          "",
          "### Decide `today`",
          "",
          "A final review",
          "--------------"
        ].join("\n")
      )
    ).toEqual([
      { id: "a-clear-start", label: "A clear start", level: 1, line: 1 },
      {
        id: "compare-the-options",
        label: "Compare the options",
        level: 2,
        line: 3
      },
      { id: "decide-today", label: "Decide today", level: 3, line: 5 },
      { id: "a-final-review", label: "A final review", level: 2, line: 7 }
    ]);
  });

  it("deduplicates matching headings and ignores fenced code", () => {
    expect(
      getMarkdownOutline(
        [
          "## Review",
          "## Review",
          "",
          "~~~md",
          "## Hidden example",
          "~~~",
          "",
          "## Réview"
        ].join("\n")
      )
    ).toEqual([
      { id: "review", label: "Review", level: 2, line: 1 },
      { id: "review-2", label: "Review", level: 2, line: 2 },
      { id: "review-3", label: "Réview", level: 2, line: 8 }
    ]);
  });

  it("returns no outline for missing visible content", () => {
    expect(getMarkdownOutline(null)).toEqual([]);
    expect(getMarkdownOutline("  ")).toEqual([]);
  });
});
