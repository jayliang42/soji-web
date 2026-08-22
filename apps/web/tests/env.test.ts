import { describe, expect, it } from "vitest";
import {
  getCheckoutReturnSiteUrl,
  getClientSiteUrl,
  getOpsAlertConfigState,
  getSiteUrl,
  hasProductionOpsAlertConfig,
  hasProductionSiteUrlConfig,
  isValidStripeWebhookSecret,
  isValidOpsAlertWebhookUrl,
  isValidSiteUrl,
  resolveDemoMode
} from "@/lib/env";

describe("demo mode policy", () => {
  it("defaults to enabled in development and tests", () => {
    expect(resolveDemoMode(undefined, "development")).toBe(true);
    expect(resolveDemoMode(undefined, "test")).toBe(true);
  });

  it("defaults to disabled in production", () => {
    expect(resolveDemoMode(undefined, "production")).toBe(false);
  });

  it("allows an explicit production opt-in", () => {
    expect(resolveDemoMode(" true ", "production")).toBe(true);
  });

  it("allows development demo mode to be explicitly disabled", () => {
    expect(resolveDemoMode("false", "development")).toBe(false);
  });

  it("treats unknown configured values as disabled", () => {
    expect(resolveDemoMode("yes", "development")).toBe(false);
  });
});

describe("site URL policy", () => {
  it("requires an HTTPS origin in production", () => {
    expect(isValidSiteUrl("https://soji.example", "production")).toBe(true);
    expect(isValidSiteUrl("http://soji.example", "production")).toBe(false);
    expect(isValidSiteUrl("http://localhost:3000", "production")).toBe(false);
  });

  it("accepts an HTTP origin for local development", () => {
    expect(isValidSiteUrl("http://localhost:3000", "development")).toBe(true);
  });

  it("never treats a local HTTP origin as production configuration", () => {
    expect(hasProductionSiteUrlConfig("https://soji.example")).toBe(true);
    expect(hasProductionSiteUrlConfig("http://localhost:3000")).toBe(false);
  });

  it("rejects malformed URLs and values that are not bare origins", () => {
    expect(isValidSiteUrl("not-a-url", "production")).toBe(false);
    expect(isValidSiteUrl("https://soji.example/app", "production")).toBe(false);
    expect(isValidSiteUrl("https://user:secret@soji.example", "production")).toBe(false);
    expect(isValidSiteUrl("https://soji.example?preview=true", "production")).toBe(false);
  });

  it("keeps a deterministic local fallback outside production", () => {
    expect(getSiteUrl()).toMatch(/^https?:\/\//);
  });

  it("uses the configured canonical origin for browser auth redirects", () => {
    expect(
      getClientSiteUrl(
        "https://preview.example",
        "https://soji.example",
        "production"
      )
    ).toBe("https://soji.example");
  });

  it("allows the current browser origin only outside production", () => {
    expect(
      getClientSiteUrl("http://localhost:3002", "", "development")
    ).toBe("http://localhost:3002");
    expect(
      getClientSiteUrl("https://preview.example", "", "production")
    ).toBeNull();
  });

  it("keeps Checkout returns on the same trusted production origin", () => {
    expect(
      getCheckoutReturnSiteUrl(
        "https://soji-web.vercel.app/api/checkout/subscription",
        "https://gr8tfuture.com",
        "production"
      )
    ).toBe("https://soji-web.vercel.app");
    expect(
      getCheckoutReturnSiteUrl(
        "https://soji-ifmbjlsbt-szjasonliang-7817s-projects.vercel.app/api/checkout/subscription",
        "https://gr8tfuture.com",
        "production"
      )
    ).toBe(
      "https://soji-ifmbjlsbt-szjasonliang-7817s-projects.vercel.app"
    );
  });

  it("falls back to the configured canonical origin for an untrusted Checkout host", () => {
    expect(
      getCheckoutReturnSiteUrl(
        "https://untrusted.example/api/checkout/subscription",
        "https://gr8tfuture.com",
        "production"
      )
    ).toBe("https://gr8tfuture.com");
  });
});

describe("operations alert webhook policy", () => {
  it("requires HTTPS in production while allowing local HTTP development", () => {
    expect(
      isValidOpsAlertWebhookUrl("https://alerts.example/hooks/soji", "production")
    ).toBe(true);
    expect(
      isValidOpsAlertWebhookUrl("http://alerts.example/hooks/soji", "production")
    ).toBe(false);
    expect(
      isValidOpsAlertWebhookUrl("http://localhost:4000/hooks/soji", "development")
    ).toBe(true);
  });

  it("accepts provider webhook paths but rejects URL credentials", () => {
    expect(
      isValidOpsAlertWebhookUrl(
        "https://alerts.example/hooks/soji",
        "production"
      )
    ).toBe(true);
    expect(
      isValidOpsAlertWebhookUrl(
        "https://alerts.example/hooks/soji?token=managed-secret",
        "production"
      )
    ).toBe(false);
  });

  it("never treats a local HTTP receiver as production alert configuration", () => {
    expect(
      hasProductionOpsAlertConfig("https://alerts.example/hooks/soji")
    ).toBe(true);
    expect(
      hasProductionOpsAlertConfig("http://localhost:4000/hooks/soji")
    ).toBe(false);
  });

  it("rejects malformed, credential-bearing, and fragment URLs", () => {
    expect(isValidOpsAlertWebhookUrl("not-a-url", "production")).toBe(false);
    expect(
      isValidOpsAlertWebhookUrl(
        "https://user:secret@alerts.example/hooks/soji",
        "production"
      )
    ).toBe(false);
    expect(
      isValidOpsAlertWebhookUrl(
        "https://alerts.example/hooks/soji#ignored",
        "production"
      )
    ).toBe(false);
  });

  it("distinguishes missing, invalid, and ready alert configuration", () => {
    expect(getOpsAlertConfigState(undefined, "production")).toBe("missing");
    expect(
      getOpsAlertConfigState("http://alerts.example/hooks/soji", "production")
    ).toBe("invalid");
    expect(
      getOpsAlertConfigState("https://alerts.example/hooks/soji", "production")
    ).toBe("ready");
  });
});

describe("Stripe webhook secret policy", () => {
  it("requires an unpadded Stripe signing-secret value", () => {
    expect(isValidStripeWebhookSecret("whsec_test")).toBe(true);
    expect(isValidStripeWebhookSecret("placeholder")).toBe(false);
    expect(isValidStripeWebhookSecret(" whsec_test ")).toBe(false);
    expect(isValidStripeWebhookSecret("whsec_")).toBe(false);
  });
});
