import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { reportOperationalError } from "@/lib/observability";
import { processProductAssetCleanupJob } from "@/lib/product-asset-cleanup";
import {
  PRODUCT_FILES_BUCKET,
  validateProductAssetFile
} from "@/lib/product-asset-validation";
import { getPublisherContext } from "@/lib/publisher";
import type { AppSupabaseClient } from "@/lib/supabase/client-types";

const productIdSchema = z.string().uuid();
const uploadRevisionSchema = z.union([
  z.literal("none"),
  z.coerce.number().int().positive()
]);
const deletePayloadSchema = z.object({
  expectedRevision: z.number().int().positive()
}).strict();

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getProductId(context: RouteContext) {
  const params = await context.params;
  const parsed = productIdSchema.safeParse(params.id);
  return parsed.success ? parsed.data : null;
}

function assetConflictResponse(error: { code?: string } | null) {
  const reason =
    error?.code === "40001" || error?.code === "23505"
      ? "product_asset_conflict"
      : error?.code === "P0002"
        ? "product_asset_not_found"
        : null;

  return reason
    ? NextResponse.json(
        { ok: false, reason },
        { status: reason === "product_asset_not_found" ? 404 : 409 }
      )
    : null;
}

async function removeStoredObject(
  context: { supabase: AppSupabaseClient; user: { id: string } },
  _storagePath: string,
  event: string,
  _productId: string,
  cleanupJobId: string
) {
  await processProductAssetCleanupJob({
    actor: context.user.id,
    cleanupJobId,
    eventPrefix: event,
    supabase: context.supabase
  });
}

export async function POST(request: NextRequest, routeContext: RouteContext) {
  const context = await getPublisherContext();
  if ("error" in context) {
    return context.error;
  }

  const productId = await getProductId(routeContext);
  if (!productId) {
    return NextResponse.json({ ok: false, reason: "invalid_product_id" }, { status: 400 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const expectedRevisionResult = uploadRevisionSchema.safeParse(
    formData?.get("expectedRevision")
  );
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, reason: "missing_file" }, { status: 400 });
  }
  if (!expectedRevisionResult.success) {
    return NextResponse.json(
      { ok: false, reason: "invalid_product_asset_revision" },
      { status: 400 }
    );
  }

  const validation = await validateProductAssetFile(file);
  if (!validation.ok) {
    return NextResponse.json(
      { ok: false, reason: validation.reason },
      { status: 400 }
    );
  }

  const productResult = await context.supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .maybeSingle();

  if (productResult.error) {
    await reportOperationalError("admin.product_asset.product_lookup_failed", productResult.error, {
      productId
    });
    return NextResponse.json(
      { ok: false, reason: "product_lookup_failed" },
      { status: 500 }
    );
  }
  if (!productResult.data) {
    return NextResponse.json({ ok: false, reason: "product_not_found" }, { status: 404 });
  }
  const storagePath = `${productId}/${randomUUID()}.${validation.extension}`;
  const { data: uploadCleanupJobId, error: prepareError } = await context.supabase.rpc(
    "prepare_product_asset_upload",
    {
      p_product_id: productId,
      p_storage_path: storagePath
    }
  );
  if (prepareError || !uploadCleanupJobId) {
    await reportOperationalError("admin.product_asset.upload_prepare_failed", prepareError, {
      productId,
      storagePath
    });
    return NextResponse.json(
      { ok: false, reason: "product_asset_prepare_failed" },
      { status: 500 }
    );
  }

  const { data: upload, error: uploadError } = await context.supabase.storage
    .from(PRODUCT_FILES_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "0",
      contentType: file.type,
      upsert: false
    });

  if (uploadError || !upload) {
    await removeStoredObject(
      context,
      storagePath,
      "admin.product_asset.failed_upload_cleanup_failed",
      productId,
      uploadCleanupJobId
    );
    await reportOperationalError("admin.product_asset.upload_failed", uploadError, {
      productId
    });
    return NextResponse.json(
      { ok: false, reason: "product_asset_upload_failed" },
      { status: 500 }
    );
  }

  const expectedRevision =
    expectedRevisionResult.data === "none" ? null : expectedRevisionResult.data;
  const { data: asset, error: assetError } = await context.supabase
    .rpc("replace_product_asset", {
      p_content_type: file.type,
      p_original_filename: validation.fileName,
      p_product_id: productId,
      p_size_bytes: file.size,
      p_storage_path: upload.path,
      p_upload_cleanup_job_id: uploadCleanupJobId,
      ...(expectedRevision === null ? {} : { p_expected_revision: expectedRevision })
    })
    .single();

  if (assetError || !asset) {
    await removeStoredObject(
      context,
      upload.path,
      "admin.product_asset.failed_upload_cleanup_failed",
      productId,
      uploadCleanupJobId
    );
    const conflict = assetConflictResponse(assetError);
    if (conflict) {
      return conflict;
    }
    await reportOperationalError("admin.product_asset.metadata_write_failed", assetError, {
      expectedRevision,
      productId
    });
    return NextResponse.json(
      { ok: false, reason: "product_asset_save_failed" },
      { status: 500 }
    );
  }

  const previousPath = asset.previous_storage_path;
  if (previousPath && asset.cleanup_job_id && previousPath !== upload.path) {
    await removeStoredObject(
      context,
      previousPath,
      "admin.product_asset.old_file_cleanup_failed",
      productId,
      asset.cleanup_job_id
    );
  }

  return NextResponse.json({
    ok: true,
    item: {
      fileName: asset.original_filename,
      id: asset.id,
      revision: asset.revision,
      sizeBytes: asset.size_bytes
    }
  });
}

export async function DELETE(request: NextRequest, routeContext: RouteContext) {
  const context = await getPublisherContext();
  if ("error" in context) {
    return context.error;
  }

  const productId = await getProductId(routeContext);
  if (!productId) {
    return NextResponse.json({ ok: false, reason: "invalid_product_id" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = deletePayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, reason: "invalid_product_asset_revision" },
      { status: 400 }
    );
  }

  const { data: deletedAsset, error: deleteError } = await context.supabase
    .rpc("delete_product_asset", {
      p_expected_revision: parsed.data.expectedRevision,
      p_product_id: productId
    })
    .single();
  if (deleteError || !deletedAsset) {
    const conflict = assetConflictResponse(deleteError);
    if (conflict) {
      return conflict;
    }
    await reportOperationalError("admin.product_asset.metadata_delete_failed", deleteError, {
      expectedRevision: parsed.data.expectedRevision,
      productId
    });
    return NextResponse.json(
      { ok: false, reason: "product_asset_delete_failed" },
      { status: 500 }
    );
  }

  await removeStoredObject(
    context,
    deletedAsset.storage_path,
    "admin.product_asset.file_cleanup_failed",
    productId,
    deletedAsset.cleanup_job_id
  );

  return NextResponse.json({ ok: true, productDeactivated: true });
}
