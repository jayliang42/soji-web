import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const uploadMocks = vi.hoisted(() => ({
  getPublicUrl: vi.fn(),
  getPublisherContext: vi.fn(),
  reportOperationalError: vi.fn(),
  storageFrom: vi.fn(),
  upload: vi.fn()
}));

vi.mock("@/lib/publisher", () => ({
  getPublisherContext: uploadMocks.getPublisherContext
}));
vi.mock("@/lib/observability", () => ({
  reportOperationalError: uploadMocks.reportOperationalError
}));

import { POST } from "@/app/api/admin/upload/route";

function pngFile(bytes = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) {
  return new File([new Uint8Array(bytes)], "cover.png", { type: "image/png" });
}

function request(file: File) {
  const body = new FormData();
  body.set("file", file);
  return new NextRequest("http://localhost:3000/api/admin/upload", {
    body,
    method: "POST"
  });
}

describe("admin content image upload", () => {
  beforeEach(() => {
    for (const mock of Object.values(uploadMocks)) mock.mockReset();
    uploadMocks.upload.mockResolvedValue({
      data: { path: "content/user/2026-07-14/image.png" },
      error: null
    });
    uploadMocks.getPublicUrl.mockReturnValue({
      data: { publicUrl: "https://example.test/image.png" }
    });
    uploadMocks.storageFrom.mockReturnValue({
      getPublicUrl: uploadMocks.getPublicUrl,
      upload: uploadMocks.upload
    });
    uploadMocks.getPublisherContext.mockResolvedValue({
      roles: ["editor"],
      supabase: { storage: { from: uploadMocks.storageFrom } },
      user: { id: "00000000-0000-4000-8000-000000000102" }
    });
  });

  it("checks publisher access before parsing upload data", async () => {
    uploadMocks.getPublisherContext.mockResolvedValue({
      error: NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 })
    });

    const response = await POST(request(pngFile()));

    expect(response.status).toBe(403);
    expect(uploadMocks.upload).not.toHaveBeenCalled();
  });

  it("rejects malformed multipart and spoofed image bytes", async () => {
    const malformed = await POST(
      new NextRequest("http://localhost:3000/api/admin/upload", {
        body: "not multipart",
        headers: { "content-type": "application/json" },
        method: "POST"
      })
    );
    const spoofed = await POST(request(pngFile([1, 2, 3, 4])));

    expect(malformed.status).toBe(400);
    expect(await malformed.json()).toEqual({
      ok: false,
      reason: "invalid_upload_request"
    });
    expect(spoofed.status).toBe(400);
    expect(await spoofed.json()).toEqual({
      ok: false,
      reason: "image_signature_mismatch"
    });
    expect(uploadMocks.upload).not.toHaveBeenCalled();
  });

  it("uploads validated image bytes with a generated safe path", async () => {
    const response = await POST(request(pngFile()));

    expect(response.status).toBe(200);
    expect(uploadMocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(
        /^content\/00000000-0000-4000-8000-000000000102\/\d{4}-\d{2}-\d{2}\/[0-9a-f-]+\.png$/
      ),
      expect.any(File),
      expect.objectContaining({ contentType: "image/png", upsert: false })
    );
  });

  it("logs storage details but returns a stable upload error", async () => {
    const storageError = { message: "sensitive storage policy detail" };
    uploadMocks.upload.mockResolvedValue({ data: null, error: storageError });

    const response = await POST(request(pngFile()));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, reason: "upload_failed" });
    expect(uploadMocks.reportOperationalError).toHaveBeenCalledWith(
      "admin.content_image.upload_failed",
      storageError,
      expect.objectContaining({
        userId: "00000000-0000-4000-8000-000000000102"
      })
    );
  });
});
