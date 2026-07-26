import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { reportOperationalError } from "@/lib/observability";
import { PRODUCT_FILES_BUCKET } from "@/lib/product-asset-validation";
import { isPurchaseDownloadAllowed } from "@/lib/purchase-status";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isMissingAuthSession } from "@/lib/supabase/auth-errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const purchaseIdSchema = z.string().uuid();
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, reason: "supabase_not_configured" },
      { status: 501 }
    );
  }

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();
  if (authError && !isMissingAuthSession(authError)) {
    await reportOperationalError("product_download.auth_lookup_failed", authError);
    return NextResponse.json(
      { ok: false, reason: "authentication_unavailable" },
      { status: 503 }
    );
  }
  if (!user) {
    return NextResponse.json(
      { ok: false, reason: "not_authenticated" },
      { status: 401 }
    );
  }

  const parsedId = purchaseIdSchema.safeParse((await params).id);
  if (!parsedId.success) {
    return NextResponse.json(
      { ok: false, reason: "invalid_purchase_id" },
      { status: 400 }
    );
  }

  const { data: purchase, error: purchaseError } = await supabase
    .from("purchases")
    .select("id, product_id, status, dispute_status")
    .eq("id", parsedId.data)
    .eq("user_id", user.id)
    .maybeSingle();

  if (purchaseError) {
    await reportOperationalError("product_download.purchase_lookup_failed", purchaseError, {
      purchaseId: parsedId.data,
      userId: user.id
    });
    return NextResponse.json(
      { ok: false, reason: "purchase_lookup_failed" },
      { status: 500 }
    );
  }
  if (
    !purchase ||
    !isPurchaseDownloadAllowed(
      purchase.status as string,
      purchase.dispute_status as string | null
    )
  ) {
    return NextResponse.json(
      { ok: false, reason: "purchase_not_found" },
      { status: 404 }
    );
  }

  const { data: asset, error: assetError } = await supabase
    .from("product_assets")
    .select("storage_path, original_filename")
    .eq("product_id", purchase.product_id)
    .maybeSingle();

  if (assetError) {
    await reportOperationalError("product_download.asset_lookup_failed", assetError, {
      productId: purchase.product_id,
      purchaseId: parsedId.data
    });
    return NextResponse.json(
      { ok: false, reason: "product_asset_lookup_failed" },
      { status: 500 }
    );
  }
  if (!asset) {
    return NextResponse.json(
      { ok: false, reason: "product_asset_not_found" },
      { status: 404 }
    );
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      { ok: false, reason: "download_signing_not_configured" },
      { status: 503 }
    );
  }

  const { data: signed, error: signError } = await admin.storage
    .from(PRODUCT_FILES_BUCKET)
    .createSignedUrl(asset.storage_path, 60, {
      download: asset.original_filename
    });

  if (signError || !signed?.signedUrl) {
    await reportOperationalError("product_download.signing_failed", signError, {
      productId: purchase.product_id,
      purchaseId: parsedId.data
    });
    return NextResponse.json(
      { ok: false, reason: "download_signing_failed" },
      { status: 502 }
    );
  }

  const response = NextResponse.redirect(signed.signedUrl, 302);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
