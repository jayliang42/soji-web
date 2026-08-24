import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({ hasSupabaseConfig: () => true }));
vi.mock("@/lib/session", () => ({
  getSessionSnapshot: () =>
    Promise.resolve({ entitlements: [], source: "supabase", user: null })
}));

import LoginPage from "@/app/login/page";

describe("login page", () => {
  it("renders one clear authentication path for a configured guest", async () => {
    const html = renderToStaticMarkup(
      await LoginPage({
        searchParams: Promise.resolve({ next: "/account" })
      })
    );

    expect(html).toContain("登录你的 GS学院账号");
    expect(html).toContain("进入账号中心");
    expect(html).toContain("继续前往账号中心");
    expect(html).toContain("暂时浏览公开指南");
    expect(html).toContain("使用 Google 继续");
    expect(html).toContain("或使用邮箱继续");
    expect(html).toContain("使用邮箱登录");
    expect(html).toContain("忘记密码？");
    expect(html.indexOf("使用 Google 继续")).toBeLessThan(
      html.indexOf("或使用邮箱继续")
    );
    expect(html).toContain('aria-busy="false"');
    expect(html).not.toContain("尚未登录");
    expect(html).not.toContain('href="/login"');
  });

  it("keeps confirmation, redirect, and stable-error contracts in the client flow", () => {
    const source = readFileSync(
      new URL("../src/components/login-form.tsx", import.meta.url),
      "utf8"
    );

    expect(source).toContain("emailRedirectTo: getAuthCallbackUrl");
    expect(source).toContain("redirectTo: getAuthCallbackUrl");
    expect(source).toContain("请查看邮箱");
    expect(source).toContain("使用其他邮箱");
    expect(source).toContain("返回登录");
    expect(source).toContain("getPublicAuthFailureMessage(operation)");
    expect(source).not.toContain("error.message");
    expect(source).not.toContain("/api/auth/bootstrap_test");
  });

  it("distinguishes an expired recovery link from a Google sign-in failure", async () => {
    const html = renderToStaticMarkup(
      await LoginPage({
        searchParams: Promise.resolve({
          error: "password_reset_callback_failed",
          next: "/reset-password"
        })
      })
    );

    expect(html).toContain("无法完成密码重置。");
    expect(html).toContain("申请新的密码重置链接");
    expect(html).toContain("重置密码");
    expect(html).toContain("发送重置链接");
    expect(html).toContain("返回登录");
    expect(html).not.toContain("使用 Google 继续");
    expect(html).not.toContain(">密码<");
    expect(html).not.toContain("无法完成 Google 登录。");
  });
});
