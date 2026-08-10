import { beforeEach, describe, expect, it, vi } from "vitest";
import { getManagedUserSnapshot } from "@/lib/admin-users";
import type { AppSupabaseClient } from "@/lib/supabase/client-types";

const rpc = vi.fn();
const supabase = { rpc } as unknown as AppSupabaseClient;

describe("managed user snapshots", () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it("maps a bounded RPC page and preserves the exact total", async () => {
    rpc.mockResolvedValue({
      data: {
        items: [
          {
            access_role: "editor",
            created_at: "2026-07-14T12:00:00.000Z",
            email: "editor@soji.local",
            full_name: "Editorial User",
            id: "00000000-0000-4000-8000-000000000201",
            roles: ["member", "editor"],
            tier: "tier_1"
          }
        ],
        total_items: 61
      },
      error: null
    });

    const snapshot = await getManagedUserSnapshot({
      page: 2,
      pageSize: 25,
      query: "  editor  ",
      supabase
    });

    expect(rpc).toHaveBeenCalledWith("list_managed_users", {
      p_limit: 25,
      p_offset: 25,
      p_query: "editor"
    });
    expect(snapshot).toEqual({
      items: [
        {
          accessRole: "editor",
          createdAt: "2026-07-14T12:00:00.000Z",
          email: "editor@soji.local",
          fullName: "Editorial User",
          id: "00000000-0000-4000-8000-000000000201",
          roles: ["member", "editor"],
          tier: "tier_1"
        }
      ],
      page: 2,
      pageSize: 25,
      query: "editor",
      source: "supabase",
      totalItems: 61,
      totalPages: 3
    });
  });

  it("fails closed when the RPC response is unavailable", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "database unavailable" } });

    const snapshot = await getManagedUserSnapshot({ page: 3, supabase });

    expect(snapshot).toMatchObject({
      error: "database unavailable",
      items: [],
      page: 3,
      source: "supabase",
      totalItems: 0,
      totalPages: 0
    });
  });

  it("fails closed when the JSON RPC response has an invalid user shape", async () => {
    rpc.mockResolvedValue({
      data: { items: [{ id: "not-a-uuid" }], total_items: 1 },
      error: null
    });

    const snapshot = await getManagedUserSnapshot({ supabase });

    expect(snapshot).toMatchObject({
      error: "managed_users_response_invalid",
      items: [],
      source: "supabase",
      totalItems: 0
    });
  });
});
