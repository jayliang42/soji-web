import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import {
  getGuestCheckoutBrowserHmac,
  guestCheckoutBrowserCookieName
} from "@/lib/guest-checkout-identity";
import { env } from "@/lib/env";

const hmacPattern = /^[0-9a-f]{64}$/;

export function isRestrictedCheckoutTestRuntime({
  nodeEnv,
  stripeSecretKey
}: {
  nodeEnv: string | null | undefined;
  stripeSecretKey: string | null | undefined;
}) {
  return (
    nodeEnv === "production" &&
    stripeSecretKey?.trim().startsWith("sk_test_") === true
  );
}

export function isCheckoutTestBrowserAllowed({
  browserId,
  expectedBrowserHmac,
  hmacSecret,
  nodeEnv,
  stripeSecretKey
}: {
  browserId: string | null | undefined;
  expectedBrowserHmac: string | null | undefined;
  hmacSecret: string | null | undefined;
  nodeEnv: string | null | undefined;
  stripeSecretKey: string | null | undefined;
}) {
  if (!isRestrictedCheckoutTestRuntime({ nodeEnv, stripeSecretKey })) {
    return true;
  }

  const expected = expectedBrowserHmac?.trim();
  const actual = browserId
    ? getGuestCheckoutBrowserHmac(browserId, hmacSecret)
    : null;
  if (
    !expected ||
    expected !== expectedBrowserHmac ||
    !hmacPattern.test(expected) ||
    !actual ||
    !hmacPattern.test(actual)
  ) {
    return false;
  }

  return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

export function hasCheckoutTestAccess(request: NextRequest) {
  return isCheckoutTestBrowserAllowed({
    browserId: request.cookies.get(guestCheckoutBrowserCookieName)?.value,
    expectedBrowserHmac: env.SOJI_CHECKOUT_TEST_BROWSER_HMAC,
    hmacSecret: env.GUEST_CHECKOUT_HMAC_SECRET,
    nodeEnv: process.env.NODE_ENV,
    stripeSecretKey: env.STRIPE_SECRET_KEY
  });
}
