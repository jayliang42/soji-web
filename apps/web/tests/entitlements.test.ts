import { describe, expect, it } from "vitest";
import {
  formatEntitlementList,
  getEntitlementLabel
} from "@/lib/entitlements";

describe("customer-facing entitlement labels", () => {
  it("maps internal keys to benefit language", () => {
    expect(getEntitlementLabel("office_hours.join")).toBe("Live office hours");
    expect(getEntitlementLabel("content.basic")).toBe(
      "Foundational monthly essays"
    );
  });

  it("formats multiple benefits as a readable list", () => {
    expect(
      formatEntitlementList(["library.templates", "monthly.updates"])
    ).toBe("Downloadable templates and Monthly update drops");
  });
});
