import { describe, expect, it } from "vitest";
import {
  createGuestCheckoutHmac,
  getGuestCheckoutBrowserHmac,
  getGuestCheckoutEmailHmac,
  getGuestCheckoutNetworkHmac,
  normalizeGuestCheckoutEmail,
  resolveGuestCheckoutBrowserId
} from "@/lib/guest-checkout-identity";

describe("guest checkout identity", () => {
  const hmacSecret = "test-guest-checkout-hmac-secret-value";

  it("normalizes email without provider-specific rewriting", () => {
    expect(normalizeGuestCheckoutEmail("  Buyer+Soji@Example.COM ")).toBe(
      "buyer+soji@example.com"
    );
    expect(normalizeGuestCheckoutEmail("not-an-email")).toBeNull();
  });

  it("uses domain-separated deterministic HMACs", () => {
    const emailHmac = createGuestCheckoutHmac({
      purpose: "email",
      secret: hmacSecret,
      value: "buyer@example.com"
    });
    const browserHmac = createGuestCheckoutHmac({
      purpose: "browser",
      secret: hmacSecret,
      value: "buyer@example.com"
    });
    const networkHmac = createGuestCheckoutHmac({
      purpose: "network",
      secret: hmacSecret,
      value: "203.0.113.9"
    });

    expect(emailHmac).toMatch(/^[a-f0-9]{64}$/);
    expect(browserHmac).toMatch(/^[a-f0-9]{64}$/);
    expect(browserHmac).not.toBe(emailHmac);
    expect(networkHmac).not.toBe(browserHmac);
    expect(networkHmac).not.toBe(emailHmac);
  });

  it("accepts only valid IPv4 or IPv6 network identities", () => {
    expect(
      getGuestCheckoutNetworkHmac("203.0.113.9", hmacSecret)
    ).toMatch(/^[a-f0-9]{64}$/);
    expect(
      getGuestCheckoutNetworkHmac("2001:db8::1", hmacSecret)
    ).toMatch(/^[a-f0-9]{64}$/);
    expect(
      getGuestCheckoutNetworkHmac("2001:db8::1", hmacSecret)
    ).toBe(
      getGuestCheckoutNetworkHmac(
        "2001:db8:0:0:ffff::2",
        hmacSecret
      )
    );
    expect(
      getGuestCheckoutNetworkHmac("2001:db9::1", hmacSecret)
    ).not.toBe(
      getGuestCheckoutNetworkHmac("2001:db8::1", hmacSecret)
    );
    expect(
      getGuestCheckoutNetworkHmac("203.0.113.9, 10.0.0.1", hmacSecret)
    ).toBeNull();
  });

  it("fails closed without the server secret", () => {
    expect(getGuestCheckoutEmailHmac("buyer@example.com", undefined)).toBeNull();
    expect(
      getGuestCheckoutBrowserHmac(
        "00000000-0000-4000-8000-000000000101",
        undefined
      )
    ).toBeNull();
    expect(
      getGuestCheckoutEmailHmac("buyer@example.com", "too-short")
    ).toBeNull();
    expect(
      getGuestCheckoutEmailHmac("buyer@example.com", ` ${hmacSecret} `)
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
