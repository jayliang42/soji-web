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
      launchContentCount: 1,
      launchContentOperational: true,
      officeHourReplayCount: 1,
      officeHourReplayState: "ready",
      officeHourSignupCount: 1,
      officeHourSignupState: "ready",
      officeHoursOperational: true,
      policiesApprovalState: "ready",
      policiesApproved: true,
      stripeMembershipPrices: true,
      stripeTermsAcceptanceReady: true,
      stripeTermsAcceptanceState: "ready",
      supportContactConfigured: true,
      supportContactState: "ready",
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
      launchContentCount: 0,
      launchContentOperational: false,
      officeHourReplayCount: 0,
      officeHourReplayState: "needs_owner_input",
      officeHourSignupCount: 0,
      officeHourSignupState: "invalid",
      officeHoursOperational: false,
      policiesApprovalState: "needs_owner_input",
      policiesApproved: false,
      stripeMembershipPrices: false,
      stripeTermsAcceptanceReady: false,
      stripeTermsAcceptanceState: "needs_owner_input",
      supportContactConfigured: false,
      supportContactState: "invalid",
      supabasePublicOperational: true,
      supabaseServiceRoleOperational: false
    });

    const response = await getReadiness();

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      checks: {
        stripeMembershipPrices: false,
        launchContentOperational: false,
        officeHoursOperational: false,
        policiesApproved: false,
        stripeTermsAcceptanceReady: false,
        supportContactConfigured: false,
        supabasePublicOperational: true,
        supabaseServiceRoleOperational: false
      },
      details: {
        launchContentCount: 0,
        officeHourReplayCount: 0,
        officeHourSignupCount: 0
      },
      ok: false,
      status: "not_ready"
    });

    const serialized = JSON.stringify(await response.clone().json());
    expect(serialized).not.toContain("needs_owner_input");
    expect(serialized).not.toContain("invalid");
  });
});
