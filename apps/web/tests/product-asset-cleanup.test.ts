import { beforeEach, describe, expect, it, vi } from "vitest";

const cleanupMocks = vi.hoisted(() => ({
  from: vi.fn(),
  remove: vi.fn(),
  reportOperationalError: vi.fn(),
  rpc: vi.fn(),
  select: vi.fn(),
  snapshotIn: vi.fn(),
  snapshotLimit: vi.fn(),
  snapshotOrder: vi.fn(),
  storageFrom: vi.fn()
}));

vi.mock("@/lib/observability", () => ({
  reportOperationalError: cleanupMocks.reportOperationalError
}));

import { processDueProductAssetCleanupJobs } from "@/lib/product-asset-cleanup";

const job = {
  id: "00000000-0000-4000-8000-000000000401",
  product_id: "00000000-0000-4000-8000-000000000201",
  storage_path: "00000000-0000-4000-8000-000000000201/old.pdf",
  claim_token: "00000000-0000-4000-8000-000000000501"
};

function supabase() {
  return {
    from: cleanupMocks.from,
    rpc: cleanupMocks.rpc,
    storage: { from: cleanupMocks.storageFrom }
  } as never;
}

describe("product asset cleanup executor", () => {
  beforeEach(() => {
    for (const mock of Object.values(cleanupMocks)) {
      mock.mockReset();
    }

    cleanupMocks.snapshotLimit.mockResolvedValue({ data: [], error: null });
    cleanupMocks.snapshotOrder.mockReturnValue({ limit: cleanupMocks.snapshotLimit });
    cleanupMocks.snapshotIn.mockReturnValue({ order: cleanupMocks.snapshotOrder });
    cleanupMocks.select.mockReturnValue({ in: cleanupMocks.snapshotIn });
    cleanupMocks.from.mockReturnValue({ select: cleanupMocks.select });
    cleanupMocks.remove.mockResolvedValue({ data: [], error: null });
    cleanupMocks.storageFrom.mockReturnValue({ remove: cleanupMocks.remove });
    cleanupMocks.rpc.mockImplementation((name: string) =>
      Promise.resolve(
        name === "claim_product_asset_cleanup_jobs"
          ? { data: [job], error: null }
          : { data: [{ id: job.id }], error: null }
      )
    );
  });

  it("removes due objects and records durable success receipts", async () => {
    const result = await processDueProductAssetCleanupJobs({
      actor: "admin-1",
      eventPrefix: "test.cleanup",
      limit: 20,
      supabase: supabase()
    });

    expect(result).toEqual({ attempted: 1, cleaned: 1, failed: 0, items: [], ok: true });
    expect(cleanupMocks.remove).toHaveBeenCalledWith([job.storage_path]);
    expect(cleanupMocks.rpc).toHaveBeenCalledWith(
      "record_product_asset_cleanup_attempt",
      {
        p_claim_token: job.claim_token,
        p_cleanup_job_id: job.id,
        p_succeeded: true
      }
    );
  });

  it("reports a successful empty run when no jobs are due", async () => {
    cleanupMocks.rpc.mockResolvedValueOnce({ data: [], error: null });

    const result = await processDueProductAssetCleanupJobs({
      actor: "cron",
      eventPrefix: "test.cleanup",
      limit: 50,
      supabase: supabase()
    });

    expect(result).toEqual({
      attempted: 0,
      cleaned: 0,
      failed: 0,
      items: [],
      ok: true
    });
    expect(cleanupMocks.remove).not.toHaveBeenCalled();
  });

  it("fails before Storage when durable job claiming is unavailable", async () => {
    cleanupMocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "claim unavailable" }
    });

    const result = await processDueProductAssetCleanupJobs({
      actor: "cron",
      eventPrefix: "test.cleanup",
      limit: 50,
      supabase: supabase()
    });

    expect(result).toEqual({
      attempted: 0,
      ok: false,
      reason: "product_asset_cleanup_claim_failed"
    });
    expect(cleanupMocks.remove).not.toHaveBeenCalled();
  });

  it("retains Storage failures as retryable attempts", async () => {
    cleanupMocks.remove.mockResolvedValue({
      data: null,
      error: { message: "storage unavailable" }
    });

    const result = await processDueProductAssetCleanupJobs({
      actor: "cron",
      eventPrefix: "test.cleanup",
      limit: 50,
      supabase: supabase()
    });

    expect(result).toMatchObject({ attempted: 1, cleaned: 0, failed: 1, ok: true });
    expect(cleanupMocks.rpc).toHaveBeenCalledWith(
      "record_product_asset_cleanup_attempt",
      {
        p_claim_token: job.claim_token,
        p_cleanup_job_id: job.id,
        p_error: "storage_cleanup_failed",
        p_succeeded: false
      }
    );
  });

  it("fails the run when an attempt receipt cannot be recorded", async () => {
    cleanupMocks.rpc
      .mockResolvedValueOnce({ data: [job], error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "receipt unavailable" } });

    const result = await processDueProductAssetCleanupJobs({
      actor: "cron",
      eventPrefix: "test.cleanup",
      limit: 50,
      supabase: supabase()
    });

    expect(result).toEqual({
      attempted: 1,
      cleaned: 0,
      failed: 1,
      ok: false,
      reason: "product_asset_cleanup_attempt_record_failed"
    });
    expect(cleanupMocks.reportOperationalError).toHaveBeenCalledWith(
      "test.cleanup.receipt_failed",
      expect.anything(),
      expect.anything()
    );
  });

  it("fails the run when the attempt lease is lost before recording", async () => {
    cleanupMocks.rpc
      .mockResolvedValueOnce({ data: [job], error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    const result = await processDueProductAssetCleanupJobs({
      actor: "cron",
      eventPrefix: "test.cleanup",
      limit: 50,
      supabase: supabase()
    });

    expect(result).toEqual({
      attempted: 1,
      cleaned: 0,
      failed: 1,
      ok: false,
      reason: "product_asset_cleanup_attempt_record_failed"
    });
    expect(cleanupMocks.reportOperationalError).toHaveBeenCalledWith(
      "test.cleanup.lease_lost",
      expect.anything(),
      expect.anything()
    );
  });

  it("fails closed when the unresolved queue cannot be refreshed", async () => {
    cleanupMocks.snapshotLimit.mockResolvedValue({
      data: null,
      error: { message: "refresh unavailable" }
    });

    const result = await processDueProductAssetCleanupJobs({
      actor: "cron",
      eventPrefix: "test.cleanup",
      limit: 50,
      supabase: supabase()
    });

    expect(result).toEqual({
      attempted: 1,
      ok: false,
      reason: "product_asset_cleanup_refresh_failed"
    });
  });
});
