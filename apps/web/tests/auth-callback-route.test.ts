import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const callbackMocks = vi.hoisted(() => ({
  bootstrapUserProfile: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  getAuthReturnSiteUrl: vi.fn(),
  getUser: vi.fn(),
  reportOperationalError: vi.fn()
}));

vi.mock("@/lib/observability", () => ({
  reportOperationalError: callbackMocks.reportOperationalError
}));
vi.mock("@/lib/env", () => ({
  getAuthReturnSiteUrl: callbackMocks.getAuthReturnSiteUrl
}));
vi.mock("@/lib/supabase/profile", () => ({
  bootstrapUserProfile: callbackMocks.bootstrapUserProfile
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: callbackMocks.createSupabaseServerClient
}));

import { GET } from "@/app/auth/callback/route";

describe("OAuth callback", () => {
  const user = { id: "user-id" };
  const client = {
    auth: {
      exchangeCodeForSession: callbackMocks.exchangeCodeForSession,
      getUser: callbackMocks.getUser
    }
  };

  beforeEach(() => {
    for (const mock of Object.values(callbackMocks)) mock.mockReset();
    callbackMocks.createSupabaseServerClient.mockResolvedValue(client);
    callbackMocks.getAuthReturnSiteUrl.mockReturnValue("http://localhost:3000");
    callbackMocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    callbackMocks.getUser.mockResolvedValue({ data: { user }, error: null });
    callbackMocks.bootstrapUserProfile.mockResolvedValue({ ok: true });
  });

  function request(query: string) {
    return new NextRequest(`http://localhost:3000/auth/callback?${query}`);
  }

  it("rejects callbacks without an authorization code and preserves a safe next path", async () => {
    const response = await GET(request("next=%2Flibrary"));
    const location = new URL(response.headers.get("location")!);

    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("error")).toBe("oauth_callback_failed");
    expect(location.searchParams.get("next")).toBe("/library");
  });

  it("returns recovery callback failures with password-specific state", async () => {
    const response = await GET(
      request("flow=recovery&next=%2Freset-password")
    );
    const location = new URL(response.headers.get("location")!);

    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("error")).toBe(
      "password_reset_callback_failed"
    );
    expect(location.searchParams.get("next")).toBe("/reset-password");
  });

  it("records code exchange failures and does not continue", async () => {
    const exchangeError = new Error("provider rejected code");
    callbackMocks.exchangeCodeForSession.mockResolvedValue({ error: exchangeError });

    const response = await GET(request("code=bad&next=https://attacker.example"));
    const location = new URL(response.headers.get("location")!);

    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/account");
    expect(callbackMocks.getUser).not.toHaveBeenCalled();
    expect(callbackMocks.reportOperationalError).toHaveBeenCalledWith(
      "auth.oauth_code_exchange_failed",
      exchangeError
    );
  });

  it("records session user lookup failures", async () => {
    const userError = new Error("session lookup failed");
    callbackMocks.getUser.mockResolvedValue({
      data: { user: null },
      error: userError
    });

    const response = await GET(request("code=valid"));

    expect(new URL(response.headers.get("location")!).pathname).toBe("/login");
    expect(callbackMocks.reportOperationalError).toHaveBeenCalledWith(
      "auth.oauth_user_lookup_failed",
      userError
    );
  });

  it("sends an authenticated user to a recoverable setup failure page", async () => {
    callbackMocks.bootstrapUserProfile.mockResolvedValue({
      ok: false,
      reason: "profile_bootstrap_failed"
    });

    const response = await GET(request("code=valid&next=%2Flibrary"));
    const location = new URL(response.headers.get("location")!);

    expect(callbackMocks.bootstrapUserProfile).toHaveBeenCalledWith(client, "user-id");
    expect(location.pathname).toBe("/account");
    expect(location.searchParams.get("setup")).toBe("failed");
    expect(location.searchParams.get("next")).toBe("/library");
  });

  it("redirects to the validated destination only after initialization succeeds", async () => {
    const response = await GET(request("code=valid&next=%2Flibrary"));

    expect(response.headers.get("location")).toBe("http://localhost:3000/library");
  });

  it("uses the canonical site origin instead of the incoming proxy Host", async () => {
    callbackMocks.getAuthReturnSiteUrl.mockReturnValue("https://soji.example");
    const response = await GET(
      new NextRequest(
        "https://untrusted-proxy.example/auth/callback?code=valid&next=%2Flibrary"
      )
    );

    expect(response.headers.get("location")).toBe("https://soji.example/library");
  });

  it("keeps a trusted custom-domain callback and session redirect on one origin", async () => {
    callbackMocks.getAuthReturnSiteUrl.mockReturnValue(
      "https://www.gr8tfuture.com"
    );
    const requestUrl =
      "https://www.gr8tfuture.com/auth/callback?code=valid&next=%2Flibrary";
    const response = await GET(new NextRequest(requestUrl));

    expect(callbackMocks.getAuthReturnSiteUrl).toHaveBeenCalledWith(requestUrl);
    expect(response.headers.get("location")).toBe(
      "https://www.gr8tfuture.com/library"
    );
  });

  it("fails closed before code exchange when the canonical origin is unavailable", async () => {
    callbackMocks.getAuthReturnSiteUrl.mockReturnValue(null);
    const response = await GET(request("code=valid&next=%2Flibrary"));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "site_url_not_configured"
    });
    expect(callbackMocks.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(callbackMocks.reportOperationalError).toHaveBeenCalledWith(
      "auth.oauth_callback_site_url_invalid",
      expect.any(Error)
    );
  });
});
