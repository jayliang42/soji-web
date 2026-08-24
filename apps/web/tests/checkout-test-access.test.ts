import { describe, expect, it } from "vitest";
import {
  isCheckoutTestBrowserAllowed,
  isRestrictedCheckoutTestRuntime
} from "@/lib/checkout-test-access";
import { getGuestCheckoutBrowserHmac } from "@/lib/guest-checkout-identity";

const browserId = "00000000-0000-4000-8000-000000000951";
const hmacSecret = "test-guest-checkout-hmac-secret-value";
const expectedBrowserHmac = getGuestCheckoutBrowserHmac(browserId, hmacSecret);

describe("production Stripe test access", () => {
  it("restricts only production runtimes that use a Stripe test key", () => {
    expect(
      isRestrictedCheckoutTestRuntime({
        nodeEnv: "production",
        stripeSecretKey: "sk_test_placeholder"
      })
    ).toBe(true);
    expect(
      isRestrictedCheckoutTestRuntime({
        nodeEnv: "development",
        stripeSecretKey: "sk_test_placeholder"
      })
    ).toBe(false);
    expect(
      isRestrictedCheckoutTestRuntime({
        nodeEnv: "production",
        stripeSecretKey: "sk_live_placeholder"
      })
    ).toBe(false);
  });

  it("does not restrict live Stripe Checkout", () => {
    expect(
      isCheckoutTestBrowserAllowed({
        browserId: null,
        expectedBrowserHmac: null,
        hmacSecret: null,
        nodeEnv: "production",
        stripeSecretKey: "sk_live_placeholder"
      })
    ).toBe(true);
  });

  it("fails closed for a production test key without the exact browser capability", () => {
    expect(
      isCheckoutTestBrowserAllowed({
        browserId,
        expectedBrowserHmac: null,
        hmacSecret,
        nodeEnv: "production",
        stripeSecretKey: "sk_test_placeholder"
      })
    ).toBe(false);
    expect(
      isCheckoutTestBrowserAllowed({
        browserId: "00000000-0000-4000-8000-000000000952",
        expectedBrowserHmac,
        hmacSecret,
        nodeEnv: "production",
        stripeSecretKey: "sk_test_placeholder"
      })
    ).toBe(false);
  });

  it("allows only the constant-time matched production test browser", () => {
    expect(expectedBrowserHmac).toMatch(/^[0-9a-f]{64}$/);
    expect(
      isCheckoutTestBrowserAllowed({
        browserId,
        expectedBrowserHmac,
        hmacSecret,
        nodeEnv: "production",
        stripeSecretKey: "sk_test_placeholder"
      })
    ).toBe(true);
  });
});
