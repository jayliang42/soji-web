import { describe, expect, it } from "vitest";
import { getPublicAuthFailureMessage } from "@/lib/supabase/auth-errors";

describe("getPublicAuthFailureMessage", () => {
  it("uses stable, operation-specific customer copy", () => {
    expect(getPublicAuthFailureMessage("email_sign_in")).toBe(
      "无法使用这些信息登录。如果你是使用 Google 创建的账号，请选择“使用 Google 继续”；否则请检查邮箱和密码，或重置密码。"
    );
    expect(getPublicAuthFailureMessage("email_sign_up")).toBe(
      "暂时无法创建账号，请稍后再试。"
    );
    expect(getPublicAuthFailureMessage("google")).toBe(
      "Google 登录暂时不可用，请稍后再试或改用邮箱登录。"
    );
  });

  it("cannot include provider or account-enumeration detail", () => {
    const providerDetails = [
      "User not found",
      "Email already registered",
      "provider account lookup detail"
    ];
    const messages = [
      getPublicAuthFailureMessage("email_sign_in"),
      getPublicAuthFailureMessage("email_sign_up"),
      getPublicAuthFailureMessage("google")
    ];

    for (const message of messages) {
      for (const providerDetail of providerDetails) {
        expect(message).not.toContain(providerDetail);
      }
    }
  });
});
