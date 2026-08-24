import { describe, expect, it } from "vitest";
import { getLoginPageCopy } from "@/lib/login-copy";

describe("login page intent copy", () => {
  it("keeps the editorial default for library destinations", () => {
    expect(getLoginPageCopy("/library/money-reset-ritual").title).toBe(
      "登录后继续阅读"
    );
  });

  it("matches the membership task", () => {
    expect(getLoginPageCopy("/pricing").title).toBe(
      "登录后选择解锁方案"
    );
    expect(getLoginPageCopy("/pricing#plan-tier_2").destinationLabel).toBe(
      "解锁方案"
    );
  });

  it("returns a paid guest to the purchase claim task", () => {
    const copy = getLoginPageCopy("/checkout/claim");

    expect(copy.title).toBe("登录并领取你的购买");
    expect(copy.description).toContain("付款时填写的邮箱");
    expect(copy.panelDescription).toContain("不会要求你再次付款");
  });

  it("matches product list and detail purchases", () => {
    expect(getLoginPageCopy("/products").title).toBe(
      "登录后完成购买"
    );
    expect(getLoginPageCopy("/products/wealth-dashboard-template-pack").title).toBe(
      "登录后完成购买"
    );
  });

  it("matches account management", () => {
    expect(getLoginPageCopy("/account").title).toBe(
      "登录你的 GS学院账号"
    );
    expect(getLoginPageCopy("/account?view=purchases").destinationLabel).toBe(
      "账号中心"
    );
  });

  it("matches office hours and password recovery", () => {
    expect(getLoginPageCopy("/office-hours").title).toBe(
      "登录后查看线上答疑"
    );
    expect(getLoginPageCopy("/reset-password").title).toBe(
      "申请新的密码重置链接"
    );
  });

  it("matches the protected admin workspace", () => {
    expect(getLoginPageCopy("/admin?view=products").title).toBe(
      "Sign in to access Admin"
    );
  });
});
