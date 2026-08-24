import { describe, expect, it } from "vitest";
import {
  createGuestCheckoutHmac,
  getGuestCheckoutBrowserHmac,
  getGuestCheckoutEmailHmac,
  normalizeGuestCheckoutEmail,
  resolveGuestCheckoutBrowserId
} from "@/lib/guest-checkout-identity";

describe("guest checkout identity", () => {
  it("normalizes email without provider-specific rewriting", () => {
    expect(normalizeGuestCheckoutEmail("  Buyer+Soji@Example.COM ")).toBe(
      "buyer+soji@example.com"
    );
    expect(normalizeGuestCheckoutEmail("not-an-email")).toBeNull();
  });

  it("uses domain-separated deterministic HMACs", () => {
    const emailHmac = createGuestCheckoutHmac({
      purpose: "email",
      secret: "test-service-secret",
      value: "buyer@example.com"
    });
    const browserHmac = createGuestCheckoutHmac({
      purpose: "browser",
      secret: "test-service-secret",
      value: "buyer@example.com"
    });

    expect(emailHmac).toMatch(/^[a-f0-9]{64}$/);
    expect(browserHmac).toMatch(/^[a-f0-9]{64}$/);
    expect(browserHmac).not.toBe(emailHmac);
  });

  it("fails closed without the server secret", () => {
    expect(getGuestCheckoutEmailHmac("buyer@example.com", undefined)).toBeNull();
    expect(
      getGuestCheckoutBrowserHmac(
        "00000000-0000-4000-8000-000000000101",
        undefined
      )
    ).toBeNull();
  });

  it("keeps a valid browser id and replaces invalid cookie input", () => {
    const existing = "00000000-0000-4000-8000-000000000101";
    expect(resolveGuestCheckoutBrowserId(existing)).toEqual({
      browserId: existing,
      isNew: false
    });

    const replacement = resolveGuestCheckoutBrowserId("attacker-controlled");
    expect(replacement.isNew).toBe(true);
    expect(replacement.browserId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });
});
