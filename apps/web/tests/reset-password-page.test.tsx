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

    expect(html).toContain("This reset link is no longer valid.");
    expect(html).toContain(
      "Request a new password reset email and open the newest link."
    );
    expect(html).toContain("Request another link");
    expect(html).not.toContain("Confirm new password");
  });

  it("shows the update form only for an authenticated Supabase session", async () => {
    pageMocks.getSessionSnapshot.mockResolvedValue({
      entitlements: [],
      source: "supabase",
      user: { id: "user-id" }
    });

    const html = renderToStaticMarkup(await ResetPasswordPage());

    expect(html).toContain("New password");
    expect(html).toContain("Confirm new password");
    expect(html).toContain("Update password");
    expect(html).not.toContain("This reset link is no longer valid.");

    const source = readFileSync(
      new URL("../src/components/password-reset-form.tsx", import.meta.url),
      "utf8"
    );
    expect(source).toContain("Password updated");
    expect(source).toContain("Your new password is ready to use.");
    expect(source).toContain("Continue to your account");
    expect(source).not.toContain("error.message");
  });
});
