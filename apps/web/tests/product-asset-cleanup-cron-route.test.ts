import { beforeEach, describe, expect, it, vi } from "vitest";

const cronMocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  isAuthorizedCronRequest: vi.fn(),
  processDueProductAssetCleanupJobs: vi.fn()
}));

vi.mock("@/lib/cron-auth", () => ({
  isAuthorizedCronRequest: cronMocks.isAuthorizedCronRequest
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: cronMocks.createSupabaseAdminClient
}));
vi.mock("@/lib/product-asset-cleanup", () => ({
  processDueProductAssetCleanupJobs: cronMocks.processDueProductAssetCleanupJobs
}));

import { GET } from "@/app/api/cron/product-asset-cleanup/route";

const request = new Request("http://localhost:3000/api/cron/product-asset-cleanup");

describe("scheduled product asset cleanup route", () => {
  beforeEach(() => {
    cronMocks.createSupabaseAdminClient.mockReset();
    cronMocks.isAuthorizedCronRequest.mockReset();
    cronMocks.processDueProductAssetCleanupJobs.mockReset();
    cronMocks.isAuthorizedCronRequest.mockReturnValue(true);
    cronMocks.createSupabaseAdminClient.mockReturnValue({ client: "service-role" });
    cronMocks.processDueProductAssetCleanupJobs.mockResolvedValue({
      attempted: 0,
      cleaned: 0,
      failed: 0,
      items: [],
      ok: true
    });
  });

  it("rejects unauthorized invocations before loading service credentials", async () => {
    cronMocks.isAuthorizedCronRequest.mockReturnValue(false);

    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      ok: false,
      reason: "cron_unauthorized"
    });
    expect(cronMocks.createSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("fails closed when the service-role client is not configured", async () => {
    cronMocks.createSupabaseAdminClient.mockReturnValue(null);

    const response = await GET(request);

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "product_asset_cleanup_service_not_configured"
    });
  });

  it("runs the shared executor with the service-role client", async () => {
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(cronMocks.processDueProductAssetCleanupJobs).toHaveBeenCalledWith({
      actor: "scheduled-cleanup",
      eventPrefix: "cron.product_asset_cleanup",
      limit: 50,
      supabase: { client: "service-role" }
    });
    expect(await response.json()).toEqual({
      claimed: 0,
      cleaned: 0,
      failed: 0,
      ok: true,
      status: "complete"
    });
  });

  it("returns aggregate cleanup truth without item or storage detail", async () => {
    cronMocks.processDueProductAssetCleanupJobs.mockResolvedValue({
      attempted: 2,
      cleaned: 1,
      failed: 1,
      items: [
        {
          id: "job-id",
          storagePath:
            "private/customer@example.com/guide.pdf?token=service-secret"
        }
      ],
      ok: true
    });

    const response = await GET(
      new Request(
        "http://localhost:3000/api/cron/product-asset-cleanup?storagePath=attacker.pdf"
      )
    );
    const body = await response.json();

    expect(body).toEqual({
      claimed: 2,
      cleaned: 1,
      failed: 1,
      ok: true,
      status: "partial"
    });
    expect(JSON.stringify(body)).not.toMatch(
      /storagePath|customer@example|service-secret|attacker\.pdf|items/
    );
  });

  it("returns 500 when scheduled cleanup cannot complete safely", async () => {
    cronMocks.processDueProductAssetCleanupJobs.mockResolvedValue({
      attempted: 0,
      cleaned: 0,
      failed: 0,
      ok: false,
      reason: "product_asset_cleanup_claim_failed"
    });

    const response = await GET(request);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      claimed: 0,
      cleaned: 0,
      failed: 0,
      ok: false,
      reason: "product_asset_cleanup_claim_failed",
      status: "failed"
    });
  });

  it("does not report success when attempt recording fails", async () => {
    cronMocks.processDueProductAssetCleanupJobs.mockResolvedValue({
      attempted: 2,
      cleaned: 1,
      failed: 1,
      ok: false,
      reason: "product_asset_cleanup_attempt_record_failed"
    });

    const response = await GET(request);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      claimed: 2,
      cleaned: 1,
      failed: 1,
      ok: false,
      reason: "product_asset_cleanup_attempt_record_failed",
      status: "failed"
    });
  });
});
