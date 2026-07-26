import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { AuthSessionMissingError } from "@supabase/supabase-js";

const downloadMocks = vi.hoisted(() => ({
  adminStorageFrom: vi.fn(),
  assetEq: vi.fn(),
  assetMaybeSingle: vi.fn(),
  assetSelect: vi.fn(),
  createSignedUrl: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
  purchaseEq: vi.fn(),
  purchaseMaybeSingle: vi.fn(),
  purchaseSelect: vi.fn(),
  reportOperationalError: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: downloadMocks.createSupabaseServerClient
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: downloadMocks.createSupabaseAdminClient
}));
vi.mock("@/lib/observability", () => ({
  reportOperationalError: downloadMocks.reportOperationalError
}));

import { GET } from "@/app/api/account/purchases/[id]/download/route";

const userId = "00000000-0000-4000-8000-000000000101";
const purchaseId = "00000000-0000-4000-8000-000000000401";
const productId = "00000000-0000-4000-8000-000000000201";
const routeContext = { params: Promise.resolve({ id: purchaseId }) };

describe("purchased product download", () => {
  beforeEach(() => {
    for (const mock of Object.values(downloadMocks)) {
      mock.mockReset();
    }

    const purchaseChain = {
      eq: downloadMocks.purchaseEq,
      maybeSingle: downloadMocks.purchaseMaybeSingle
    };
    downloadMocks.purchaseEq.mockReturnValue(purchaseChain);
    downloadMocks.purchaseSelect.mockReturnValue(purchaseChain);
    downloadMocks.purchaseMaybeSingle.mockResolvedValue({
      data: {
        dispute_status: null,
        id: purchaseId,
        product_id: productId,
        status: "paid"
      },
      error: null
    });

    const assetChain = {
      eq: downloadMocks.assetEq,
      maybeSingle: downloadMocks.assetMaybeSingle
    };
    downloadMocks.assetEq.mockReturnValue(assetChain);
    downloadMocks.assetSelect.mockReturnValue(assetChain);
    downloadMocks.assetMaybeSingle.mockResolvedValue({
      data: {
        original_filename: "wealth-guide.pdf",
        storage_path: `${productId}/wealth-guide.pdf`
      },
      error: null
    });

    downloadMocks.from.mockImplementation((table: string) =>
      table === "purchases"
        ? { select: downloadMocks.purchaseSelect }
        : { select: downloadMocks.assetSelect }
    );
    downloadMocks.getUser.mockResolvedValue({ data: { user: { id: userId } } });
    downloadMocks.createSupabaseServerClient.mockResolvedValue({
      auth: { getUser: downloadMocks.getUser },
      from: downloadMocks.from
    });

    downloadMocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://storage.example.test/signed-download" },
      error: null
    });
    downloadMocks.adminStorageFrom.mockReturnValue({
      createSignedUrl: downloadMocks.createSignedUrl
    });
    downloadMocks.createSupabaseAdminClient.mockReturnValue({
      storage: { from: downloadMocks.adminStorageFrom }
    });
  });

  it("requires an authenticated account before querying purchase records", async () => {
    downloadMocks.getUser.mockResolvedValue({ data: { user: null } });

    const response = await GET(
      new NextRequest(`http://localhost:3000/api/account/purchases/${purchaseId}/download`),
      routeContext
    );

    expect(response.status).toBe(401);
    expect(downloadMocks.from).not.toHaveBeenCalled();
    expect(downloadMocks.createSignedUrl).not.toHaveBeenCalled();
  });

  it("does not alert when a download request has no session", async () => {
    downloadMocks.getUser.mockResolvedValue({
      data: { user: null },
      error: new AuthSessionMissingError()
    });

    const response = await GET(
      new NextRequest(`http://localhost:3000/api/account/purchases/${purchaseId}/download`),
      routeContext
    );

    expect(response.status).toBe(401);
    expect(downloadMocks.reportOperationalError).not.toHaveBeenCalled();
  });

  it("distinguishes an authentication outage from a missing session", async () => {
    const authError = new Error("auth transport unavailable");
    downloadMocks.getUser.mockResolvedValue({
      data: { user: null },
      error: authError
    });

    const response = await GET(
      new NextRequest(`http://localhost:3000/api/account/purchases/${purchaseId}/download`),
      routeContext
    );

    expect(response.status).toBe(503);
    expect(downloadMocks.reportOperationalError).toHaveBeenCalledWith(
      "product_download.auth_lookup_failed",
      authError
    );
  });

  it("does not sign a URL without a paid purchase owned by the current user", async () => {
    downloadMocks.purchaseMaybeSingle.mockResolvedValue({ data: null, error: null });

    const response = await GET(
      new NextRequest(`http://localhost:3000/api/account/purchases/${purchaseId}/download`),
      routeContext
    );

    expect(response.status).toBe(404);
    expect(downloadMocks.purchaseEq).toHaveBeenCalledWith("user_id", userId);
    expect(downloadMocks.createSignedUrl).not.toHaveBeenCalled();
  });

  it("does not sign a previously valid URL after a full refund", async () => {
    downloadMocks.purchaseMaybeSingle.mockResolvedValue({
      data: {
        dispute_status: null,
        id: purchaseId,
        product_id: productId,
        status: "refunded"
      },
      error: null
    });

    const response = await GET(
      new NextRequest(`http://localhost:3000/api/account/purchases/${purchaseId}/download`),
      routeContext
    );

    expect(response.status).toBe(404);
    expect(downloadMocks.assetSelect).not.toHaveBeenCalled();
    expect(downloadMocks.createSignedUrl).not.toHaveBeenCalled();
  });

  it("does not sign a URL while the payment is disputed", async () => {
    downloadMocks.purchaseMaybeSingle.mockResolvedValue({
      data: {
        dispute_status: "under_review",
        id: purchaseId,
        product_id: productId,
        status: "paid"
      },
      error: null
    });

    const response = await GET(
      new NextRequest(`http://localhost:3000/api/account/purchases/${purchaseId}/download`),
      routeContext
    );

    expect(response.status).toBe(404);
    expect(downloadMocks.assetSelect).not.toHaveBeenCalled();
    expect(downloadMocks.createSignedUrl).not.toHaveBeenCalled();
  });

  it("fails closed when the purchased product has no delivery asset", async () => {
    downloadMocks.assetMaybeSingle.mockResolvedValue({ data: null, error: null });

    const response = await GET(
      new NextRequest(`http://localhost:3000/api/account/purchases/${purchaseId}/download`),
      routeContext
    );

    expect(response.status).toBe(404);
    expect(downloadMocks.createSignedUrl).not.toHaveBeenCalled();
  });

  it("creates a one-minute attachment URL only after ownership checks", async () => {
    const response = await GET(
      new NextRequest(`http://localhost:3000/api/account/purchases/${purchaseId}/download`),
      routeContext
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://storage.example.test/signed-download"
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(downloadMocks.adminStorageFrom).toHaveBeenCalledWith("product-files");
    expect(downloadMocks.createSignedUrl).toHaveBeenCalledWith(
      `${productId}/wealth-guide.pdf`,
      60,
      { download: "wealth-guide.pdf" }
    );
  });
});
