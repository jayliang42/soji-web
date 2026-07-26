import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const routeMocks = vi.hoisted(() => ({
  eq: vi.fn(),
  from: vi.fn(),
  getAdminContext: vi.fn(),
  or: vi.fn(),
  order: vi.fn(),
  range: vi.fn(),
  reportOperationalError: vi.fn(),
  select: vi.fn()
}));

vi.mock("@/lib/publisher", () => ({
  getAdminContext: routeMocks.getAdminContext
}));
vi.mock("@/lib/observability", () => ({
  reportOperationalError: routeMocks.reportOperationalError
}));

import { GET } from "@/app/api/admin/billing-events/route";

describe("admin billing event query", () => {
  let terminal: PromiseLike<unknown> & {
    eq: typeof routeMocks.eq;
    or: typeof routeMocks.or;
    order: typeof routeMocks.order;
    range: typeof routeMocks.range;
  };

  beforeEach(() => {
    for (const mock of Object.values(routeMocks)) mock.mockReset();

    terminal = Object.assign(
      Promise.resolve({
        data: [
          {
            attempt_count: 2,
            created_at: "2026-07-14T12:00:00.000Z",
            event_type: "checkout.session.completed",
            id: "event-id",
            last_attempted_at: "2026-07-14T12:01:00.000Z",
            payload: {
              customerId: "cus_bounded",
              disputeId: "du_bounded",
              objectId: "cs_bounded",
              objectType: "checkout.session",
              paymentId: "pi_bounded",
              subscriptionId: "sub_bounded"
            },
            processed_at: null,
            processing_error: "processing failed",
            processing_started_at: null,
            provider: "stripe",
            provider_event_id: "evt_test",
            status: "failed"
          }
        ],
        count: 73,
        error: null
      }),
      {
        eq: routeMocks.eq,
        or: routeMocks.or,
        order: routeMocks.order,
        range: routeMocks.range
      }
    );
    routeMocks.eq.mockReturnValue(terminal);
    routeMocks.or.mockReturnValue(terminal);
    routeMocks.range.mockReturnValue(terminal);
    routeMocks.order.mockReturnValue(terminal);
    routeMocks.select.mockReturnValue({ order: routeMocks.order });
    routeMocks.from.mockReturnValue({ select: routeMocks.select });
    routeMocks.getAdminContext.mockResolvedValue({
      supabase: { from: routeMocks.from },
      user: { id: "admin-id" }
    });
  });

  it("returns authorization failures before querying billing storage", async () => {
    routeMocks.getAdminContext.mockResolvedValue({
      error: NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 })
    });

    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/billing-events")
    );

    expect(response.status).toBe(403);
    expect(routeMocks.from).not.toHaveBeenCalled();
  });

  it("returns durable delivery and processing-attempt evidence", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost:3000/api/admin/billing-events?status=failed&q=evt_test&page=2&limit=25"
      )
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items[0]).toMatchObject({
      attemptCount: 2,
      createdAt: "2026-07-14T12:00:00.000Z",
      lastAttemptedAt: "2026-07-14T12:01:00.000Z",
      objectId: "cs_bounded",
      objectType: "checkout.session",
      customerId: "cus_bounded",
      disputeId: "du_bounded",
      paymentId: "pi_bounded",
      providerEventId: "evt_test",
      processingError: "billing_event_processing_failed",
      processingStartedAt: null,
      subscriptionId: "sub_bounded",
      status: "failed"
    });
    expect(body.items[0]).not.toHaveProperty("payload");
    expect(routeMocks.eq).toHaveBeenCalledWith("status", "failed");
    expect(routeMocks.or).toHaveBeenCalledOnce();
    expect(routeMocks.range).toHaveBeenCalledWith(25, 49);
    expect(routeMocks.order).toHaveBeenNthCalledWith(1, "created_at", {
      ascending: false
    });
    expect(routeMocks.order).toHaveBeenNthCalledWith(2, "id", {
      ascending: false
    });
    expect(body).toMatchObject({
      page: 2,
      pageSize: 25,
      totalItems: 73,
      totalPages: 3
    });
    expect(routeMocks.select).toHaveBeenCalledWith(
      expect.stringContaining("payload"),
      { count: "exact" }
    );
  });

  it.each([
    ["provider event", "evt_value", "evt\\_value"],
    ["event type", "charge.dispute.created", "charge.dispute.created"],
    ["object", "ch_value", "ch\\_value"],
    ["dispute", "du_value", "du\\_value"],
    ["payment", "pi_value", "pi\\_value"],
    ["subscription", "sub_value", "sub\\_value"],
    ["customer", "cus_value", "cus\\_value"]
  ])("searches the bounded %s reference", async (_label, value, expected) => {
    await GET(
      new NextRequest(
        `http://localhost:3000/api/admin/billing-events?q=${encodeURIComponent(value)}`
      )
    );

    const filter = routeMocks.or.mock.calls[0]?.[0] as string;
    expect(filter).toContain(`provider_event_id.ilike.%${expected}%`);
    expect(filter).toContain(`event_type.ilike.%${expected}%`);
    expect(filter).toContain(`payload->>objectId.ilike.%${expected}%`);
    expect(filter).toContain(`payload->>disputeId.ilike.%${expected}%`);
    expect(filter).toContain(`payload->>paymentId.ilike.%${expected}%`);
    expect(filter).toContain(`payload->>subscriptionId.ilike.%${expected}%`);
    expect(filter).toContain(`payload->>customerId.ilike.%${expected}%`);
  });

  it("removes filter grammar from free-text searches", async () => {
    await GET(
      new NextRequest(
        "http://localhost:3000/api/admin/billing-events?q=evt_test),status.eq.processed"
      )
    );

    const filter = routeMocks.or.mock.calls[0]?.[0] as string;
    expect(filter).not.toContain(")");
    expect(filter).not.toContain(",status.eq");
    expect(filter).toContain("evt\\_teststatus.eq.processed");
  });

  it("does not send email-shaped searches to PostgREST", async () => {
    await GET(
      new NextRequest(
        "http://localhost:3000/api/admin/billing-events?q=owner%40example.com"
      )
    );

    expect(routeMocks.or).not.toHaveBeenCalled();
  });

  it("maps malformed minimized payloads to null bounded references", async () => {
    terminal = Object.assign(
      Promise.resolve({
        count: 1,
        data: [
          {
            attempt_count: 0,
            created_at: "2026-07-14T12:00:00.000Z",
            event_type: "charge.refunded",
            id: "event-id",
            last_attempted_at: null,
            payload: {
              customerId: ["private@example.com"],
              objectId: { nested: "not-an-id" },
              objectType: 42,
              paymentId: "pi_visible"
            },
            processed_at: null,
            processing_error:
              "private@example.com database detail must not cross the route",
            processing_started_at: null,
            provider: "stripe",
            provider_event_id: "evt_test",
            status: "received"
          }
        ],
        error: null
      }),
      {
        eq: routeMocks.eq,
        or: routeMocks.or,
        order: routeMocks.order,
        range: routeMocks.range
      }
    );
    routeMocks.range.mockReturnValue(terminal);

    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/billing-events")
    );
    const body = await response.json();

    expect(body.items[0]).toMatchObject({
      customerId: null,
      objectId: null,
      objectType: null,
      paymentId: "pi_visible"
    });
    expect(JSON.stringify(body)).not.toContain("private@example.com");
    expect(JSON.stringify(body)).not.toContain("database detail");
    expect(body.items[0].processingError).toBe(
      "billing_event_processing_failed"
    );
  });

  it("accepts the terminal ignored status as an explicit filter", async () => {
    await GET(
      new NextRequest(
        "http://localhost:3000/api/admin/billing-events?status=ignored"
      )
    );

    expect(routeMocks.eq).toHaveBeenCalledWith("status", "ignored");
  });

  it("logs database errors and returns a stable public reason", async () => {
    const databaseError = { message: "sensitive database detail" };
    terminal = Object.assign(
      Promise.resolve({ count: null, data: null, error: databaseError }),
      {
        eq: routeMocks.eq,
        or: routeMocks.or,
        order: routeMocks.order,
        range: routeMocks.range
      }
    );
    routeMocks.range.mockReturnValue(terminal);

    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/billing-events")
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "billing_events_query_failed"
    });
    expect(routeMocks.reportOperationalError).toHaveBeenCalledWith(
      "admin.billing_events.query_failed",
      databaseError,
      { hasSearch: false, status: null }
    );
  });
});
