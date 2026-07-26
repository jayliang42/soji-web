import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const routeMocks = vi.hoisted(() => ({
  assetEq: vi.fn(),
  assetMaybeSingle: vi.fn(),
  assetSelect: vi.fn(),
  from: vi.fn(),
  getPublisherContext: vi.fn(),
  getStripeClient: vi.fn(),
  insert: vi.fn(),
  pricesRetrieve: vi.fn(),
  reportOperationalError: vi.fn(),
  rpc: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
  update: vi.fn(),
  updateEq: vi.fn()
}));

vi.mock("@/lib/publisher", () => ({
  getPublisherContext: routeMocks.getPublisherContext
}));
vi.mock("@/lib/stripe", () => ({ getStripeClient: routeMocks.getStripeClient }));
vi.mock("@/lib/observability", () => ({
  reportOperationalError: routeMocks.reportOperationalError
}));

import { DELETE, PATCH, POST } from "@/app/api/admin/products/route";

const productId = "00000000-0000-4000-8000-000000000201";

const validPayload = {
  bullets: ["Downloadable workbook"],
  entitlementId: "product.digital",
  isActive: true,
  priceCents: 7900,
  priceLabel: "$79",
  slug: "wealth-dashboard",
  stripePriceId: "price_test",
  summary: "A complete downloadable wealth dashboard workbook.",
  title: "Wealth Dashboard"
};
const validUpdatePayload = {
  ...validPayload,
  expectedRevision: 3,
  id: productId
};

function request(body: unknown, method: "DELETE" | "PATCH" | "POST" = "POST") {
  return new NextRequest("http://localhost:3000/api/admin/products", {
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method
  });
}

