import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

const returnMocks = vi.hoisted(() => ({
  reportOperationalError: vi.fn()
}));

vi.mock("@/lib/observability", () => ({
  reportOperationalError: returnMocks.reportOperationalError
}));

import { getCheckoutReturnStatus } from "@/lib/checkout-return";

const userId = "00000000-0000-4000-8000-000000000101";
const sessionId = "cs_test_abc123";

function stripeWithSession(overrides: Partial<Stripe.Checkout.Session> = {}) {
  const retrieve = vi.fn().mockResolvedValue({
    client_reference_id: userId,
    metadata: { userId },
    mode: "payment",
    payment_status: "paid",
    status: "complete",
    ...overrides
  });
  return { retrieve, stripe: { checkout: { sessions: { retrieve } } } as unknown as Stripe };
}

describe("checkout return verification", () => {
  beforeEach(() => {
    returnMocks.reportOperationalError.mockReset();
  });

  it("does no provider work without a checkout return", async () => {
    await expect(
      getCheckoutReturnStatus({ kind: null })
    ).resolves.toEqual({ kind: null, state: "none" });
  });

  it("rejects a success query without a valid session and signed-in user", async () => {
    const { retrieve, stripe } = stripeWithSession();

    await expect(
      getCheckoutReturnStatus({ kind: "product", sessionId: "bad", stripe })
    ).resolves.toEqual({ kind: "product", state: "invalid" });
    expect(retrieve).not.toHaveBeenCalled();
  });

  it("rejects checkout sessions owned by another account", async () => {
    const { stripe } = stripeWithSession({
      client_reference_id: "00000000-0000-4000-8000-000000000102"
    });

    await expect(
      getCheckoutReturnStatus({ kind: "product", sessionId, stripe, userId })
    ).resolves.toEqual({ kind: "product", state: "invalid" });
  });

  it("rejects a checkout mode that does not match the return path", async () => {
    const { stripe } = stripeWithSession({ mode: "subscription" });

    await expect(
      getCheckoutReturnStatus({ kind: "product", sessionId, stripe, userId })
    ).resolves.toEqual({ kind: "product", state: "invalid" });
  });

  it.each(["paid", "no_payment_required"] as const)(
    "confirms provider-verified %s sessions",
    async (paymentStatus) => {
      const { stripe } = stripeWithSession({ payment_status: paymentStatus });

      await expect(
        getCheckoutReturnStatus({ kind: "product", sessionId, stripe, userId })
      ).resolves.toEqual({ kind: "product", state: "confirmed" });
    }
  );

  it("distinguishes processing from incomplete checkout", async () => {
    const processing = stripeWithSession({ payment_status: "unpaid" });
    const incomplete = stripeWithSession({ payment_status: "unpaid", status: "open" });

    await expect(
      getCheckoutReturnStatus({
        kind: "product",
        sessionId,
        stripe: processing.stripe,
        userId
      })
    ).resolves.toEqual({ kind: "product", state: "processing" });
    await expect(
      getCheckoutReturnStatus({
        kind: "product",
        sessionId,
        stripe: incomplete.stripe,
        userId
      })
    ).resolves.toEqual({ kind: "product", state: "incomplete" });
  });

  it("fails conservatively and logs provider lookup errors", async () => {
    const retrieve = vi.fn().mockRejectedValue(new Error("provider unavailable"));
    const stripe = { checkout: { sessions: { retrieve } } } as unknown as Stripe;

    await expect(
      getCheckoutReturnStatus({ kind: "product", sessionId, stripe, userId })
    ).resolves.toEqual({ kind: "product", state: "unavailable" });
    expect(returnMocks.reportOperationalError).toHaveBeenCalledWith(
      "stripe.checkout.return_lookup_failed",
      expect.any(Error),
      expect.objectContaining({ checkoutKind: "product" })
    );
  });
});
