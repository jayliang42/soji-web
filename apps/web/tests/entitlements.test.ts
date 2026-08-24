import { describe, expect, it } from "vitest";
import {
  formatEntitlementList,
  getEntitlementLabel
} from "@/lib/entitlements";

describe("customer-facing entitlement labels", () => {
  it("maps internal keys to benefit language", () => {
    expect(getEntitlementLabel("office_hours.join")).toBe("线上答疑");
    expect(getEntitlementLabel("content.basic")).toBe(
      "基础月度文章"
    );
  });

  it("formats multiple benefits as a readable list", () => {
    expect(
      formatEntitlementList(["library.templates", "monthly.updates"])
    ).toBe("可下载模板和每月内容更新");
  });
});