describe("admin product writes", () => {
  beforeEach(() => {
    for (const mock of Object.values(routeMocks)) {
      mock.mockReset();
    }
    routeMocks.single.mockResolvedValue({
      data: { id: productId, revision: 4, slug: validPayload.slug },
      error: null
    });
    routeMocks.rpc.mockReturnValue({ single: routeMocks.single });
    routeMocks.select.mockReturnValue({ single: routeMocks.single });
    routeMocks.insert.mockReturnValue({ select: routeMocks.select });
    routeMocks.updateEq.mockReturnValue({ select: routeMocks.select });
    routeMocks.update.mockReturnValue({ eq: routeMocks.updateEq });
    routeMocks.assetMaybeSingle.mockResolvedValue({
      data: { id: "00000000-0000-4000-8000-000000000301" },
      error: null
    });
    routeMocks.assetEq.mockReturnValue({ maybeSingle: routeMocks.assetMaybeSingle });
    routeMocks.assetSelect.mockReturnValue({ eq: routeMocks.assetEq });
    routeMocks.from.mockImplementation((table: string) =>
      table === "product_assets"
        ? { select: routeMocks.assetSelect }
        : { insert: routeMocks.insert, update: routeMocks.update }
    );
    routeMocks.getPublisherContext.mockResolvedValue({
      roles: ["editor"],
      supabase: { from: routeMocks.from, rpc: routeMocks.rpc },
      user: { id: "editor_user" }
    });
    routeMocks.pricesRetrieve.mockResolvedValue({
      active: true,
      currency: "usd",
      type: "one_time",
      unit_amount: 7900
    });
    routeMocks.getStripeClient.mockReturnValue({
      prices: { retrieve: routeMocks.pricesRetrieve }
    } as unknown as Stripe);
  });

  it("returns authorization failures before parsing or loading Stripe", async () => {
    routeMocks.getPublisherContext.mockResolvedValue({
      error: NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 })
    });

    const response = await POST(request("{bad-json"));

    expect(response.status).toBe(403);
    expect(routeMocks.getStripeClient).not.toHaveBeenCalled();
    expect(routeMocks.from).not.toHaveBeenCalled();
  });

  it("rejects over-posted product input before Stripe or database work", async () => {
    const response = await POST(request({ ...validPayload, provider: "stripe" }));

    expect(response.status).toBe(400);
    expect(routeMocks.getStripeClient).not.toHaveBeenCalled();
    expect(routeMocks.from).not.toHaveBeenCalled();
  });

  it("does not persist an active product when Stripe price validation fails", async () => {
    routeMocks.pricesRetrieve.mockResolvedValue({
      active: true,
      currency: "usd",
      type: "recurring",
      unit_amount: 7900
    });

    const response = await PATCH(
      request(validUpdatePayload, "PATCH")
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "stripe_price_must_be_one_time"
    });
    expect(routeMocks.rpc).not.toHaveBeenCalled();
  });

  it("requires new products to be created as inactive drafts", async () => {
    const response = await POST(request(validPayload));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "product_must_be_created_as_draft"
    });
    expect(routeMocks.getStripeClient).not.toHaveBeenCalled();
    expect(routeMocks.from).not.toHaveBeenCalled();
  });

  it("requires a private delivery asset before activation", async () => {
    routeMocks.assetMaybeSingle.mockResolvedValue({ data: null, error: null });

    const response = await PATCH(
      request(validUpdatePayload, "PATCH")
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "product_delivery_missing"
    });
    expect(routeMocks.getStripeClient).not.toHaveBeenCalled();
    expect(routeMocks.rpc).not.toHaveBeenCalled();
  });

  it("allows an inactive draft without loading Stripe", async () => {
    const response = await POST(
      request({ ...validPayload, isActive: false, stripePriceId: "" })
    );

    expect(response.status).toBe(200);
    expect(routeMocks.getStripeClient).not.toHaveBeenCalled();
    expect(routeMocks.rpc).toHaveBeenCalledWith(
      "upsert_product",
      expect.objectContaining({
        p_expected_revision: null,
        p_is_active: false,
        p_product_id: null,
        p_stripe_price_id: null
      })
    );
  });

  it("persists a product only after Stripe confirms price semantics", async () => {
    const response = await PATCH(
      request(validUpdatePayload, "PATCH")
    );

    expect(response.status).toBe(200);
    expect(routeMocks.pricesRetrieve).toHaveBeenCalledWith("price_test");
    expect(routeMocks.rpc).toHaveBeenCalledWith(
      "upsert_product",
      expect.objectContaining({
        p_expected_revision: 3,
        p_is_active: true,
        p_price_cents: 7900,
        p_product_id: productId,
        p_stripe_price_id: "price_test"
      })
    );
  });

  it("returns a stable conflict for a duplicate product slug", async () => {
    routeMocks.single.mockResolvedValue({
      data: null,
      error: { code: "23505", message: "duplicate key detail" }
    });

    const response = await POST(
      request({ ...validPayload, isActive: false, stripePriceId: "" })
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "product_slug_conflict"
    });
    expect(routeMocks.reportOperationalError).not.toHaveBeenCalled();
  });

  it("returns a stable conflict when another editor saved first", async () => {
    routeMocks.single.mockResolvedValue({
      data: null,
      error: { code: "40001", message: "product_write_conflict" }
    });

    const response = await PATCH(request(validUpdatePayload, "PATCH"));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "product_update_conflict"
    });
    expect(routeMocks.reportOperationalError).not.toHaveBeenCalled();
  });

  it("returns not found when an edited product was removed elsewhere", async () => {
    routeMocks.single.mockResolvedValue({
      data: null,
      error: { code: "P0002", message: "product_not_found" }
    });

    const response = await PATCH(request(validUpdatePayload, "PATCH"));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      ok: false,
      reason: "product_not_found"
    });
    expect(routeMocks.reportOperationalError).not.toHaveBeenCalled();
  });

  it("archives only the product revision loaded by the editor", async () => {
    const response = await DELETE(
      request({ expectedRevision: 3, id: productId }, "DELETE")
    );

    expect(response.status).toBe(200);
    expect(routeMocks.rpc).toHaveBeenCalledWith("archive_product", {
      p_expected_revision: 3,
      p_product_id: productId
    });
  });

  it("requires a revision and rejects stale product archiving", async () => {
    const missingRevision = await DELETE(request({ id: productId }, "DELETE"));
    expect(missingRevision.status).toBe(400);
    expect(routeMocks.rpc).not.toHaveBeenCalled();

    routeMocks.single.mockResolvedValue({
      data: null,
      error: { code: "40001", message: "product_archive_conflict" }
    });
    const staleRevision = await DELETE(
      request({ expectedRevision: 2, id: productId }, "DELETE")
    );

    expect(staleRevision.status).toBe(409);
    expect(await staleRevision.json()).toEqual({
      ok: false,
      reason: "product_archive_conflict"
    });
    expect(routeMocks.reportOperationalError).not.toHaveBeenCalled();
  });
});
