import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const assetMocks = vi.hoisted(() => ({
  from: vi.fn(),
  getPublisherContext: vi.fn(),
  productEq: vi.fn(),
  productMaybeSingle: vi.fn(),
  productSelect: vi.fn(),
  remove: vi.fn(),
  reportOperationalError: vi.fn(),
  rpc: vi.fn(),
  rpcSingle: vi.fn(),
  storageFrom: vi.fn(),
  upload: vi.fn()
}));

vi.mock("@/lib/publisher", () => ({
  getPublisherContext: assetMocks.getPublisherContext
}));
vi.mock("@/lib/observability", () => ({
  reportOperationalError: assetMocks.reportOperationalError
}));

import { DELETE, POST } from "@/app/api/admin/products/[id]/asset/route";

const productId = "00000000-0000-4000-8000-000000000201";
const assetId = "00000000-0000-4000-8000-000000000301";
const cleanupJobId = "00000000-0000-4000-8000-000000000401";
const claimToken = "00000000-0000-4000-8000-000000000501";
let preparedStoragePath: string | null;

function pdfFile() {
  return new File(
    [new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])],
    "wealth-guide.pdf",
    { type: "application/pdf" }
  );
}

function uploadRequest(file: File, expectedRevision: string | null = "none") {
  const body = new FormData();
  body.set("file", file);
  if (expectedRevision !== null) {
    body.set("expectedRevision", expectedRevision);
  }
  return new NextRequest(`http://localhost:3000/api/admin/products/${productId}/asset`, {
    body,
    method: "POST"
  });
}

function deleteRequest(expectedRevision: number | null = 2) {
  return new NextRequest(`http://localhost:3000/api/admin/products/${productId}/asset`, {
    body: expectedRevision === null ? "{}" : JSON.stringify({ expectedRevision }),
    headers: { "Content-Type": "application/json" },
    method: "DELETE"
  });
}

const routeContext = { params: Promise.resolve({ id: productId }) };

