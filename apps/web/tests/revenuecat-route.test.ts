import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const revenueCatEnv = vi.hoisted(() => ({
  REVENUECAT_WEBHOOK_AUTHORIZATION: undefined as string | undefined
}));

vi.mock("@/lib/env", () => ({ env: revenueCatEnv }));

import { POST } from "@/app/api/webhooks/revenuecat/route";

function request({ authorization, body = { event: { type: "TEST" } } }: {
  authorization?: string;
  body?: unknown;
}) {
  return new NextRequest("http://localhost:3000/api/webhooks/revenuecat", {
    body: JSON.stringify(body),
    headers: {
      ...(authorization ? { authorization } : {}),
      "content-type": "application/json"
    },
    method: "POST"
  });
}

describe("RevenueCat webhook fail-closed behavior", () => {
  beforeEach(() => {
    revenueCatEnv.REVENUECAT_WEBHOOK_AUTHORIZATION = undefined;
  });

  it("returns 501 and received false when not configured", async () => {
    const response = await POST(request({}));
    expect(response.status).toBe(501);
    expect(await response.json()).toMatchObject({ received: false });
  });

  it("returns 401 for invalid authorization", async () => {
    revenueCatEnv.REVENUECAT_WEBHOOK_AUTHORIZATION = "Bearer expected";
    const response = await POST(request({ authorization: "Bearer wrong" }));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ received: false });
  });

  it("does not acknowledge an authorized event before processing exists", async () => {
    revenueCatEnv.REVENUECAT_WEBHOOK_AUTHORIZATION = "Bearer expected";
    const response = await POST(request({ authorization: "Bearer expected" }));
    expect(response.status).toBe(501);
    expect(await response.json()).toMatchObject({
      event: "TEST",
      received: false,
      source: "revenuecat"
    });
  });

  it("rejects an invalid event payload", async () => {
    revenueCatEnv.REVENUECAT_WEBHOOK_AUTHORIZATION = "Bearer expected";
    const response = await POST(
      request({ authorization: "Bearer expected", body: { event: {} } })
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ received: false });
  });
});
