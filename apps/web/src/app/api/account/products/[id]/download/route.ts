import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { reportOperationalError } from "@/lib/observability";
import { PRODUCT_FILES_BUCKET } from "@/lib/product-asset-validation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isMissingAuthSession } from "@/lib/supabase/auth-errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const productIdSchema = z.string().uuid();

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
    await reportOperationalError("membership_product_download.auth_lookup_failed", authError);
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

  const parsedId = productIdSchema.safeParse((await params).id);
  if (!parsedId.success) {
    return NextResponse.json(
      { ok: false, reason: "invalid_product_id" },
      { status: 400 }
    );
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, entitlement_id, is_active")
    .eq("id", parsedId.data)
    .maybeSingle();

  if (productError) {
    await reportOperationalError("membership_product_download.product_lookup_failed", productError, {
      productId: parsedId.data,
      userId: user.id
    });
    return NextResponse.json(
      { ok: false, reason: "product_lookup_failed" },
      { status: 500 }
    );
  }
  if (!product || !product.is_active) {
    return NextResponse.json(
      { ok: false, reason: "product_not_found" },
      { status: 404 }
    );
  }

  const entitlementId = product.entitlement_id ?? "product.digital";
  const { data: membershipGrants, error: grantError } = await supabase
    .from("user_entitlements")
    .select("entitlement_id, ends_at")
    .eq("user_id", user.id);

  if (grantError) {
    await reportOperationalError("membership_product_download.entitlement_lookup_failed", grantError, {
      productId: parsedId.data,
      userId: user.id
    });
    return NextResponse.json(
      { ok: false, reason: "entitlement_lookup_failed" },
      { status: 503 }
    );
  }
  const membershipGrant = membershipGrants?.some(
    (grant) =>
      grant.entitlement_id === entitlementId &&
      (!grant.ends_at || Date.parse(grant.ends_at) > Date.now())
  );

  if (!membershipGrant) {
    return NextResponse.json(
      { ok: false, reason: "membership_access_required" },
      { status: 403 }
    );
  }

  const { data: asset, error: assetError } = await supabase
    .from("product_assets")
    .select("storage_path, original_filename")
    .eq("product_id", product.id)
    .maybeSingle();

  if (assetError) {
    await reportOperationalError("membership_product_download.asset_lookup_failed", assetError, {
      productId: product.id,
      userId: user.id
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
    await reportOperationalError("membership_product_download.signing_failed", signError, {
      productId: product.id,
      userId: user.id
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
