import { officeHourSessions } from "@soji/domain";
import type { EntitlementKey, OfficeHourSession, OfficeHourSnapshot } from "@soji/types";
import {
  resolveDataSnapshot,
  type LiveDataSnapshot
} from "@/lib/data-source";
import { isDemoModeEnabled } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type OfficeHourRow = Pick<
  Tables<"office_hour_sessions">,
  | "id"
  | "replay_url"
  | "revision"
  | "required_entitlement_id"
  | "signup_url"
  | "starts_at"
  | "title"
  | "updated_at"
>;

function mapOfficeHourRow(row: OfficeHourRow): OfficeHourSession {
  return {
    id: row.id,
    title: row.title,
    startsAt: row.starts_at,
    signupUrl: row.signup_url,
    replayUrl: row.replay_url ?? undefined,
    revision: row.revision,
    updatedAt: row.updated_at,
    requiredEntitlements: row.required_entitlement_id
      ? [row.required_entitlement_id as EntitlementKey]
      : []
  };
}

async function loadSupabaseOfficeHours(): Promise<LiveDataSnapshot<OfficeHourSession> | null> {
  const supabase = createSupabaseAdminClient() ?? (await createSupabaseServerClient());
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("office_hour_sessions")
    .select(
      "id, title, starts_at, signup_url, replay_url, required_entitlement_id, revision, updated_at"
    )
    .order("starts_at", { ascending: true });

  if (error || !data) {
    return {
      items: [],
      source: "supabase",
      error: error?.message ?? "office_hours_query_failed"
    };
  }

  return {
    items: data.map(mapOfficeHourRow),
    source: "supabase"
  };
}

export async function getOfficeHourSnapshot(): Promise<OfficeHourSnapshot> {
  const liveSnapshot = await loadSupabaseOfficeHours();
  return resolveDataSnapshot({
    demoEnabled: isDemoModeEnabled(),
    demoItems: officeHourSessions,
    liveSnapshot,
    missingConfigurationError: "office_hours_service_not_configured"
  });
}
