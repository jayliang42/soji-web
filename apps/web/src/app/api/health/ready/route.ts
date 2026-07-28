import { NextResponse } from "next/server";
import {
  hasProductionSiteUrlConfig,
  hasStripeConfig,
  hasStripeWebhookConfig,
  hasSupabaseAdminConfig,
  hasSupabaseConfig,
  isExplicitDemoModeEnabled
} from "@/lib/env";
import { getOperationalReadiness } from "@/lib/readiness";

export const dynamic = "force-dynamic";

export async function GET() {
  const configurationChecks = {
    demoModeDisabled: !isExplicitDemoModeEnabled(),
    siteUrl: hasProductionSiteUrlConfig(),
    stripe: hasStripeConfig(),
    stripeWebhook: hasStripeWebhookConfig(),
    supabase: hasSupabaseConfig(),
    supabaseAdmin: hasSupabaseAdminConfig()
  };
  const operationalChecks = await getOperationalReadiness();
  const checks = {
    ...configurationChecks,
    launchContentOperational:
      operationalChecks.launchContentOperational,
    officeHoursOperational: operationalChecks.officeHoursOperational,
    policiesApproved: operationalChecks.policiesApproved,
    stripeMembershipPrices: operationalChecks.stripeMembershipPrices,
    stripeTermsAcceptanceReady:
      operationalChecks.stripeTermsAcceptanceReady,
    supabasePublicOperational:
      operationalChecks.supabasePublicOperational,
    supabaseServiceRoleOperational:
      operationalChecks.supabaseServiceRoleOperational,
    supportContactConfigured:
      operationalChecks.supportContactConfigured
  };
  const details = {
    launchContentCount: operationalChecks.launchContentCount,
    officeHourReplayCount: operationalChecks.officeHourReplayCount,
    officeHourSignupCount: operationalChecks.officeHourSignupCount
  };
  const ok = Object.values(checks).every(Boolean);

  return NextResponse.json(
    { checks, details, ok, status: ok ? "ready" : "not_ready" },
    {
      headers: { "Cache-Control": "no-store" },
      status: ok ? 200 : 503
    }
  );
}
