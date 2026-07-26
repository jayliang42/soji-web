import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { AuthSessionMissingError } from "@supabase/supabase-js";

const supabaseMocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  reportOperationalError: vi.fn()
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: supabaseMocks.createServerClient
}));
vi.mock("@/lib/observability", () => ({
  reportOperationalError: supabaseMocks.reportOperationalError
}));

import { config, middleware } from "@/middleware";

describe("middleware mutation security", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    supabaseMocks.createServerClient.mockReset();
    supabaseMocks.reportOperationalError.mockReset();
  });

  it("uses the Node.js runtime required by the Supabase SSR client", () => {
    expect(config.runtime).toBe("nodejs");
  });

  it("rejects a cross-site checkout mutation before route processing", async () => {
    const response = await middleware(
      new NextRequest("https://soji.example/api/checkout/subscription", {
        headers: {
          Origin: "https://attacker.example",
          "Sec-Fetch-Site": "cross-site"
        },
        method: "POST"
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "cross_site_request_forbidden"
    });
  });

  it("passes a same-origin mutation to the route", async () => {
    const response = await middleware(
      new NextRequest("https://soji.example/api/admin/content", {
        headers: {
          Origin: "https://soji.example",
          "Sec-Fetch-Site": "same-origin"
        },
        method: "POST"
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects an unauthenticated protected route when Supabase is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    supabaseMocks.createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } })
      }
    });

    const response = await middleware(
      new NextRequest("https://soji.example/admin")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://soji.example/login?next=%2Fadmin"
    );
  });

  it("redirects a missing session without reporting an outage", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    supabaseMocks.createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new AuthSessionMissingError()
        })
      }
    });

    const response = await middleware(new NextRequest("https://soji.example/account"));

    expect(response.status).toBe(307);
    expect(supabaseMocks.reportOperationalError).not.toHaveBeenCalled();
  });

  it("preserves a signed-in user's safe destination", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    supabaseMocks.createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-id" } },
          error: null
        })
      }
    });

    const response = await middleware(
      new NextRequest(
        "https://soji.example/login?next=%2Fadmin%3Fview%3Dproducts"
      )
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://soji.example/admin?view=products"
    );
  });

  it("falls back to Account for an unsafe signed-in destination", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    supabaseMocks.createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-id" } },
          error: null
        })
      }
    });

    const response = await middleware(
      new NextRequest(
        "https://soji.example/login?next=https%3A%2F%2Fattacker.example"
      )
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://soji.example/account"
    );
  });

  it("returns 503 for a real auth outage on a protected page", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    const authError = new Error("auth transport unavailable");
    supabaseMocks.createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: authError
        })
      }
    });

    const response = await middleware(new NextRequest("https://soji.example/admin"));

    expect(response.status).toBe(503);
    expect(supabaseMocks.reportOperationalError).toHaveBeenCalledWith(
      "middleware.auth_lookup_failed",
      authError,
      { pathname: "/admin" }
    );
  });
});
