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
  const {
    launchContentCount,
    officeHourReplayCount,
    officeHourSignupCount,
    officeHourReplayState: _officeHourReplayState,
    officeHourSignupState: _officeHourSignupState,
    policiesApprovalState: _policiesApprovalState,
    stripeTermsAcceptanceState: _stripeTermsAcceptanceState,
    supportContactState: _supportContactState,
    ...publicOperationalChecks
  } = operationalChecks;
  const checks = { ...configurationChecks, ...publicOperationalChecks };
  const details = {
    launchContentCount,
    officeHourReplayCount,
    officeHourSignupCount
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
