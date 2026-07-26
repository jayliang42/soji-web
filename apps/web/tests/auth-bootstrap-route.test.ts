import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthSessionMissingError } from "@supabase/supabase-js";

const routeMocks = vi.hoisted(() => ({
  bootstrapUserProfile: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  getUser: vi.fn(),
  reportOperationalError: vi.fn()
}));

vi.mock("@/lib/supabase/profile", () => ({
  bootstrapUserProfile: routeMocks.bootstrapUserProfile
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: routeMocks.createSupabaseServerClient
}));
vi.mock("@/lib/observability", () => ({
  reportOperationalError: routeMocks.reportOperationalError
}));

import { POST } from "@/app/api/auth/bootstrap/route";

describe("auth bootstrap route", () => {
  const client = { auth: { getUser: routeMocks.getUser } };

  beforeEach(() => {
    for (const mock of Object.values(routeMocks)) mock.mockReset();
    routeMocks.createSupabaseServerClient.mockResolvedValue(client);
    routeMocks.getUser.mockResolvedValue({
      data: { user: { id: "user-id" } },
      error: null
    });
    routeMocks.bootstrapUserProfile.mockResolvedValue({ ok: true });
  });

  it("returns not configured without attempting authentication", async () => {
    routeMocks.createSupabaseServerClient.mockResolvedValue(null);

    const response = await POST();

    expect(response.status).toBe(501);
    expect(routeMocks.getUser).not.toHaveBeenCalled();
  });

  it("rejects requests without an authenticated user", async () => {
    routeMocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await POST();

    expect(response.status).toBe(401);
    expect(routeMocks.bootstrapUserProfile).not.toHaveBeenCalled();
  });

  it("treats a missing session as unauthenticated without an alert", async () => {
    routeMocks.getUser.mockResolvedValue({
      data: { user: null },
      error: new AuthSessionMissingError()
    });

    const response = await POST();

    expect(response.status).toBe(401);
    expect(routeMocks.reportOperationalError).not.toHaveBeenCalled();
  });

  it("returns 503 when authentication cannot be checked", async () => {
    const authError = new Error("auth transport unavailable");
    routeMocks.getUser.mockResolvedValue({ data: { user: null }, error: authError });

    const response = await POST();

    expect(response.status).toBe(503);
    expect(routeMocks.reportOperationalError).toHaveBeenCalledWith(
      "auth.bootstrap_lookup_failed",
      authError
    );
  });

  it("reuses the authenticated client for atomic initialization", async () => {
    const response = await POST();

    expect(response.status).toBe(200);
    expect(routeMocks.bootstrapUserProfile).toHaveBeenCalledWith(client, "user-id");
  });

  it("returns a generic initialization failure", async () => {
    routeMocks.bootstrapUserProfile.mockResolvedValue({
      ok: false,
      reason: "profile_bootstrap_failed"
    });

    const response = await POST();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "profile_bootstrap_failed"
    });
  });
});
