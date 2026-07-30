import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  getPlanFinderOption,
  PlanFinder,
  planFinderOptions
} from "@/components/plan-finder";

describe("membership plan finder", () => {
  it("maps each need to exactly one paid membership tier", () => {
    expect(planFinderOptions.map((option) => option.planId)).toEqual([
      "tier_1",
      "tier_2",
      "tier_3"
    ]);
    expect(getPlanFinderOption("tier_1")?.label).toBe(
      "Build a calmer monthly rhythm"
    );
    expect(getPlanFinderOption("tier_2")?.label).toBe(
      "Use the full working library"
    );
    expect(getPlanFinderOption("tier_3")?.label).toBe(
      "Add live guided support"
    );
  });

  it("renders an unselected, accessible starting state", () => {
    const html = renderToStaticMarkup(<PlanFinder />);

    expect(html).toContain('aria-label="Choose the support you need"');
    expect(html.match(/aria-pressed="false"/gu)).toHaveLength(3);
    expect(html).toContain("Choose the closest match above.");
    expect(html).not.toContain("Your best starting point");
  });
});
