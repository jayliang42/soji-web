import { getAuthCallbackUrl } from "@/lib/auth-redirect";

export interface PasswordRecoveryAuthClient {
  resetPasswordForEmail(
    email: string,
    options: { redirectTo: string }
  ): Promise<{ error: { message: string } | null }>;
  updateUser(attributes: {
    password: string;
  }): Promise<{ error: { message: string } | null }>;
}

export type LegacyRecoveryCredentials = {
  accessToken: string;
  refreshToken: string;
};

export function getLegacyRecoveryCredentials(
  hash: string
): LegacyRecoveryCredentials | null {
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (params.get("type") !== "recovery" || !accessToken || !refreshToken) {
    return null;
  }

  return { accessToken, refreshToken };
}

export function getPasswordRecoveryRedirectUrl(origin: string): string {
  return getAuthCallbackUrl(origin, "/reset-password", { flow: "recovery" });
}

export async function requestPasswordRecovery(
  auth: PasswordRecoveryAuthClient,
  email: string,
  origin: string
): Promise<void> {
  const { error } = await auth.resetPasswordForEmail(email, {
    redirectTo: getPasswordRecoveryRedirectUrl(origin)
  });
  if (error) {
    throw new Error("password_reset_request_failed", { cause: error });
  }
}

export async function updateRecoveredPassword(
  auth: PasswordRecoveryAuthClient,
  password: string
): Promise<void> {
  const { error } = await auth.updateUser({ password });
  if (error) {
    throw new Error("password_update_failed", { cause: error });
  }
}
