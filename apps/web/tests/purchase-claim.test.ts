import { describe, expect, it, vi } from "vitest";
import {
  parsePurchaseClaimStatus,
  purchaseClaimLoginHref,
  requestPendingPurchaseClaim
} from "@/lib/purchase-claim";

function response({
  body,
  ok = true,
  status = 200
}: {
  body: unknown;
  ok?: boolean;
  status?: number;
}) {
  return {
    json: vi.fn().mockResolvedValue(body),
    ok,
    status
  };
}

describe("pending purchase claim client", () => {
  it.each(["processing", "claimed", "email_mismatch", "invalid"] as const)(
    "accepts the documented %s state",
    async (status) => {
      const fetcher = vi.fn().mockResolvedValue(response({ body: { status } }));

      await expect(requestPendingPurchaseClaim(fetcher)).resolves.toEqual({
        kind: "status",
        status
      });
      expect(fetcher).toHaveBeenCalledWith(
        "/api/account/purchases/claim",
        expect.objectContaining({
          credentials: "same-origin",
          method: "POST"
        })
      );
      expect(fetcher.mock.calls[0]?.[1]).not.toHaveProperty("body");
    }
  );

  it("returns to login when the authenticated session has expired", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      response({ body: null, ok: false, status: 401 })
    );

    await expect(requestPendingPurchaseClaim(fetcher)).resolves.toEqual({
      href: purchaseClaimLoginHref,
      kind: "redirect"
    });
  });

  it.each([
    response({ body: { status: "claimed" }, ok: false, status: 500 }),
    response({ body: { status: "unknown" } })
  ])("fails closed for server errors and unknown states", async (result) => {
    const fetcher = vi.fn().mockResolvedValue(result);

    await expect(requestPendingPurchaseClaim(fetcher)).resolves.toEqual({
      kind: "status",
      status: "error"
    });
  });

  it("fails closed when the response is not JSON", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      json: vi.fn().mockRejectedValue(new Error("not_json")),
      ok: true,
      status: 200
    });

    await expect(requestPendingPurchaseClaim(fetcher)).resolves.toEqual({
      kind: "status",
      status: "error"
    });
  });

  it("does not recognize client-provided claim material", () => {
    expect(parsePurchaseClaimStatus({ claimToken: "secret" })).toBeNull();
  });
});
