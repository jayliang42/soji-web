import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const routeMocks = vi.hoisted(() => ({
  getPublisherContext: vi.fn(),
  reportOperationalError: vi.fn(),
  rpc: vi.fn(),
  single: vi.fn()
}));

vi.mock("@/lib/publisher", () => ({
  getPublisherContext: routeMocks.getPublisherContext
}));
vi.mock("@/lib/observability", () => ({
  reportOperationalError: routeMocks.reportOperationalError
}));

import { DELETE, PATCH, POST } from "@/app/api/admin/content/route";

const contentId = "00000000-0000-4000-8000-000000000401";
const validPayload = {
  body: "A complete article body with enough detail to be published.",
  coverImage: "",
  requiredEntitlements: ["content.basic"],
  slug: "atomic-content-test",
  summary: "A sufficiently detailed summary for this article.",
  title: "Atomic content test",
  type: "article",
  visibility: "members_only"
};
const launchMetadata = {
  coverImage: "/covers/atomic-content-test.webp",
  coverImageAlt: "A paper decision map beside a pencil and warm ceramic cup.",
  preview:
    "This practical opening helps readers name one decision before the member-only guide continues.",
  tags: ["Decision making", "Money clarity"]
};
const validUpdatePayload = {
  ...validPayload,
  ...launchMetadata,
  expectedRevision: 3,
  id: contentId,
  published: true
};
const validDeletePayload = {
  expectedRevision: 3,
  id: contentId
};

function request(body: unknown, method: "DELETE" | "PATCH" | "POST") {
  return new NextRequest("http://localhost:3000/api/admin/content", {
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method
  });
}

describe("admin content writes", () => {
  beforeEach(() => {
    for (const mock of Object.values(routeMocks)) mock.mockReset();

    routeMocks.single.mockResolvedValue({
      data: { id: contentId, slug: validPayload.slug },
      error: null
    });
    routeMocks.rpc.mockImplementation((name: string) =>
      name === "delete_content_item"
        ? Promise.resolve({ data: true, error: null })
        : { single: routeMocks.single }
    );
    routeMocks.getPublisherContext.mockResolvedValue({
      roles: ["editor"],
      supabase: { rpc: routeMocks.rpc },
      user: { id: "00000000-0000-4000-8000-000000000402" }
    });
  });

  it("returns authorization failures before parsing the body", async () => {
    routeMocks.getPublisherContext.mockResolvedValue({
      error: NextResponse.json(
        { ok: false, reason: "forbidden" },
        { status: 403 }
      )
    });

    const response = await POST(request("{bad-json", "POST"));

    expect(response.status).toBe(403);
    expect(routeMocks.rpc).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON and over-posted fields", async () => {
    const malformed = await POST(request("{bad-json", "POST"));
    const overPosted = await POST(
      request({ ...validPayload, createdBy: "attacker" }, "POST")
    );

    expect(malformed.status).toBe(400);
    expect(overPosted.status).toBe(400);
    expect(routeMocks.rpc).not.toHaveBeenCalled();
  });

  it("creates content and access rules through one transaction RPC", async () => {
    const response = await POST(
      request({ ...validPayload, ...launchMetadata }, "POST")
    );

    expect(response.status).toBe(200);
    expect(routeMocks.rpc).toHaveBeenCalledWith(
      "upsert_content_item",
      expect.objectContaining({
        p_content_id: null,
        p_cover_image_alt: launchMetadata.coverImageAlt,
        p_expected_revision: null,
        p_published: true,
        p_preview_markdown: launchMetadata.preview,
        p_required_entitlements: ["content.basic"],
        p_slug: validPayload.slug,
        p_tags: launchMetadata.tags
      })
    );
  });

  it("rejects a restricted launch publication without preview, cover metadata, and tags", async () => {
    const response = await POST(request(validPayload, "POST"));

    expect(response.status).toBe(400);
    expect(routeMocks.rpc).not.toHaveBeenCalled();
  });

  it("does not expose database errors from an atomic update", async () => {
    routeMocks.single.mockResolvedValue({
      data: null,
      error: { message: "sensitive database detail" }
    });

    const response = await PATCH(
      request(validUpdatePayload, "PATCH")
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "content_write_failed"
    });
    expect(routeMocks.reportOperationalError).toHaveBeenCalledWith(
      "admin.content.update_failed",
      { message: "sensitive database detail" },
      { contentId, slug: validPayload.slug }
    );
  });

  it("returns a stable conflict when another editor saved first", async () => {
    routeMocks.single.mockResolvedValue({
      data: null,
      error: { code: "40001", message: "content_write_conflict" }
    });

    const response = await PATCH(request(validUpdatePayload, "PATCH"));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "content_update_conflict"
    });
    expect(routeMocks.reportOperationalError).not.toHaveBeenCalled();
  });

  it("returns a stable conflict for a duplicate slug", async () => {
    routeMocks.single.mockResolvedValue({
      data: null,
      error: { code: "23505", message: "duplicate key detail" }
    });

    const response = await POST(
      request({ ...validPayload, ...launchMetadata }, "POST")
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "content_slug_conflict"
    });
    expect(routeMocks.reportOperationalError).not.toHaveBeenCalled();
  });

  it("returns not found when an edited item was deleted elsewhere", async () => {
    routeMocks.single.mockResolvedValue({
      data: null,
      error: { code: "P0002", message: "content_not_found" }
    });

    const response = await PATCH(request(validUpdatePayload, "PATCH"));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "content_not_found"
    });
    expect(routeMocks.reportOperationalError).not.toHaveBeenCalled();
  });

  it("deletes content through the role-checked transaction RPC", async () => {
    const response = await DELETE(request(validDeletePayload, "DELETE"));

    expect(response.status).toBe(200);
    expect(routeMocks.rpc).toHaveBeenCalledWith("delete_content_item", {
      p_content_id: contentId,
      p_expected_revision: 3
    });
  });

  it("requires the loaded revision before deleting content", async () => {
    const response = await DELETE(request({ id: contentId }, "DELETE"));

    expect(response.status).toBe(400);
    expect(routeMocks.rpc).not.toHaveBeenCalled();
  });

  it("returns a stable conflict when deleting a stale revision", async () => {
    routeMocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "40001", message: "content_delete_conflict" }
    });

    const response = await DELETE(request(validDeletePayload, "DELETE"));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "content_delete_conflict"
    });
    expect(routeMocks.reportOperationalError).not.toHaveBeenCalled();
  });

  it("returns not found when content was deleted before this request", async () => {
    routeMocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "P0002", message: "content_not_found" }
    });

    const response = await DELETE(request(validDeletePayload, "DELETE"));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "content_not_found"
    });
    expect(routeMocks.reportOperationalError).not.toHaveBeenCalled();
  });

  it("records unexpected managed delete failures without exposing details", async () => {
    routeMocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "sensitive database detail" }
    });

    const response = await DELETE(request(validDeletePayload, "DELETE"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "content_write_failed"
    });
    expect(routeMocks.reportOperationalError).toHaveBeenCalledWith(
      "admin.content.delete_failed",
      { message: "sensitive database detail" },
      { contentId, expectedRevision: 3 }
    );
  });
});
