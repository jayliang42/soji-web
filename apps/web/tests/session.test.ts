import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthSessionMissingError } from "@supabase/supabase-js";

const sessionMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  isDemoModeEnabled: vi.fn(),
  reportOperationalError: vi.fn()
}));

vi.mock("react", () => ({ cache: (loader: unknown) => loader }));
vi.mock("@/lib/env", () => ({
  isDemoModeEnabled: sessionMocks.isDemoModeEnabled
}));
vi.mock("@/lib/observability", () => ({
  reportOperationalError: sessionMocks.reportOperationalError
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: sessionMocks.createSupabaseServerClient
}));

import { getSessionSnapshot } from "@/lib/supabase/session";

describe("Supabase session error boundary", () => {
  beforeEach(() => {
    for (const mock of Object.values(sessionMocks)) mock.mockReset();
    sessionMocks.isDemoModeEnabled.mockReturnValue(false);
  });

  it("does not turn an Auth service error into a normal signed-out session", async () => {
    const authError = { message: "sensitive auth service detail" };
    sessionMocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: authError
        })
      }
    });

    await expect(getSessionSnapshot()).resolves.toEqual({
      entitlements: [],
      error: "session_auth_failed",
      source: "supabase",
      user: null
    });
    expect(sessionMocks.reportOperationalError).toHaveBeenCalledWith(
      "session.auth_lookup_failed",
      authError
    );
  });

  it("treats a missing browser session as a normal signed-out state", async () => {
    sessionMocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new AuthSessionMissingError()
        })
      }
    });

    await expect(getSessionSnapshot()).resolves.toEqual({
      entitlements: [],
      source: "supabase",
      user: null
    });
    expect(sessionMocks.reportOperationalError).not.toHaveBeenCalled();
  });

  it("returns restricted access and suppresses database query details", async () => {
    const profileError = { message: "sensitive profile policy detail" };
    const profileMaybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: profileError
    });
    const roleEq = vi.fn().mockResolvedValue({ data: [{ role: "admin" }], error: null });
    const entitlementOr = vi.fn().mockResolvedValue({
      data: [{ entitlement_id: "content.premium" }],
      error: null
    });
    const from = vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() =>
          table === "profiles"
            ? { maybeSingle: profileMaybeSingle }
            : table === "user_roles"
              ? roleEq()
              : { or: entitlementOr }
        )
      }))
    }));
    sessionMocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              app_metadata: {},
              email: "member@example.com",
              id: "user-id",
              identities: [],
              user_metadata: { full_name: "Member" }
            }
          },
          error: null
        })
      },
      from
    });

    const snapshot = await getSessionSnapshot();

    expect(snapshot).toMatchObject({
      entitlements: [],
      error: "session_query_failed",
      source: "supabase",
      user: { id: "user-id", roles: ["member"], tier: "free" }
    });
    expect(sessionMocks.reportOperationalError).toHaveBeenCalledWith(
      "session.data_query_failed",
      profileError,
      {
        entitlementsFailed: false,
        profileFailed: true,
        rolesFailed: false,
        userId: "user-id"
      }
    );
  });
});
