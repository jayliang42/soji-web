import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const accessMocks = vi.hoisted(() => ({
  isAllowed: vi.fn(),
  isRestrictedRuntime: vi.fn(),
  setBrowserCookie: vi.fn()
}));

vi.mock("@/lib/checkout-test-access", () => ({
  isCheckoutTestBrowserAllowed: accessMocks.isAllowed,
  isRestrictedCheckoutTestRuntime: accessMocks.isRestrictedRuntime
}));
vi.mock("@/lib/env", () => ({
  env: {
    GUEST_CHECKOUT_HMAC_SECRET: "test-hmac-secret-value-at-least-32-characters",
    SOJI_CHECKOUT_TEST_BROWSER_HMAC: "a".repeat(64),
    STRIPE_SECRET_KEY: "sk_test_placeholder"
  }
}));
vi.mock("@/lib/guest-membership-checkout", () => ({
  setGuestCheckoutBrowserCookie: accessMocks.setBrowserCookie
}));

import { POST } from "@/app/api/checkout/test-access/route";

const browserId = "00000000-0000-4000-8000-000000000951";

function request(body: string, contentLength?: number) {
  const headers = new Headers({
    "content-type": "application/json",
    origin: "https://soji.example",
    "sec-fetch-site": "same-origin"
  });
  if (contentLength !== undefined) {
    headers.set("content-length", String(contentLength));
  }
  return new NextRequest("https://soji.example/api/checkout/test-access", {
    body,
    headers,
    method: "POST"
  });
}

describe("checkout test access route", () => {
  beforeEach(() => {
    accessMocks.isAllowed.mockReset();
    accessMocks.isRestrictedRuntime.mockReset();
    accessMocks.setBrowserCookie.mockReset();
    accessMocks.isRestrictedRuntime.mockReturnValue(true);
    accessMocks.isAllowed.mockReturnValue(true);
  });

  it("is unavailable outside a restricted Stripe test runtime", async () => {
    accessMocks.isRestrictedRuntime.mockReturnValue(false);

    const response = await POST(request(JSON.stringify({ browserId })));

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(accessMocks.setBrowserCookie).not.toHaveBeenCalled();
  });

  it("rejects oversized or malformed capabilities", async () => {
    const oversized = await POST(request(JSON.stringify({ browserId }), 1025));
    const malformed = await POST(request(JSON.stringify({ browserId: "nope" })));

    expect(oversized.status).toBe(413);
    expect(malformed.status).toBe(400);
    expect(accessMocks.isAllowed).not.toHaveBeenCalled();
    expect(accessMocks.setBrowserCookie).not.toHaveBeenCalled();
  });

  it("returns a generic not-found response for a wrong capability", async () => {
    accessMocks.isAllowed.mockReturnValue(false);

    const response = await POST(request(JSON.stringify({ browserId })));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Not found." });
    expect(accessMocks.setBrowserCookie).not.toHaveBeenCalled();
  });

  it("sets the protected browser cookie for the exact capability", async () => {
    const response = await POST(request(JSON.stringify({ browserId })));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(accessMocks.setBrowserCookie).toHaveBeenCalledWith(
      response,
      browserId
    );
  });
});
