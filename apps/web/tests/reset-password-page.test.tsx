import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pageMocks = vi.hoisted(() => ({ getSessionSnapshot: vi.fn() }));

vi.mock("@/lib/session", () => ({
  getSessionSnapshot: pageMocks.getSessionSnapshot
}));

import ResetPasswordPage from "@/app/reset-password/page";

describe("reset password page", () => {
  beforeEach(() => pageMocks.getSessionSnapshot.mockReset());

  it("requires a Supabase recovery session before showing password fields", async () => {
    pageMocks.getSessionSnapshot.mockResolvedValue({
      entitlements: [],
      source: "supabase",
      user: null
    });

    const html = renderToStaticMarkup(await ResetPasswordPage());

    expect(html).toContain("此重置链接已失效");
    expect(html).toContain(
      "请申请新的密码重置邮件，并打开最新收到的链接。"
    );
    expect(html).toContain("申请新链接");
    expect(html).not.toContain("确认新密码");
  });

  it("shows the update form only for an authenticated Supabase session", async () => {
    pageMocks.getSessionSnapshot.mockResolvedValue({
      entitlements: [],
      source: "supabase",
      user: { id: "user-id" }
    });

    const html = renderToStaticMarkup(await ResetPasswordPage());

    expect(html).toContain("新密码");
    expect(html).toContain("确认新密码");
    expect(html).toContain("更新密码");
    expect(html).not.toContain("此重置链接已失效");

    const source = readFileSync(
      new URL("../src/components/password-reset-form.tsx", import.meta.url),
      "utf8"
    );
    expect(source).toContain("密码已更新");
    expect(source).toContain("现在可以使用新密码登录。");
    expect(source).toContain("前往账号中心");
    expect(source).not.toContain("error.message");
  });
});
