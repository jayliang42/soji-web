import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const routeMocks = vi.hoisted(() => ({
  getAdminContext: vi.fn(),
  getManagedUserSnapshot: vi.fn()
}));

vi.mock("@/lib/admin-users", () => ({
  getManagedUserSnapshot: routeMocks.getManagedUserSnapshot,
  MANAGED_USERS_PAGE_SIZE: 25
}));

vi.mock("@/lib/publisher", () => ({
  getAdminContext: routeMocks.getAdminContext
}));

import { GET } from "@/app/api/admin/users/route";

function request(query = "") {
  return new NextRequest(`http://localhost:3000/api/admin/users${query}`);
}

describe("admin users query route", () => {
  beforeEach(() => {
    routeMocks.getAdminContext.mockReset();
    routeMocks.getManagedUserSnapshot.mockReset();
    routeMocks.getAdminContext.mockResolvedValue({
      supabase: { rpc: vi.fn() },
      user: { id: "admin-user" }
    });
  });

  it("returns the admin authentication error before querying users", async () => {
    routeMocks.getAdminContext.mockResolvedValue({
      error: NextResponse.json(
        { ok: false, reason: "not_authenticated" },
        { status: 401 }
      )
    });

    const response = await GET(request("?page=2"));

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(routeMocks.getManagedUserSnapshot).not.toHaveBeenCalled();
  });

  it("rejects out-of-range and unknown query parameters", async () => {
    const response = await GET(request("?page=0&limit=500"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "invalid_user_query"
    });
    expect(routeMocks.getManagedUserSnapshot).not.toHaveBeenCalled();
  });

  it("returns a fixed-size server-side search page", async () => {
    const snapshot = {
      items: [],
      page: 2,
      pageSize: 25,
      query: "older@example.com",
      source: "supabase",
      totalItems: 26,
      totalPages: 2
    } as const;
    routeMocks.getManagedUserSnapshot.mockResolvedValue(snapshot);

    const response = await GET(
      request("?page=2&query=older%40example.com")
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: true, snapshot });
    expect(routeMocks.getManagedUserSnapshot).toHaveBeenCalledWith({
      page: 2,
      pageSize: 25,
      query: "older@example.com",
      supabase: expect.any(Object)
    });
  });
});
