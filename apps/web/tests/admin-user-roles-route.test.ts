import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const routeMocks = vi.hoisted(() => ({
  getAdminContext: vi.fn(),
  reportOperationalError: vi.fn(),
  rpc: vi.fn()
}));

vi.mock("@/lib/publisher", () => ({
  getAdminContext: routeMocks.getAdminContext
}));
vi.mock("@/lib/observability", () => ({
  reportOperationalError: routeMocks.reportOperationalError
}));

import { PATCH } from "@/app/api/admin/users/roles/route";

const userId = "00000000-0000-4000-8000-000000000101";

function request(body: unknown) {
  return new NextRequest("http://localhost:3000/api/admin/users/roles", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "PATCH"
  });
}

describe("admin user role route", () => {
  beforeEach(() => {
    for (const mock of Object.values(routeMocks)) mock.mockReset();
    routeMocks.getAdminContext.mockResolvedValue({
      supabase: { rpc: routeMocks.rpc },
      user: { id: "admin_user" }
    });
  });

  it("returns the authentication error before parsing input", async () => {
    routeMocks.getAdminContext.mockResolvedValue({
      error: NextResponse.json(
        { ok: false, reason: "not_authenticated" },
        { status: 401 }
      )
    });

    const response = await PATCH(request({ accessRole: "admin", userId }));

    expect(response.status).toBe(401);
    expect(routeMocks.rpc).not.toHaveBeenCalled();
  });

  it("rejects malformed and over-posted role changes", async () => {
    const response = await PATCH(
      request({ accessRole: "admin", tier: "tier_3", userId })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "invalid_role_update"
    });
    expect(routeMocks.rpc).not.toHaveBeenCalled();
  });

  it("updates a role through the atomic database function", async () => {
    routeMocks.rpc.mockResolvedValue({
      data: [
        {
          assigned_role: "editor",
          changed_at: "2026-07-13T12:00:00.000Z",
          previous_role: "member"
        }
      ],
      error: null
    });

    const response = await PATCH(request({ accessRole: "editor", userId }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      item: {
        accessRole: "editor",
        changedAt: "2026-07-13T12:00:00.000Z",
        previousRole: "member",
        userId
      },
      ok: true
    });
    expect(routeMocks.rpc).toHaveBeenCalledWith("set_user_access_role", {
      p_access_role: "editor",
      p_target_user_id: userId
    });
  });

  it("protects the final admin account", async () => {
    routeMocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "last_admin_required" }
    });

    const response = await PATCH(request({ accessRole: "member", userId }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "last_admin_required"
    });
  });

  it("returns not found when the target profile disappeared", async () => {
    routeMocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "user_not_found" }
    });

    const response = await PATCH(request({ accessRole: "editor", userId }));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "user_not_found"
    });
    expect(routeMocks.reportOperationalError).not.toHaveBeenCalled();
  });

  it("records unexpected database failures without exposing their details", async () => {
    const databaseError = { message: "sensitive database connection detail" };
    routeMocks.rpc.mockResolvedValue({ data: null, error: databaseError });

    const response = await PATCH(request({ accessRole: "admin", userId }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "role_update_failed"
    });
    expect(routeMocks.reportOperationalError).toHaveBeenCalledWith(
      "admin.user_role.update_failed",
      databaseError,
      {
        actorUserId: "admin_user",
        requestedRole: "admin",
        targetUserId: userId
      }
    );
  });
});
