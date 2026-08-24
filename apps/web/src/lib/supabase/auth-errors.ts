import { isAuthSessionMissingError } from "@supabase/supabase-js";

export type PublicAuthOperation =
  | "email_sign_in"
  | "email_sign_up"
  | "google";

const publicAuthFailureMessages: Record<PublicAuthOperation, string> = {
  email_sign_in:
    "无法使用这些信息登录。如果你是使用 Google 创建的账号，请选择“使用 Google 继续”；否则请检查邮箱和密码，或重置密码。",
  email_sign_up:
    "暂时无法创建账号，请稍后再试。",
  google:
    "Google 登录暂时不可用，请稍后再试或改用邮箱登录。"
};

export function isMissingAuthSession(error: unknown) {
  return isAuthSessionMissingError(error);
}

export function getPublicAuthFailureMessage(
  operation: PublicAuthOperation
): string {
  return publicAuthFailureMessages[operation];
}
