import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  isCheckoutTestBrowserAllowed,
  isRestrictedCheckoutTestRuntime
} from "@/lib/checkout-test-access";
import { env } from "@/lib/env";
import { setGuestCheckoutBrowserCookie } from "@/lib/guest-membership-checkout";

const requestSchema = z
  .object({ browserId: z.string().uuid() })
  .strict();

function noStoreJson(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
    status
  });
}

export async function POST(request: NextRequest) {
  if (
    !isRestrictedCheckoutTestRuntime({
      nodeEnv: process.env.NODE_ENV,
      stripeSecretKey: env.STRIPE_SECRET_KEY
    })
  ) {
    return noStoreJson({ error: "Not found." }, 404);
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 1024) {
    return noStoreJson({ error: "Invalid request." }, 413);
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return noStoreJson({ error: "Invalid request." }, 400);
  }

  const allowed = isCheckoutTestBrowserAllowed({
    browserId: parsed.data.browserId,
    expectedBrowserHmac: env.SOJI_CHECKOUT_TEST_BROWSER_HMAC,
    hmacSecret: env.GUEST_CHECKOUT_HMAC_SECRET,
    nodeEnv: process.env.NODE_ENV,
    stripeSecretKey: env.STRIPE_SECRET_KEY
  });
  if (!allowed) {
    return noStoreJson({ error: "Not found." }, 404);
  }

  const response = noStoreJson({ ok: true }, 200);
  setGuestCheckoutBrowserCookie(response, parsed.data.browserId);
  return response;
}
