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

    expect(html).toContain("Sign in to your Soji account");
    expect(html).toContain("Open your account");
    expect(html).toContain("Continue to your account.");
    expect(html).toContain("Browse public guides instead");
    expect(html).toContain("Continue with Google");
    expect(html).toContain("or continue with email");
    expect(html).toContain("Sign in with email");
    expect(html).toContain("Forgot password?");
    expect(html.indexOf("Continue with Google")).toBeLessThan(
      html.indexOf("or continue with email")
    );
    expect(html).toContain('aria-busy="false"');
    expect(html).not.toContain("Not signed in");
    expect(html).not.toContain('href="/login"');
  });

  it("keeps confirmation, redirect, and stable-error contracts in the client flow", () => {
    const source = readFileSync(
      new URL("../src/components/login-form.tsx", import.meta.url),
      "utf8"
    );

    expect(source).toContain("emailRedirectTo: getAuthCallbackUrl");
    expect(source).toContain("redirectTo: getAuthCallbackUrl");
    expect(source).toContain("Check your inbox");
    expect(source).toContain("Use a different email");
    expect(source).toContain("Return to sign in");
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

    expect(html).toContain("The password reset link could not be completed.");
    expect(html).toContain("Request a new password link");
    expect(html).toContain("Reset your password");
    expect(html).toContain("Send reset link");
    expect(html).toContain("Back to sign in");
    expect(html).not.toContain("Continue with Google");
    expect(html).not.toContain(">Password<");
    expect(html).not.toContain("Google sign-in could not be completed.");
  });
});
