import { beforeEach, describe, expect, it, vi } from "vitest";

const billingMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  isExplicitDemoModeEnabled: vi.fn()
}));

vi.mock("@/lib/env", () => ({
  isExplicitDemoModeEnabled: billingMocks.isExplicitDemoModeEnabled
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: billingMocks.createSupabaseServerClient
}));

import { getBillingEventSnapshot } from "@/lib/billing";

describe("billing event snapshots", () => {
  beforeEach(() => {
    billingMocks.createSupabaseServerClient.mockReset();
    billingMocks.isExplicitDemoModeEnabled.mockReset();
    billingMocks.createSupabaseServerClient.mockResolvedValue(null);
    billingMocks.isExplicitDemoModeEnabled.mockReturnValue(false);
  });

  it("keeps demo billing records disabled by default", async () => {
    await expect(getBillingEventSnapshot()).resolves.toEqual({
      items: [],
      page: 1,
      pageSize: 25,
      source: "demo",
      totalItems: 0,
      totalPages: 1
    });
  });

  it("shows explicit demo mode with separate receipt and processing evidence", async () => {
    billingMocks.isExplicitDemoModeEnabled.mockReturnValue(true);

    const snapshot = await getBillingEventSnapshot();

    expect(snapshot.items[0]).toMatchObject({
      attemptCount: 2,
      providerEventId: "evt_demo_received_failed",
      status: "failed"
    });
    expect(snapshot.items[0]?.createdAt).toBeTruthy();
    expect(snapshot.items[0]?.lastAttemptedAt).toBeTruthy();
    expect(snapshot).toMatchObject({
      page: 1,
      pageSize: 25,
      totalItems: 1,
      totalPages: 1
    });
  });

  it("returns the exact live total for pagination", async () => {
    const limit = vi.fn().mockResolvedValue({
      count: 61,
      data: [],
      error: null
    });
    const orderResult = { limit, order: vi.fn() };
    const order = orderResult.order;
    order.mockReturnValue(orderResult);
    const select = vi.fn(() => ({ order }));
    billingMocks.createSupabaseServerClient.mockResolvedValue({
      from: vi.fn(() => ({ select }))
    });

    await expect(getBillingEventSnapshot()).resolves.toMatchObject({
      page: 1,
      pageSize: 25,
      totalItems: 61,
      totalPages: 3
    });
    expect(select).toHaveBeenCalledWith(expect.any(String), { count: "exact" });
  });
});
