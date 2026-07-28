import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const routeMocks = vi.hoisted(() => ({
  getAdminContext: vi.fn(),
  processDueProductAssetCleanupJobs: vi.fn()
}));

vi.mock("@/lib/publisher", () => ({ getAdminContext: routeMocks.getAdminContext }));
vi.mock("@/lib/product-asset-cleanup", () => ({
  processDueProductAssetCleanupJobs: routeMocks.processDueProductAssetCleanupJobs
}));

import { POST } from "@/app/api/admin/product-assets/cleanup/route";
import {
  getProductAssetCleanupResultMessage,
  PRODUCT_ASSET_CLEANUP_MESSAGE_ID
} from "@/components/admin-product-asset-cleanup";

function request(body: unknown) {
  return new Request("http://localhost:3000/api/admin/product-assets/cleanup", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  });
}

describe("admin product asset cleanup route", () => {
  beforeEach(() => {
    routeMocks.getAdminContext.mockReset();
    routeMocks.processDueProductAssetCleanupJobs.mockReset();
    routeMocks.getAdminContext.mockResolvedValue({
      supabase: { client: "authenticated" },
      user: { id: "00000000-0000-4000-8000-000000000102" }
    });
    routeMocks.processDueProductAssetCleanupJobs.mockResolvedValue({
      attempted: 1,
      cleaned: 1,
      failed: 0,
      items: [],
      ok: true
    });
  });

  it("checks admin authorization before parsing or processing", async () => {
    routeMocks.getAdminContext.mockResolvedValue({
      error: NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 })
    });

    const response = await POST(request({ limit: 20 }));

    expect(response.status).toBe(403);
    expect(routeMocks.processDueProductAssetCleanupJobs).not.toHaveBeenCalled();
  });

  it("rejects malformed and over-posted cleanup requests", async () => {
    const response = await POST(request({ limit: 51, force: true }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "invalid_product_asset_cleanup_request"
    });
    expect(routeMocks.processDueProductAssetCleanupJobs).not.toHaveBeenCalled();
  });

  it("runs the shared cleanup executor with the verified admin context", async () => {
    const response = await POST(request({ limit: 10 }));

    expect(response.status).toBe(200);
    expect(routeMocks.processDueProductAssetCleanupJobs).toHaveBeenCalledWith({
      actor: "00000000-0000-4000-8000-000000000102",
      eventPrefix: "admin.product_asset_cleanup",
      limit: 10,
      supabase: { client: "authenticated" }
    });
    expect(await response.json()).toMatchObject({ cleaned: 1, ok: true });
  });

  it("maps shared executor failures to a stable 500 response", async () => {
    routeMocks.processDueProductAssetCleanupJobs.mockResolvedValue({
      attempted: 0,
      ok: false,
      reason: "product_asset_cleanup_claim_failed"
    });

    const response = await POST(request({ limit: 20 }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      attempted: 0,
      ok: false,
      reason: "product_asset_cleanup_claim_failed"
    });
  });

  it("projects cleanup outcomes to exact safe operator copy", () => {
    expect(
      getProductAssetCleanupResultMessage({
        attempted: 0,
        cleaned: 0,
        failed: 0
      })
    ).toBe("No cleanup jobs are due.");
    expect(
      getProductAssetCleanupResultMessage({
        attempted: 4,
        cleaned: 3,
        failed: 1
      })
    ).toBe("Cleaned 3 file(s); 1 attempt(s) still need attention.");
    expect(PRODUCT_ASSET_CLEANUP_MESSAGE_ID).toBe(
      "product-asset-cleanup-action-message"
    );
  });

  it("never turns a raw cleanup failure reason into operator copy", () => {
    const rawReason =
      "bucket/private/customer@example.com?token=service-role-secret";

    expect(
      getProductAssetCleanupResultMessage({
        attempted: 0,
        cleaned: 0,
        failed: 0,
        failedReason: rawReason
      })
    ).toBe(
      "Private file cleanup could not finish. Review the cleanup history, then retry due items."
    );
    expect(
      getProductAssetCleanupResultMessage({
        attempted: 0,
        cleaned: 0,
        failed: 0,
        failedReason: rawReason
      })
    ).not.toContain(rawReason);
  });
});
