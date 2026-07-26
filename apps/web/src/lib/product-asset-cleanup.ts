import type {
  ProductAssetCleanupJob,
  ProductAssetCleanupSnapshot
} from "@soji/types";
import type { AppSupabaseClient } from "@/lib/supabase/client-types";
import type { Tables } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { reportOperationalError } from "@/lib/observability";
import { PRODUCT_FILES_BUCKET } from "@/lib/product-asset-validation";

type CleanupRow = Pick<
  Tables<"product_asset_cleanup_jobs">,
  | "attempt_count"
  | "claimed_at"
  | "created_at"
  | "id"
  | "last_attempted_at"
  | "last_error"
  | "not_before"
  | "product_id"
  | "reason"
  | "status"
  | "storage_path"
>;

const cleanupProjection =
  "id, product_id, storage_path, reason, status, not_before, attempt_count, claimed_at, last_attempted_at, last_error, created_at";

type ClaimedCleanupJob = Pick<
  Tables<"product_asset_cleanup_jobs">,
  "id" | "product_id" | "storage_path"
> & { claim_token: string };

const CLEANUP_STORAGE_CONCURRENCY = 5;

function mapCleanupJob(row: CleanupRow): ProductAssetCleanupJob {
  return {
    attemptCount: row.attempt_count,
    claimedAt: row.claimed_at,
    createdAt: row.created_at,
    id: row.id,
    lastAttemptedAt: row.last_attempted_at,
    lastError: row.last_error,
    notBefore: row.not_before,
    productId: row.product_id,
    reason: row.reason as ProductAssetCleanupJob["reason"],
    status: row.status as ProductAssetCleanupJob["status"],
    storagePath: row.storage_path
  };
}

export async function queryProductAssetCleanupJobs(
  supabase: AppSupabaseClient
): Promise<{ error?: string; items: ProductAssetCleanupJob[] }> {
  const { data, error } = await supabase
    .from("product_asset_cleanup_jobs")
    .select(cleanupProjection)
    .in("status", ["pending", "processing", "failed"])
    .order("created_at", { ascending: true })
    .limit(50);

  if (error || !data) {
    return { error: error?.message ?? "product_asset_cleanup_query_failed", items: [] };
  }

  return { items: (data as CleanupRow[]).map(mapCleanupJob) };
}

export async function getProductAssetCleanupSnapshot(): Promise<ProductAssetCleanupSnapshot> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { items: [], source: "unavailable" };
  }

  const snapshot = await queryProductAssetCleanupJobs(supabase);
  return { ...snapshot, source: "supabase" };
}

export type ProductAssetCleanupRunResult =
  | {
      attempted: number;
      cleaned: number;
      failed: number;
      items: ProductAssetCleanupJob[];
      ok: true;
    }
  | {
      attempted: number;
      ok: false;
      reason:
        | "product_asset_cleanup_claim_failed"
        | "product_asset_cleanup_refresh_failed";
    };

async function processClaimedCleanupJob({
  actor,
  eventPrefix,
  job,
  supabase
}: {
  actor: string;
  eventPrefix: string;
  job: ClaimedCleanupJob;
  supabase: AppSupabaseClient;
}) {
  const { error: storageError } = await supabase.storage
    .from(PRODUCT_FILES_BUCKET)
    .remove([job.storage_path]);
  if (storageError) {
    await reportOperationalError(`${eventPrefix}.storage_remove_failed`, storageError, {
      actor,
      cleanupJobId: job.id,
      productId: job.product_id
    });
  }

  const { data: receipt, error: receiptError } = await supabase.rpc(
    "record_product_asset_cleanup_attempt",
    {
      p_claim_token: job.claim_token,
      p_cleanup_job_id: job.id,
      p_succeeded: !storageError,
      ...(storageError ? { p_error: "storage_cleanup_failed" } : {})
    }
  );
  if (receiptError || !receipt?.length) {
    await reportOperationalError(
      `${eventPrefix}.${receiptError ? "receipt_failed" : "lease_lost"}`,
      receiptError ?? new Error("product_asset_cleanup_lease_lost"),
      { actor, cleanupJobId: job.id }
    );
  }

  return { cleaned: !storageError && !receiptError && Boolean(receipt?.length) };
}

async function processClaimedJobs({
  actor,
  eventPrefix,
  jobs,
  supabase
}: {
  actor: string;
  eventPrefix: string;
  jobs: ClaimedCleanupJob[];
  supabase: AppSupabaseClient;
}) {
  const results = Array<{ cleaned: boolean }>(jobs.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < jobs.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await processClaimedCleanupJob({
        actor,
        eventPrefix,
        job: jobs[index],
        supabase
      });
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(jobs.length, CLEANUP_STORAGE_CONCURRENCY) },
      () => worker()
    )
  );
  return results;
}

export async function processProductAssetCleanupJob({
  actor,
  cleanupJobId,
  eventPrefix,
  supabase
}: {
  actor: string;
  cleanupJobId: string;
  eventPrefix: string;
  supabase: AppSupabaseClient;
}) {
  const { data, error } = await supabase.rpc("claim_product_asset_cleanup_jobs", {
    p_cleanup_job_id: cleanupJobId,
    p_limit: 1
  });
  const job = data?.[0] as ClaimedCleanupJob | undefined;
  if (error) {
    await reportOperationalError(`${eventPrefix}.claim_failed`, error, {
      actor,
      cleanupJobId
    });
    return { cleaned: false };
  }
  if (!job) {
    return { cleaned: false };
  }

  return processClaimedCleanupJob({ actor, eventPrefix, job, supabase });
}

export async function processDueProductAssetCleanupJobs({
  actor,
  eventPrefix,
  limit,
  supabase
}: {
  actor: string;
  eventPrefix: string;
  limit: number;
  supabase: AppSupabaseClient;
}): Promise<ProductAssetCleanupRunResult> {
  const { data, error: claimError } = await supabase.rpc(
    "claim_product_asset_cleanup_jobs",
    {
      p_limit: limit
    }
  );
  const jobs = data as ClaimedCleanupJob[] | null;

  if (claimError || !jobs) {
    await reportOperationalError(`${eventPrefix}.claim_failed`, claimError, { actor });
    return {
      attempted: 0,
      ok: false,
      reason: "product_asset_cleanup_claim_failed"
    };
  }

  const results = await processClaimedJobs({ actor, eventPrefix, jobs, supabase });

  const snapshot = await queryProductAssetCleanupJobs(supabase);
  if (snapshot.error) {
    await reportOperationalError(
      `${eventPrefix}.refresh_failed`,
      new Error(snapshot.error),
      { actor }
    );
    return {
      attempted: jobs.length,
      ok: false,
      reason: "product_asset_cleanup_refresh_failed"
    };
  }

  const cleaned = results.filter((result) => result.cleaned).length;
  return {
    attempted: jobs.length,
    cleaned,
    failed: jobs.length - cleaned,
    items: snapshot.items,
    ok: true
  };
}
