import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const claimMocks = vi.hoisted(() => ({
  claimGuestMembershipCheckout: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  getGuestCheckoutBrowser: vi.fn(),
  getGuestCheckoutRequestId: vi.fn(),
  reportOperationalError: vi.fn()
}));

vi.mock("@/lib/guest-membership-checkout", () => ({
  claimGuestMembershipCheckout: claimMocks.claimGuestMembershipCheckout,
  getGuestCheckoutBrowser: claimMocks.getGuestCheckoutBrowser,
  getGuestCheckoutRequestId: claimMocks.getGuestCheckoutRequestId
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: claimMocks.createSupabaseServerClient
}));
vi.mock("@/lib/observability", () => ({
  reportOperationalError: claimMocks.reportOperationalError
}));

import { POST } from "@/app/api/account/purchases/claim/route";

function request() {
  return new NextRequest(
    "http://localhost:3000/api/account/purchases/claim",
    { method: "POST" }
  );
}

function supabaseUser({
  confirmedAt = "2026-08-24T05:00:00.000Z",
  email = "buyer@example.com"
}: {
  confirmedAt?: string | null;
  email?: string | null;
} = {}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            email,
            email_confirmed_at: confirmedAt,
            id: "00000000-0000-4000-8000-000000000801"
          }
        },
        error: null
      })
    }
  };
}

describe("guest purchase claim route", () => {
  beforeEach(() => {
    for (const mock of Object.values(claimMocks)) mock.mockReset();
    claimMocks.createSupabaseServerClient.mockResolvedValue(supabaseUser());
    claimMocks.getGuestCheckoutBrowser.mockReturnValue({
      browserHmac:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      browserId: "00000000-0000-4000-8000-000000000802"
    });
    claimMocks.getGuestCheckoutRequestId.mockReturnValue(
      "00000000-0000-4000-8000-000000000803"
    );
    claimMocks.claimGuestMembershipCheckout.mockResolvedValue({
      ok: true,
      status: "claimed"
    });
  });

  it.each(["claimed", "processing", "email_mismatch", "invalid"])(
    "returns the fail-closed %s business status",
    async (status) => {
      claimMocks.claimGuestMembershipCheckout.mockResolvedValue({
        ok: true,
        status
      });

      const response = await POST(request());

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ status });
      expect(claimMocks.claimGuestMembershipCheckout).toHaveBeenCalledWith({
        browserHmac:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        email: "buyer@example.com",
        requestId: "00000000-0000-4000-8000-000000000803",
        userId: "00000000-0000-4000-8000-000000000801"
      });
    }
  );

  it("requires an authenticated account", async () => {
    claimMocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null
        })
      }
    });

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(claimMocks.claimGuestMembershipCheckout).not.toHaveBeenCalled();
  });

  it("requires the authenticated email to be verified", async () => {
    claimMocks.createSupabaseServerClient.mockResolvedValue(
      supabaseUser({ confirmedAt: null })
    );

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(claimMocks.claimGuestMembershipCheckout).not.toHaveBeenCalled();
  });

  it("does not expose RPC failures", async () => {
    claimMocks.claimGuestMembershipCheckout.mockResolvedValue({
      ok: false,
      reason: "database internals"
    });

    const response = await POST(request());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Purchase claiming is temporarily unavailable."
    });
    expect(claimMocks.reportOperationalError).toHaveBeenCalledOnce();
  });
});
