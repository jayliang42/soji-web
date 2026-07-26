import { describe, expect, it, vi } from "vitest";
import {
  getLegacyRecoveryCredentials,
  getPasswordRecoveryRedirectUrl,
  requestPasswordRecovery,
  updateRecoveredPassword,
  type PasswordRecoveryAuthClient
} from "@/lib/auth-recovery";

function authClient({
  resetError = null,
  updateError = null
}: {
  resetError?: { message: string } | null;
  updateError?: { message: string } | null;
} = {}) {
  return {
    resetPasswordForEmail: vi.fn().mockResolvedValue({ error: resetError }),
    updateUser: vi.fn().mockResolvedValue({ error: updateError })
  } satisfies PasswordRecoveryAuthClient;
}

describe("password recovery", () => {
  it("accepts only complete legacy recovery fragments", () => {
    expect(
      getLegacyRecoveryCredentials(
        "#access_token=access-value&refresh_token=refresh-value&type=recovery"
      )
    ).toEqual({
      accessToken: "access-value",
      refreshToken: "refresh-value"
    });
    expect(
      getLegacyRecoveryCredentials(
        "#access_token=access-value&refresh_token=refresh-value&type=invite"
      )
    ).toBeNull();
    expect(
      getLegacyRecoveryCredentials("#access_token=access-value&type=recovery")
    ).toBeNull();
  });

  it("builds a same-origin PKCE callback for the dedicated reset page", () => {
    expect(getPasswordRecoveryRedirectUrl("https://soji.example")).toBe(
      "https://soji.example/auth/callback?flow=recovery&next=%2Freset-password"
    );
  });

  it("requests a reset email with the validated application callback", async () => {
    const auth = authClient();

    await requestPasswordRecovery(auth, "member@example.com", "https://soji.example");

    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(
      "member@example.com",
      {
        redirectTo:
          "https://soji.example/auth/callback?flow=recovery&next=%2Freset-password"
      }
    );
  });

  it("uses stable errors instead of exposing provider reset details", async () => {
    const auth = authClient({
      resetError: { message: "provider account lookup detail" },
      updateError: { message: "provider password policy detail" }
    });

    await expect(
      requestPasswordRecovery(auth, "member@example.com", "https://soji.example")
    ).rejects.toThrow("password_reset_request_failed");
    await expect(updateRecoveredPassword(auth, "new-password")).rejects.toThrow(
      "password_update_failed"
    );
  });

  it("updates the authenticated recovery session password", async () => {
    const auth = authClient();

    await updateRecoveredPassword(auth, "new-password");

    expect(auth.updateUser).toHaveBeenCalledWith({ password: "new-password" });
  });
});
