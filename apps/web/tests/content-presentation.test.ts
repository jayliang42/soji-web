import { describe, expect, it } from "vitest";
import {
  estimateReadingMinutes,
  formatContentType,
  formatPublishedDate
} from "@/lib/content-presentation";

describe("content presentation", () => {
  it("turns storage enum values into reader-facing labels", () => {
    expect(formatContentType("monthly_update")).toBe("Monthly update");
    expect(formatContentType("case_study")).toBe("Case study");
    expect(formatContentType("")).toBe("Content");
  });

  it("uses a deterministic short date and hides malformed metadata", () => {
    expect(formatPublishedDate("2026-07-19T21:47:56.62735+00:00")).toBe("Jul 19, 2026");
    expect(formatPublishedDate("not-a-date")).toBeNull();
  });

  it("estimates only the visible reading material", () => {
    expect(estimateReadingMinutes("A short public opening.")).toBe(1);
    expect(
      estimateReadingMinutes(Array.from({ length: 221 }, () => "word").join(" "))
    ).toBe(2);
    expect(estimateReadingMinutes("   ")).toBeNull();
    expect(estimateReadingMinutes(null)).toBeNull();
  });
});
