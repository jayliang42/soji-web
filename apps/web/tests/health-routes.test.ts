import { beforeEach, describe, expect, it, vi } from "vitest";

const healthMocks = vi.hoisted(() => ({
  hasProductionSiteUrlConfig: vi.fn(),
  hasStripeConfig: vi.fn(),
  hasStripeWebhookConfig: vi.fn(),
  hasSupabaseAdminConfig: vi.fn(),
  hasSupabaseConfig: vi.fn(),
  isExplicitDemoModeEnabled: vi.fn()
}));
const readinessMocks = vi.hoisted(() => ({
  getOperationalReadiness: vi.fn()
}));

vi.mock("@/lib/env", () => healthMocks);
vi.mock("@/lib/readiness", () => readinessMocks);

import { GET as getHealth } from "@/app/api/health/route";
import { GET as getReadiness } from "@/app/api/health/ready/route";

describe("health routes", () => {
  beforeEach(() => {
    for (const check of Object.values(healthMocks)) {
      check.mockReset();
      check.mockReturnValue(true);
    }
    healthMocks.isExplicitDemoModeEnabled.mockReturnValue(false);
    readinessMocks.getOperationalReadiness.mockResolvedValue({
      stripeMembershipPrices: true,
      supabasePublicOperational: true,
      supabaseServiceRoleOperational: true
    });
  });

  it("reports process liveness without testing external services", async () => {
    const response = getHealth();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, status: "alive" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("reports ready only when every Web payment dependency is configured", async () => {
    const readyResponse = await getReadiness();
    expect(readyResponse.status).toBe(200);
    expect((await readyResponse.json()).status).toBe("ready");

    healthMocks.hasStripeWebhookConfig.mockReturnValue(false);
    const unavailableResponse = await getReadiness();
    expect(unavailableResponse.status).toBe(503);
    expect(await unavailableResponse.json()).toMatchObject({
      checks: { stripeWebhook: false },
      ok: false,
      status: "not_ready"
    });

    healthMocks.hasStripeWebhookConfig.mockReturnValue(true);
    healthMocks.isExplicitDemoModeEnabled.mockReturnValue(true);
    const demoModeResponse = await getReadiness();
    expect(demoModeResponse.status).toBe(503);
    expect(await demoModeResponse.json()).toMatchObject({
      checks: { demoModeDisabled: false },
      ok: false,
      status: "not_ready"
    });
  });

  it("fails readiness when configured dependencies are not operational", async () => {
    readinessMocks.getOperationalReadiness.mockResolvedValue({
      stripeMembershipPrices: false,
      supabasePublicOperational: true,
      supabaseServiceRoleOperational: false
    });

    const response = await getReadiness();

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      checks: {
        stripeMembershipPrices: false,
        supabasePublicOperational: true,
        supabaseServiceRoleOperational: false
      },
      ok: false,
      status: "not_ready"
    });
  });
});
