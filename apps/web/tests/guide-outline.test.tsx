import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  getActiveGuideSectionId,
  GuideOutline
} from "@/components/guide-outline";
import type { MarkdownOutlineItem } from "@/lib/markdown-outline";

const outline: MarkdownOutlineItem[] = [
  { id: "compare", label: "Compare", level: 2, line: 1 },
  { id: "name-the-default", label: "Name the default", level: 2, line: 5 },
  { id: "choose", label: "Choose", level: 3, line: 9 }
];

describe("guide outline", () => {
  it("selects the last section that crossed the reading activation line", () => {
    const measurements = [
      { id: "compare", top: -120 },
      { id: "name-the-default", top: 100 },
      { id: "choose", top: 420 }
    ];

    expect(getActiveGuideSectionId(measurements, 144)).toBe(
      "name-the-default"
    );
    expect(
      getActiveGuideSectionId(
        measurements.map((measurement) => ({
          ...measurement,
          top: measurement.top + 500
        })),
        144
      )
    ).toBeNull();
    expect(getActiveGuideSectionId(measurements, Number.NaN)).toBeNull();
  });

  it("server-renders ordinary section links without a false current location", () => {
    const html = renderToStaticMarkup(
      <GuideOutline
        contentTargetId="guide-reading-body"
        headingId="desktop-outline"
        outline={outline}
        variant="desktop"
      />
    );

    expect(html).toContain('aria-labelledby="desktop-outline"');
    expect(html).toContain('href="#compare"');
    expect(html).toContain('href="#name-the-default"');
    expect(html).toContain('href="#choose"');
    expect(html).not.toContain("aria-current");
  });

  it("gives narrow screens a native collapsible outline before hydration", () => {
    const html = renderToStaticMarkup(
      <GuideOutline
        contentTargetId="guide-reading-body"
        headingId="mobile-outline"
        outline={outline}
        variant="mobile"
      />
    );

    expect(html).toContain("<details");
    expect(html).toContain("<summary");
    expect(html).toContain("3 个章节");
    expect(html).toContain('id="mobile-outline"');
    expect(html).toContain('href="#compare"');
  });
});
