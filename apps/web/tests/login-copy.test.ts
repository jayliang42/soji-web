import { describe, expect, it } from "vitest";
import { getLoginPageCopy } from "@/lib/login-copy";

describe("login page intent copy", () => {
  it("keeps the editorial default for library destinations", () => {
    expect(getLoginPageCopy("/library/money-reset-ritual").title).toBe(
      "Sign in to continue reading"
    );
  });

  it("matches the membership task", () => {
    expect(getLoginPageCopy("/pricing").title).toBe(
      "Sign in to choose your membership"
    );
    expect(getLoginPageCopy("/pricing#plan-tier_2").destinationLabel).toBe(
      "membership options"
    );
  });

  it("matches product list and detail purchases", () => {
    expect(getLoginPageCopy("/products").title).toBe(
      "Sign in to complete your purchase"
    );
    expect(getLoginPageCopy("/products/wealth-dashboard-template-pack").title).toBe(
      "Sign in to complete your purchase"
    );
  });

  it("matches account management", () => {
    expect(getLoginPageCopy("/account").title).toBe(
      "Sign in to your Soji account"
    );
    expect(getLoginPageCopy("/account?view=purchases").destinationLabel).toBe(
      "your account"
    );
  });

  it("matches office hours and password recovery", () => {
    expect(getLoginPageCopy("/office-hours").title).toBe(
      "Sign in to view Office Hours"
    );
    expect(getLoginPageCopy("/reset-password").title).toBe(
      "Request a new password link"
    );
  });

  it("matches the protected admin workspace", () => {
    expect(getLoginPageCopy("/admin?view=products").title).toBe(
      "Sign in to access Admin"
    );
  });
});
