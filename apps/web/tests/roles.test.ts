import { describe, expect, it } from "vitest";
import { hasAdminAccess, hasPublisherAccess } from "@/lib/roles";

describe("publisher role policy", () => {
  it("allows editors and admins to publish", () => {
    expect(hasPublisherAccess(["editor"])).toBe(true);
    expect(hasPublisherAccess(["admin"])).toBe(true);
  });

  it("does not allow a member to publish or inspect billing", () => {
    expect(hasPublisherAccess(["member"])).toBe(false);
    expect(hasAdminAccess(["member"])).toBe(false);
  });

  it("reserves billing administration for admins", () => {
    expect(hasAdminAccess(["editor"])).toBe(false);
    expect(hasAdminAccess(["admin"])).toBe(true);
  });
});
