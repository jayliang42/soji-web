import { describe, expect, it } from "vitest";
import {
  productCheckoutPayloadSchema,
  shouldRotateCheckoutRequestId,
  subscriptionCheckoutPayloadSchema
} from "@/lib/checkout";

const requestId = "00000000-0000-4000-8000-000000000503";

describe("subscription checkout payload", () => {
  it("accepts only paid membership plan identifiers", () => {
    expect(
      subscriptionCheckoutPayloadSchema.safeParse({ planId: "tier_1", requestId })
        .success
    ).toBe(true);
    expect(
      subscriptionCheckoutPayloadSchema.safeParse({ planId: "free", requestId }).success
    ).toBe(false);
  });

  it("rejects client-controlled price fields", () => {
    expect(
      subscriptionCheckoutPayloadSchema.safeParse({
        planId: "tier_1",
        priceId: "price_attacker_controlled",
        requestId
      }).success
    ).toBe(false);
  });
});

describe("product checkout payload", () => {
  it("accepts normalized product slugs", () => {
    expect(
      productCheckoutPayloadSchema.safeParse({
        productSlug: "wealth-dashboard-template-pack",
        requestId
      }).success
    ).toBe(true);
  });

  it("rejects malformed slugs and client-controlled price fields", () => {
    expect(
      productCheckoutPayloadSchema.safeParse({ productSlug: "../admin", requestId })
        .success
    ).toBe(false);
    expect(
      productCheckoutPayloadSchema.safeParse({
        productSlug: "wealth-dashboard-template-pack",
        requestId,
        stripePriceId: "price_attacker_controlled"
      }).success
    ).toBe(false);
  });

  it("requires an opaque UUID for retry-safe checkout intent", () => {
    expect(
      productCheckoutPayloadSchema.safeParse({
        productSlug: "wealth-dashboard-template-pack"
      }).success
    ).toBe(false);
    expect(
      productCheckoutPayloadSchema.safeParse({
        productSlug: "wealth-dashboard-template-pack",
        requestId: "not-a-uuid"
      }).success
    ).toBe(false);
  });
});

describe("checkout intent retries", () => {
  it("rotates after definitive client errors but preserves ambiguous server failures", () => {
    expect(shouldRotateCheckoutRequestId(400)).toBe(true);
    expect(shouldRotateCheckoutRequestId(409)).toBe(true);
    expect(shouldRotateCheckoutRequestId(429)).toBe(true);
    expect(shouldRotateCheckoutRequestId(500)).toBe(false);
    expect(shouldRotateCheckoutRequestId(502)).toBe(false);
    expect(shouldRotateCheckoutRequestId(503)).toBe(false);
  });
});
