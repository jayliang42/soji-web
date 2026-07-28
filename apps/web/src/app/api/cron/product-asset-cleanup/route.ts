import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { processDueProductAssetCleanupJobs } from "@/lib/product-asset-cleanup";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      { ok: false, reason: "cron_unauthorized" },
      { headers: noStoreHeaders, status: 401 }
    );
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, reason: "product_asset_cleanup_service_not_configured" },
      { headers: noStoreHeaders, status: 503 }
    );
  }

  const result = await processDueProductAssetCleanupJobs({
    actor: "scheduled-cleanup",
    eventPrefix: "cron.product_asset_cleanup",
    limit: 50,
    supabase
  });

  const response = result.ok
    ? {
        claimed: result.attempted,
        cleaned: result.cleaned,
        failed: result.failed,
        ok: true as const,
        status: result.failed > 0 ? ("partial" as const) : ("complete" as const)
      }
    : {
        claimed: result.attempted,
        cleaned: "cleaned" in result ? result.cleaned : 0,
        failed: "failed" in result ? result.failed : result.attempted,
        ok: false as const,
        reason: result.reason,
        status: "failed" as const
      };

  return NextResponse.json(response, {
    headers: noStoreHeaders,
    status: result.ok ? 200 : 500
  });
}
