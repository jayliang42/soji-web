import { beforeEach, describe, expect, it, vi } from "vitest";

const purchaseMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  eq: vi.fn(),
  from: vi.fn(),
  order: vi.fn(),
  select: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: purchaseMocks.createSupabaseServerClient
}));

import {
  getAccountMembershipPurchases,
  getAccountPurchases
} from "@/lib/account-purchases";

describe("account purchase history", () => {
  beforeEach(() => {
    for (const mock of Object.values(purchaseMocks)) {
      mock.mockReset();
    }
    purchaseMocks.from.mockReturnValue({ select: purchaseMocks.select });
    purchaseMocks.select.mockReturnValue({ eq: purchaseMocks.eq });
    purchaseMocks.eq.mockReturnValue({ order: purchaseMocks.order });
    purchaseMocks.createSupabaseServerClient.mockResolvedValue({
      from: purchaseMocks.from
    });
  });

  it("does not query private purchase data for guests or demo sessions", async () => {
    await expect(getAccountPurchases(undefined, "supabase")).resolves.toEqual({
      items: []
    });
    await expect(
      getAccountMembershipPurchases(undefined, "supabase")
    ).resolves.toEqual({ items: [] });
    await expect(getAccountPurchases("demo-user", "demo")).resolves.toEqual({
      items: []
    });
    await expect(
      getAccountMembershipPurchases("demo-user", "demo")
    ).resolves.toEqual({ items: [] });
    expect(purchaseMocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("returns the signed-in user's newest purchase records", async () => {
    purchaseMocks.order.mockResolvedValue({
      data: [
        {
          created_at: "2026-07-14T12:00:00Z",
          dispute_status: null,
          id: "purchase-1",
          product_id: "product-1",
          products: {
            product_assets: { id: "asset-1" },
            slug: "wealth-dashboard",
            title: "Wealth Dashboard"
          },
          status: "paid"
        }
      ],
      error: null
    });

    await expect(
      getAccountPurchases("00000000-0000-4000-8000-000000000101", "supabase")
    ).resolves.toEqual({
      items: [
        {
          createdAt: "2026-07-14T12:00:00Z",
          downloadReady: true,
          disputeStatus: null,
          id: "purchase-1",
          productId: "product-1",
          productSlug: "wealth-dashboard",
          productTitle: "Wealth Dashboard",
          status: "paid"
        }
      ]
    });
    expect(purchaseMocks.eq).toHaveBeenCalledWith(
      "user_id",
      "00000000-0000-4000-8000-000000000101"
    );
    expect(purchaseMocks.order).toHaveBeenCalledWith("created_at", {
      ascending: false
    });
  });

  it("returns the signed-in user's one-time membership purchase records", async () => {
    purchaseMocks.order.mockResolvedValue({
      data: [
        {
          created_at: "2026-08-24T19:09:48Z",
          dispute_status: null,
          id: "membership-purchase-1",
          plan_id: "tier_1",
          provider: "stripe",
          status: "paid"
        }
      ],
      error: null
    });

    await expect(
      getAccountMembershipPurchases(
        "00000000-0000-4000-8000-000000000101",
        "supabase"
      )
    ).resolves.toEqual({
      items: [
        {
          createdAt: "2026-08-24T19:09:48Z",
          disputeStatus: null,
          id: "membership-purchase-1",
          planId: "tier_1",
          planName: "Full Access",
          provider: "stripe",
          status: "paid"
        }
      ]
    });
    expect(purchaseMocks.from).toHaveBeenCalledWith("membership_purchases");
    expect(purchaseMocks.eq).toHaveBeenCalledWith(
      "user_id",
      "00000000-0000-4000-8000-000000000101"
    );
  });

  it("fails closed when purchase history cannot be loaded", async () => {
    purchaseMocks.order.mockResolvedValue({
      data: null,
      error: { message: "purchase query failed" }
    });

    await expect(
      getAccountPurchases("00000000-0000-4000-8000-000000000101", "supabase")
    ).resolves.toEqual({ error: "purchase query failed", items: [] });
  });

  it("does not expose a download for a non-delivered purchase status", async () => {
    purchaseMocks.order.mockResolvedValue({
      data: [
        {
          created_at: "2026-07-14T12:00:00Z",
          dispute_status: null,
          id: "purchase-refunded",
          product_id: "product-1",
          products: {
            product_assets: { id: "asset-1" },
            slug: "wealth-dashboard",
            title: "Wealth Dashboard"
          },
          status: "refunded"
        }
      ],
      error: null
    });

    const snapshot = await getAccountPurchases(
      "00000000-0000-4000-8000-000000000101",
      "supabase"
    );

    expect(snapshot.items[0]?.downloadReady).toBe(false);
  });

  it("pauses delivery while a purchase dispute is open", async () => {
    purchaseMocks.order.mockResolvedValue({
      data: [
        {
          created_at: "2026-07-14T12:00:00Z",
          dispute_status: "needs_response",
          id: "purchase-disputed",
          product_id: "product-1",
          products: {
            product_assets: { id: "asset-1" },
            slug: "wealth-dashboard",
            title: "Wealth Dashboard"
          },
          status: "paid"
        }
      ],
      error: null
    });

    const snapshot = await getAccountPurchases(
      "00000000-0000-4000-8000-000000000101",
      "supabase"
    );

    expect(snapshot.items[0]).toMatchObject({
      disputeStatus: "needs_response",
      downloadReady: false,
      status: "paid"
    });
  });
});
