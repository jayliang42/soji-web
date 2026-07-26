import { NextResponse } from "next/server";
import { z } from "zod";
import { processDueProductAssetCleanupJobs } from "@/lib/product-asset-cleanup";
import { getAdminContext } from "@/lib/publisher";

const requestSchema = z.object({
  limit: z.number().int().min(1).max(50).default(20)
}).strict();

export async function POST(request: Request) {
  const context = await getAdminContext();
  if ("error" in context) {
    return context.error;
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, reason: "invalid_product_asset_cleanup_request" },
      { status: 400 }
    );
  }

  const result = await processDueProductAssetCleanupJobs({
    actor: context.user.id,
    eventPrefix: "admin.product_asset_cleanup",
    limit: parsed.data.limit,
    supabase: context.supabase
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
