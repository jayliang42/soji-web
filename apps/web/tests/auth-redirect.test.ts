import { describe, expect, it } from "vitest";
import { getAuthCallbackUrl } from "@/lib/auth-redirect";

describe("getAuthCallbackUrl", () => {
  it.each([
    ["/account", "/account"],
    ["/admin?view=users", "/admin?view=users"],
    ["/library/family-foundations#lesson", "/library/family-foundations#lesson"]
  ])("preserves the safe destination %s", (nextPath, expected) => {
    const callback = new URL(
      getAuthCallbackUrl("https://soji.example", nextPath)
    );

    expect(callback.origin).toBe("https://soji.example");
    expect(callback.pathname).toBe("/auth/callback");
    expect(callback.searchParams.get("next")).toBe(expected);
  });

  it.each([
    "https://attacker.example",
    "//attacker.example",
    "/\\attacker.example",
    "not a path"
  ])("falls back to account for unsafe destination %s", (nextPath) => {
    const callback = new URL(
      getAuthCallbackUrl("https://soji.example", nextPath)
    );

    expect(callback.searchParams.get("next")).toBe("/account");
  });

  it("uses only the supplied canonical origin", () => {
    const callback = new URL(
      getAuthCallbackUrl("https://soji.example", "/account")
    );

    expect(callback.origin).toBe("https://soji.example");
    expect(callback.host).not.toBe("preview.example");
  });

  it("adds the recovery flow without changing the safe destination", () => {
    const callback = new URL(
      getAuthCallbackUrl("https://soji.example", "/reset-password", {
        flow: "recovery"
      })
    );

    expect(callback.searchParams.get("flow")).toBe("recovery");
    expect(callback.searchParams.get("next")).toBe("/reset-password");
  });
});
