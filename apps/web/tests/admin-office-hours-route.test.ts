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

import { DELETE, PATCH, POST } from "@/app/api/admin/office-hours/route";

const officeHourId = "00000000-0000-4000-8000-000000000601";
const validPayload = {
  replayUrl: "https://vimeo.com/showcase/123/video/456",
  requiredEntitlement: "office_hours.join",
  signupUrl: "https://cal.com/soji/office-hours?month=2026-08",
  startsAt: "2026-08-01T18:00:00.000Z",
  title: "August portfolio office hours"
};
const validUpdatePayload = {
  ...validPayload,
  expectedRevision: 3,
  id: officeHourId
};

function request(body: unknown, method: "DELETE" | "PATCH" | "POST") {
  return new NextRequest("http://localhost:3000/api/admin/office-hours", {
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method
  });
}

describe("admin office-hour writes", () => {
  beforeEach(() => {
    for (const mock of Object.values(routeMocks)) mock.mockReset();
    routeMocks.single.mockResolvedValue({
      data: { id: officeHourId, revision: 4 },
      error: null
    });
    routeMocks.rpc.mockImplementation((name: string) =>
      name === "delete_office_hour"
        ? Promise.resolve({ data: true, error: null })
        : { single: routeMocks.single }
    );
    routeMocks.getPublisherContext.mockResolvedValue({
      roles: ["editor"],
      supabase: { rpc: routeMocks.rpc },
      user: { id: "00000000-0000-4000-8000-000000000602" }
    });
  });

  it("checks publisher authorization before parsing JSON", async () => {
    routeMocks.getPublisherContext.mockResolvedValue({
      error: NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 })
    });

    const response = await POST(request("{bad-json", "POST"));

    expect(response.status).toBe(403);
  });

  it("rejects malformed JSON, over-posting, and unsafe URL schemes", async () => {
    const malformed = await POST(request("{bad-json", "POST"));
    const overPosted = await POST(
      request({ ...validPayload, createdBy: "attacker" }, "POST")
    );
    const unsafeUrl = await POST(
      request({ ...validPayload, signupUrl: "javascript:alert(1)" }, "POST")
    );

    expect(malformed.status).toBe(400);
    expect(overPosted.status).toBe(400);
    expect(unsafeUrl.status).toBe(400);
  });

  it.each([
    ["http", "http://cal.com/soji", "office_hour_url_https_required"],
    ["credentials", "https://user:secret@cal.com/soji", "office_hour_url_credentials_forbidden"],
    ["placeholder", "https://events.example.com/soji", "office_hour_url_placeholder_host"],
    ["loopback", "https://127.0.0.1/soji", "office_hour_url_private_host"],
    ["private", "https://192.168.1.2/soji", "office_hour_url_private_host"],
    ["local", "https://booking.soji.local/soji", "office_hour_url_local_host"]
  ])("rejects %s signup destinations with a stable, redacted reason", async (
    _label,
    signupUrl,
    reason
  ) => {
    const response = await POST(
      request({ ...validPayload, signupUrl }, "POST")
    );
    const responseText = await response.text();

    expect(response.status).toBe(400);
    expect(responseText).toContain(reason);
    expect(responseText).not.toContain(signupUrl);
    expect(routeMocks.rpc).not.toHaveBeenCalled();
  });

  it("permits an empty replay destination without weakening signup validation", async () => {
    const response = await POST(
      request({ ...validPayload, replayUrl: "" }, "POST")
    );

    expect(response.status).toBe(200);
    expect(routeMocks.rpc).toHaveBeenCalledWith(
      "upsert_office_hour",
      expect.objectContaining({ p_replay_url: null })
    );
  });

  it("creates and updates a normalized office-hour record", async () => {
    const created = await POST(request(validPayload, "POST"));
    const updated = await PATCH(request(validUpdatePayload, "PATCH"));

    expect(created.status).toBe(200);
    expect(updated.status).toBe(200);
    expect(await created.json()).toEqual({
      item: { id: officeHourId, revision: 4 },
      ok: true
    });
    expect(routeMocks.rpc).toHaveBeenCalledWith(
      "upsert_office_hour",
      expect.objectContaining({
        p_expected_revision: null,
        p_office_hour_id: null,
        p_replay_url: validPayload.replayUrl
      })
    );
    expect(routeMocks.rpc).toHaveBeenCalledWith(
      "upsert_office_hour",
      expect.objectContaining({
        p_expected_revision: 3,
        p_office_hour_id: officeHourId
      })
    );
  });

  it("logs database failures without exposing their details", async () => {
    const databaseError = { message: "sensitive database detail" };
    routeMocks.single.mockResolvedValue({ data: null, error: databaseError });

    const response = await PATCH(request(validUpdatePayload, "PATCH"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "office_hour_write_failed"
    });
    expect(routeMocks.reportOperationalError).toHaveBeenCalledWith(
      "admin.office_hour.update_failed",
      databaseError,
      { expectedRevision: 3, officeHourId, title: validPayload.title }
    );
  });

  it("deletes only the office-hour revision loaded by the editor", async () => {
    const response = await DELETE(
      request({ expectedRevision: 3, id: officeHourId }, "DELETE")
    );

    expect(response.status).toBe(200);
    expect(routeMocks.rpc).toHaveBeenCalledWith("delete_office_hour", {
      p_expected_revision: 3,
      p_office_hour_id: officeHourId
    });
  });

  it("requires a loaded revision for update and delete", async () => {
    const update = await PATCH(
      request({ ...validPayload, id: officeHourId }, "PATCH")
    );
    const deletion = await DELETE(request({ id: officeHourId }, "DELETE"));

    expect(update.status).toBe(400);
    expect(deletion.status).toBe(400);
    expect(routeMocks.rpc).not.toHaveBeenCalled();
  });

  it("returns a stable conflict when another editor saved first", async () => {
    routeMocks.single.mockResolvedValue({
      data: null,
      error: { code: "40001", message: "office_hour_write_conflict" }
    });

    const response = await PATCH(request(validUpdatePayload, "PATCH"));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "office_hour_update_conflict"
    });
    expect(routeMocks.reportOperationalError).not.toHaveBeenCalled();
  });

  it("returns stable conflict and not-found outcomes for deletion", async () => {
    routeMocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "40001", message: "office_hour_delete_conflict" }
    });
    const conflict = await DELETE(
      request({ expectedRevision: 2, id: officeHourId }, "DELETE")
    );

    routeMocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "P0002", message: "office_hour_not_found" }
    });
    const missing = await DELETE(
      request({ expectedRevision: 3, id: officeHourId }, "DELETE")
    );

    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toEqual({
      ok: false,
      reason: "office_hour_delete_conflict"
    });
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({
      ok: false,
      reason: "office_hour_not_found"
    });
    expect(routeMocks.reportOperationalError).not.toHaveBeenCalled();
  });
});
