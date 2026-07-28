import { afterEach, describe, expect, it } from "vitest";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { env } from "@/lib/env";

function request(authorization?: string) {
  return new Request("http://localhost:3000/api/cron/product-asset-cleanup", {
    headers: authorization ? { authorization } : {}
  });
}

describe("cron authorization", () => {
  afterEach(() => {
    env.CRON_SECRET = undefined;
  });

  it("fails closed when no cron secret is configured", () => {
    expect(isAuthorizedCronRequest(request())).toBe(false);
  });

  it("rejects configured secrets shorter than thirty-two characters", () => {
    env.CRON_SECRET = "0123456789abcdef";
    expect(isAuthorizedCronRequest(request("Bearer 0123456789abcdef"))).toBe(false);
  });

  it("rejects a padded secret instead of silently trimming it", () => {
    env.CRON_SECRET = " 0123456789abcdef0123456789abcdef ";
    expect(
      isAuthorizedCronRequest(
        request("Bearer 0123456789abcdef0123456789abcdef")
      )
    ).toBe(false);
  });

  it("rejects an incorrect bearer value", () => {
    env.CRON_SECRET = "0123456789abcdef0123456789abcdef";
    expect(
      isAuthorizedCronRequest(
        request("Bearer fedcba9876543210fedcba9876543210")
      )
    ).toBe(false);
  });

  it.each([
    undefined,
    "",
    "Basic 0123456789abcdef0123456789abcdef",
    "bearer 0123456789abcdef0123456789abcdef",
    "Bearer  0123456789abcdef0123456789abcdef",
    "Bearer x0123456789abcdef0123456789abcdef",
    "Bearer 0123456789abcdef0123456789abcdefx"
  ])("rejects missing or malformed authorization %s", (authorization) => {
    env.CRON_SECRET = "0123456789abcdef0123456789abcdef";
    expect(isAuthorizedCronRequest(request(authorization))).toBe(false);
  });

  it("accepts the exact configured bearer value", () => {
    env.CRON_SECRET = "0123456789abcdef0123456789abcdef";
    expect(
      isAuthorizedCronRequest(
        request("Bearer 0123456789abcdef0123456789abcdef")
      )
    ).toBe(true);
  });
});
