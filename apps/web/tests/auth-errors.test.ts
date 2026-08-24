import { describe, expect, it } from "vitest";
import { getPublicAuthFailureMessage } from "@/lib/supabase/auth-errors";

describe("getPublicAuthFailureMessage", () => {
  it("uses stable, operation-specific customer copy", () => {
    expect(getPublicAuthFailureMessage("email_sign_in")).toBe(
      "We couldn't sign you in with those details. If you created the account with Google, use Continue with Google. Otherwise check your email and password or reset your password."
    );
    expect(getPublicAuthFailureMessage("email_sign_up")).toBe(
      "Account creation is temporarily unavailable. Try again shortly."
    );
    expect(getPublicAuthFailureMessage("google")).toBe(
      "Google sign-in is temporarily unavailable. Try again or continue with email."
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
