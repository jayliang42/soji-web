import { beforeEach, describe, expect, it, vi } from "vitest";

const profileMocks = vi.hoisted(() => ({
  reportOperationalError: vi.fn(),
  rpc: vi.fn()
}));

vi.mock("@/lib/observability", () => ({
  reportOperationalError: profileMocks.reportOperationalError
}));

import { bootstrapUserProfile } from "@/lib/supabase/profile";

describe("profile bootstrap", () => {
  beforeEach(() => {
    profileMocks.rpc.mockReset();
    profileMocks.reportOperationalError.mockReset();
    profileMocks.rpc.mockResolvedValue({ data: "user-id", error: null });
  });

  it("initializes the profile and member role through one transaction RPC", async () => {
    const result = await bootstrapUserProfile(
      { rpc: profileMocks.rpc } as never,
      "user-id"
    );

    expect(result).toEqual({ ok: true });
    expect(profileMocks.rpc).toHaveBeenCalledTimes(1);
    expect(profileMocks.rpc).toHaveBeenCalledWith("bootstrap_user_profile");
  });

  it("logs database details but returns only a stable public error", async () => {
    const databaseError = { message: "sensitive constraint detail" };
    profileMocks.rpc.mockResolvedValue({ data: null, error: databaseError });

    const result = await bootstrapUserProfile(
      { rpc: profileMocks.rpc } as never,
      "user-id"
    );

    expect(result).toEqual({ ok: false, reason: "profile_bootstrap_failed" });
    expect(profileMocks.reportOperationalError).toHaveBeenCalledWith(
      "auth.profile_bootstrap_failed",
      databaseError,
      { userId: "user-id" }
    );
  });
});
