import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  getPlanFinderOption,
  PlanFinder,
  planFinderOptions
} from "@/components/plan-finder";

describe("membership plan finder", () => {
  it("maps each need to exactly one paid membership tier", () => {
    expect(planFinderOptions.map((option) => option.planId)).toEqual(["tier_1"]);
    expect(getPlanFinderOption("tier_1")?.label).toBe("解锁全部内容");
    expect(getPlanFinderOption("tier_2")).toBeNull();
    expect(getPlanFinderOption("tier_3")).toBeNull();
  });

  it("renders an unselected, accessible starting state", () => {
    const html = renderToStaticMarkup(<PlanFinder />);

    expect(html).toContain('aria-label="选择你需要的支持"');
    expect(html.match(/aria-pressed="false"/gu)).toHaveLength(1);
    expect(html).toContain("请选择上方最接近的选项");
    expect(html).not.toContain("推荐方案");
  });
});