describe("admin product asset route", () => {
  beforeEach(() => {
    for (const mock of Object.values(assetMocks)) {
      mock.mockReset();
    }
    preparedStoragePath = null;

    assetMocks.productMaybeSingle.mockResolvedValue({ data: { id: productId }, error: null });
    assetMocks.productEq.mockReturnValue({ maybeSingle: assetMocks.productMaybeSingle });
    assetMocks.productSelect.mockReturnValue({ eq: assetMocks.productEq });
    assetMocks.from.mockReturnValue({ select: assetMocks.productSelect });
    assetMocks.rpcSingle.mockResolvedValue({
      data: {
        id: assetId,
        cleanup_job_id: cleanupJobId,
        original_filename: "wealth-guide.pdf",
        previous_storage_path: null,
        revision: 1,
        size_bytes: 6,
        storage_path: `${productId}/old.pdf`
      },
      error: null
    });
    assetMocks.rpc.mockImplementation((name: string, params?: Record<string, unknown>) => {
      if (name === "prepare_product_asset_upload") {
        preparedStoragePath = String(params?.p_storage_path ?? "");
        return Promise.resolve({ data: cleanupJobId, error: null });
      }
      if (name === "claim_product_asset_cleanup_jobs") {
        return Promise.resolve({
          data: [{
            claim_token: claimToken,
            id: cleanupJobId,
            product_id: productId,
            storage_path: preparedStoragePath ?? `${productId}/old.pdf`
          }],
          error: null
        });
      }
      if (name === "record_product_asset_cleanup_attempt") {
        return Promise.resolve({ data: [{ id: cleanupJobId }], error: null });
      }
      return { single: assetMocks.rpcSingle };
    });
    assetMocks.upload.mockImplementation((path: string) =>
      Promise.resolve({ data: { path }, error: null })
    );
    assetMocks.remove.mockResolvedValue({ data: [], error: null });
    assetMocks.storageFrom.mockReturnValue({
      remove: assetMocks.remove,
      upload: assetMocks.upload
    });
    assetMocks.getPublisherContext.mockResolvedValue({
      roles: ["editor"],
      supabase: {
        from: assetMocks.from,
        rpc: assetMocks.rpc,
        storage: { from: assetMocks.storageFrom }
      },
      user: { id: "00000000-0000-4000-8000-000000000102" }
    });
  });

  it("checks publisher authorization before reading upload input", async () => {
    assetMocks.getPublisherContext.mockResolvedValue({
      error: NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 })
    });

    const response = await POST(uploadRequest(pdfFile()), routeContext);

    expect(response.status).toBe(403);
    expect(assetMocks.from).not.toHaveBeenCalled();
    expect(assetMocks.upload).not.toHaveBeenCalled();
  });

  it("requires the asset version before storage work", async () => {
    const response = await POST(uploadRequest(pdfFile(), null), routeContext);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "invalid_product_asset_revision"
    });
    expect(assetMocks.upload).not.toHaveBeenCalled();
  });

  it("rejects spoofed file content before storage or database work", async () => {
    const spoofed = new File([new Uint8Array([1, 2, 3, 4, 5])], "guide.pdf", {
      type: "application/pdf"
    });

    const response = await POST(uploadRequest(spoofed), routeContext);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "product_file_signature_mismatch"
    });
    expect(assetMocks.from).not.toHaveBeenCalled();
    expect(assetMocks.upload).not.toHaveBeenCalled();
  });

  it("fails before Storage when durable upload preparation cannot be recorded", async () => {
    assetMocks.rpc.mockImplementation((name: string) =>
      name === "prepare_product_asset_upload"
        ? Promise.resolve({ data: null, error: { message: "database unavailable" } })
        : { single: assetMocks.rpcSingle }
    );

    const response = await POST(uploadRequest(pdfFile()), routeContext);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "product_asset_prepare_failed"
    });
    expect(assetMocks.upload).not.toHaveBeenCalled();
  });

  it("cleans an ambiguous failed upload and records its durable outcome", async () => {
    assetMocks.upload.mockResolvedValue({
      data: null,
      error: { message: "upload connection lost" }
    });

    const response = await POST(uploadRequest(pdfFile()), routeContext);

    expect(response.status).toBe(500);
    expect(assetMocks.remove).toHaveBeenCalledWith([
      expect.stringMatching(new RegExp(`^${productId}/[0-9a-f-]+\\.pdf$`))
    ]);
    expect(assetMocks.rpc).toHaveBeenCalledWith(
      "record_product_asset_cleanup_attempt",
      expect.objectContaining({
        p_claim_token: claimToken,
        p_cleanup_job_id: cleanupJobId,
        p_succeeded: true
      })
    );
  });

  it("uploads a private file before version-checked metadata persistence", async () => {
    const response = await POST(uploadRequest(pdfFile(), "2"), routeContext);

    expect(response.status).toBe(200);
    expect(assetMocks.storageFrom).toHaveBeenCalledWith("product-files");
    expect(assetMocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^${productId}/[0-9a-f-]+\\.pdf$`)),
      expect.any(File),
      expect.objectContaining({ contentType: "application/pdf", upsert: false })
    );
    expect(assetMocks.rpc).toHaveBeenCalledWith(
      "replace_product_asset",
      expect.objectContaining({
        p_expected_revision: 2,
        p_original_filename: "wealth-guide.pdf",
        p_product_id: productId,
        p_size_bytes: 6,
        p_upload_cleanup_job_id: cleanupJobId
      })
    );
  });

  it("removes the new object and returns 409 when metadata is stale", async () => {
    assetMocks.rpcSingle.mockResolvedValue({
      data: null,
      error: { code: "40001", message: "product_asset_write_conflict" }
    });

    const response = await POST(uploadRequest(pdfFile(), "2"), routeContext);

    expect(response.status).toBe(409);
    expect(assetMocks.remove).toHaveBeenCalledWith([
      expect.stringMatching(new RegExp(`^${productId}/[0-9a-f-]+\\.pdf$`))
    ]);
    expect(assetMocks.rpc).toHaveBeenCalledWith(
      "record_product_asset_cleanup_attempt",
      expect.objectContaining({
        p_claim_token: claimToken,
        p_cleanup_job_id: cleanupJobId,
        p_succeeded: true
      })
    );
    expect(await response.json()).toEqual({
      ok: false,
      reason: "product_asset_conflict"
    });
  });

  it("removes an uploaded object when metadata persistence fails", async () => {
    assetMocks.rpcSingle.mockResolvedValue({
      data: null,
      error: { code: "XX000", message: "metadata failed" }
    });

    const response = await POST(uploadRequest(pdfFile()), routeContext);

    expect(response.status).toBe(500);
    expect(assetMocks.remove).toHaveBeenCalledWith([
      expect.stringMatching(new RegExp(`^${productId}/[0-9a-f-]+\\.pdf$`))
    ]);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "product_asset_save_failed"
    });
  });

  it("deletes version-checked metadata before best-effort file cleanup", async () => {
    const response = await DELETE(deleteRequest(2), routeContext);

    expect(response.status).toBe(200);
    expect(assetMocks.rpc).toHaveBeenCalledWith("delete_product_asset", {
      p_expected_revision: 2,
      p_product_id: productId
    });
    expect(assetMocks.remove).toHaveBeenCalledWith([`${productId}/old.pdf`]);
    expect(await response.json()).toEqual({ ok: true, productDeactivated: true });
  });

  it("requires a revision when deleting an asset", async () => {
    const response = await DELETE(deleteRequest(null), routeContext);

    expect(response.status).toBe(400);
    expect(assetMocks.rpc).not.toHaveBeenCalled();
    expect(assetMocks.remove).not.toHaveBeenCalled();
  });

  it("does not clean storage when a stale deletion loses the race", async () => {
    assetMocks.rpcSingle.mockResolvedValue({
      data: null,
      error: { code: "40001", message: "product_asset_delete_conflict" }
    });

    const response = await DELETE(deleteRequest(1), routeContext);

    expect(response.status).toBe(409);
    expect(assetMocks.remove).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      ok: false,
      reason: "product_asset_conflict"
    });
  });
});
