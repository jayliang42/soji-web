import { describe, expect, it } from "vitest";
import {
  getSafeNextPath,
  isNavigationSectionActive
} from "@/lib/navigation";

describe("getSafeNextPath", () => {
  it("preserves local paths, queries, and fragments", () => {
    expect(getSafeNextPath("/library/item?from=login#details")).toBe(
      "/library/item?from=login#details"
    );
  });

  it.each([
    undefined,
    null,
    "",
    "https://evil.example",
    "//evil.example/path",
    "/\\evil.example/path"
  ])("falls back for unsafe redirect value %s", (value) => {
    expect(getSafeNextPath(value)).toBe("/account");
  });
});

describe("isNavigationSectionActive", () => {
  it("matches a section root and its nested routes", () => {
    expect(isNavigationSectionActive("/library", "/library")).toBe(true);
    expect(isNavigationSectionActive("/library/family-foundations", "/library")).toBe(true);
  });

  it("does not match lookalike or unrelated routes", () => {
    expect(isNavigationSectionActive("/library-old", "/library")).toBe(false);
    expect(isNavigationSectionActive("/pricing", "/library")).toBe(false);
  });

  it("matches the homepage exactly", () => {
    expect(isNavigationSectionActive("/", "/")).toBe(true);
    expect(isNavigationSectionActive("/pricing", "/")).toBe(false);
  });

  it("distinguishes account subsections by their view query", () => {
    expect(
      isNavigationSectionActive(
        "/account",
        "/account?view=subscriptions",
        "view=subscriptions"
      )
    ).toBe(true);
    expect(
      isNavigationSectionActive(
        "/account",
        "/account",
        "view=subscriptions"
      )
    ).toBe(false);
    expect(
      isNavigationSectionActive("/account", "/account", "purchase=success")
    ).toBe(true);
    expect(
      isNavigationSectionActive("/account", "/account?view=subscriptions")
    ).toBe(false);
  });
});
