import { describe, expect, it } from "vitest";
import {
  hasActiveProductGrant,
  hasProductAccess
} from "@/lib/product-access";

describe("product access boundaries", () => {
  it("keeps a single-case purchase scoped to that product", () => {
    expect(
      hasProductAccess(
        ["product.case_study_single"],
        "product.case_study_single"
      )
    ).toBe(true);
    expect(
      hasProductAccess(["product.case_study_single"], "product.digital")
    ).toBe(false);
  });

  it("treats product.digital as the Full Access umbrella grant", () => {
    expect(
      hasProductAccess(["product.digital"], "product.case_study_single")
    ).toBe(true);
  });

  it("ignores expired exact and umbrella grants", () => {
    const now = Date.parse("2026-08-16T12:00:00.000Z");
    expect(
      hasActiveProductGrant(
        [
          {
            entitlement_id: "product.case_study_single",
            ends_at: "2026-08-16T11:59:59.000Z"
          },
          {
            entitlement_id: "product.digital",
            ends_at: "2026-08-16T11:00:00.000Z"
          }
        ],
        "product.case_study_single",
        now
      )
    ).toBe(false);
  });
});
