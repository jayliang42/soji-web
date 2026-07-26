import { beforeEach, describe, expect, it, vi } from "vitest";

const customerMocks = vi.hoisted(() => ({
  eq: vi.fn(),
  from: vi.fn(),
  limit: vi.fn(),
  maybeSingle: vi.fn(),
  not: vi.fn(),
  order: vi.fn(),
  reportOperationalError: vi.fn(),
  select: vi.fn()
}));

vi.mock("@/lib/observability", () => ({
  reportOperationalError: customerMocks.reportOperationalError
}));

import { getExistingStripeCustomerId } from "@/lib/stripe-customer";

describe("existing Stripe customer lookup", () => {
  beforeEach(() => {
    for (const mock of Object.values(customerMocks)) mock.mockReset();
    customerMocks.from.mockReturnValue({ select: customerMocks.select });
    customerMocks.select.mockReturnValue({ eq: customerMocks.eq });
    customerMocks.eq
      .mockReturnValueOnce({ eq: customerMocks.eq })
      .mockReturnValueOnce({ not: customerMocks.not });
    customerMocks.not.mockReturnValue({ order: customerMocks.order });
    customerMocks.order.mockReturnValue({ limit: customerMocks.limit });
    customerMocks.limit.mockReturnValue({ maybeSingle: customerMocks.maybeSingle });
  });

  it("reuses the newest Stripe customer already bound to the user", async () => {
    customerMocks.maybeSingle.mockResolvedValue({
      data: { provider_customer_id: "cus_existing" },
      error: null
    });

    await expect(
      getExistingStripeCustomerId(
        { from: customerMocks.from } as never,
        "user-id"
      )
    ).resolves.toBe("cus_existing");
    expect(customerMocks.eq).toHaveBeenNthCalledWith(1, "user_id", "user-id");
    expect(customerMocks.eq).toHaveBeenNthCalledWith(2, "provider", "stripe");
  });

  it("allows first checkout when no existing customer mapping exists", async () => {
    customerMocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(
      getExistingStripeCustomerId(
        { from: customerMocks.from } as never,
        "user-id"
      )
    ).resolves.toBeNull();
  });

  it("logs lookup details and fails closed instead of creating a duplicate customer", async () => {
    const databaseError = { message: "sensitive subscription query detail" };
    customerMocks.maybeSingle.mockResolvedValue({ data: null, error: databaseError });

    await expect(
      getExistingStripeCustomerId(
        { from: customerMocks.from } as never,
        "user-id"
      )
    ).rejects.toThrow("stripe_customer_lookup_failed");
    expect(customerMocks.reportOperationalError).toHaveBeenCalledWith(
      "stripe.customer_lookup_failed",
      databaseError,
      { userId: "user-id" }
    );
  });
});
