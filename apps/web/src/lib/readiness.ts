import { membershipPlans } from "@soji/domain";
import { getBillingDeliveryReadiness } from "@/lib/billing-readiness";
import { getCustomerPolicyReadiness } from "@/lib/customer-policy";
import { validateOfficeHourDestination } from "@/lib/launch-inputs";
import {
  createOperationalLog,
  logOperationalEvent
} from "@/lib/observability";
import { getStripeClient } from "@/lib/stripe";
import { validateStripeMembershipCatalog } from "@/lib/stripe-price-validation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LaunchInputState = "invalid" | "needs_owner_input" | "ready";

export interface OperationalReadiness {
  launchContentCount: number;
  launchContentOperational: boolean;
  officeHourReplayCount: number;
  officeHourReplayState: LaunchInputState;
  officeHourSignupCount: number;
  officeHourSignupState: LaunchInputState;
  officeHoursOperational: boolean;
  policiesApprovalState: LaunchInputState;
  policiesApproved: boolean;
  stripeMembershipPrices: boolean;
  stripeTermsAcceptanceReady: boolean;
  stripeTermsAcceptanceState: LaunchInputState;
  supabasePublicOperational: boolean;
  supabaseServiceRoleOperational: boolean;
  supportContactConfigured: boolean;
  supportContactState: LaunchInputState;
}

type LaunchContentRow = {
  body_markdown: string | null;
  content_access_rules:
    | Array<{ entitlement_id: string | null }>
    | null;
  cover_image_alt: string | null;
  cover_image_url: string | null;
  id: string;
  preview_markdown: string | null;
  published_at: string | null;
  slug: string;
  tags: string[] | null;
  visibility: string;
};

type OfficeHourReadinessRow = {
  id: string;
  replay_url: string | null;
  signup_url: string;
};

type LaunchDataReadiness = Pick<
  OperationalReadiness,
  | "launchContentCount"
  | "launchContentOperational"
  | "officeHourReplayCount"
  | "officeHourReplayState"
  | "officeHourSignupCount"
  | "officeHourSignupState"
  | "officeHoursOperational"
>;

const unavailableLaunchData: LaunchDataReadiness = {
  launchContentCount: 0,
  launchContentOperational: false,
  officeHourReplayCount: 0,
  officeHourReplayState: "needs_owner_input",
  officeHourSignupCount: 0,
  officeHourSignupState: "needs_owner_input",
  officeHoursOperational: false
};

export const READINESS_CACHE_MS = 60_000;

let readinessCache:
  | {
      expiresAt: number;
      result: Promise<OperationalReadiness>;
    }
  | undefined;

function configuredInputState(
  value: string | undefined,
  ready: boolean
): LaunchInputState {
  if (ready) {
    return "ready";
  }

  return value?.trim() ? "invalid" : "needs_owner_input";
}

function isOwnedCover(value: string | null) {
  if (!value?.startsWith("/covers/") || value.includes("..")) {
    return false;
  }

  return !/example|placeholder|unsplash/iu.test(value);
}

function isLaunchFlagship(row: LaunchContentRow) {
  return (
    row.slug === "wealth-without-drift" &&
    row.visibility === "members_only" &&
    Boolean(row.published_at) &&
    isOwnedCover(row.cover_image_url) &&
    Boolean(row.cover_image_alt?.trim()) &&
    Boolean(row.preview_markdown?.trim()) &&
    Boolean(row.body_markdown?.trim()) &&
    (row.tags?.filter((tag) => tag.trim()).length ?? 0) >= 3 &&
    (row.content_access_rules?.some(
      (rule) => rule.entitlement_id === "content.basic"
    ) ??
      false)
  );
}

function destinationReadiness(values: Array<string | null | undefined>) {
  const submitted = values.filter(
    (value): value is string => typeof value === "string" && value.trim() !== ""
  );
  const validCount = submitted.filter(
    (value) => validateOfficeHourDestination(value).ok
  ).length;
  const state: LaunchInputState =
    validCount > 0
      ? "ready"
      : submitted.length > 0
        ? "invalid"
        : "needs_owner_input";

  return { count: validCount, state };
}

async function probeLaunchDataReadiness(): Promise<LaunchDataReadiness> {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return unavailableLaunchData;
  }

  try {
    const [contentResult, officeHourResult] = await Promise.all([
      admin
        .from("content_items")
        .select(
          "id, slug, visibility, body_markdown, preview_markdown, cover_image_url, cover_image_alt, tags, published_at, content_access_rules(entitlement_id)"
        ),
      admin
        .from("office_hour_sessions")
        .select("id, signup_url, replay_url")
    ]);

    if (
      contentResult.error ||
      officeHourResult.error ||
      !contentResult.data ||
      !officeHourResult.data
    ) {
      return unavailableLaunchData;
    }

    const contentRows = contentResult.data as LaunchContentRow[];
    const officeHourRows =
      officeHourResult.data as OfficeHourReadinessRow[];
    const launchContentCount = contentRows.filter(isLaunchFlagship).length;
    const signup = destinationReadiness(
      officeHourRows.map((row) => row.signup_url)
    );
    const replay = destinationReadiness(
      officeHourRows.map((row) => row.replay_url)
    );

    return {
      launchContentCount,
      launchContentOperational: launchContentCount > 0,
      officeHourReplayCount: replay.count,
      officeHourReplayState: replay.state,
      officeHourSignupCount: signup.count,
      officeHourSignupState: signup.state,
      officeHoursOperational:
        signup.state === "ready" && replay.state === "ready"
    };
  } catch {
    return unavailableLaunchData;
  }
}

export async function probeOperationalReadiness(): Promise<OperationalReadiness> {
  const [supabase, billingDelivery, launchData] = await Promise.all([
    createSupabaseServerClient(),
    getBillingDeliveryReadiness(),
    probeLaunchDataReadiness()
  ]);
  const stripe = getStripeClient();
  const policyReadiness = getCustomerPolicyReadiness();
  const supportContactConfigured = policyReadiness.supportUrl !== null;
  const policiesApproved = !policyReadiness.reasons.includes(
    "policies_not_approved"
  );
  const stripeTermsAcceptanceReady = !policyReadiness.reasons.includes(
    "stripe_terms_acceptance_not_ready"
  );
  const policyChecks = {
    policiesApprovalState: configuredInputState(
      process.env.SOJI_POLICIES_APPROVED,
      policiesApproved
    ),
    policiesApproved,
    stripeTermsAcceptanceReady,
    stripeTermsAcceptanceState: configuredInputState(
      process.env.STRIPE_TERMS_ACCEPTANCE_READY,
      stripeTermsAcceptanceReady
    ),
    supportContactConfigured,
    supportContactState: configuredInputState(
      process.env.NEXT_PUBLIC_SUPPORT_URL,
      supportContactConfigured
    )
  } satisfies Pick<
    OperationalReadiness,
    | "policiesApprovalState"
    | "policiesApproved"
    | "stripeTermsAcceptanceReady"
    | "stripeTermsAcceptanceState"
    | "supportContactConfigured"
    | "supportContactState"
  >;

  const publicProbe = supabase
    ? supabase.from("membership_plans").select("id").limit(1)
    : Promise.resolve({ error: new Error("supabase_public_not_configured") });
  const stripeProbe = stripe
    ? validateStripeMembershipCatalog({ plans: membershipPlans, stripe })
    : Promise.resolve({ ok: false as const });

  try {
    const [publicResult, stripeResult] = await Promise.all([
      publicProbe,
      stripeProbe
    ]);

    if (!stripeResult.ok) {
      logOperationalEvent(
        createOperationalLog({
          context: {
            reason:
              "reason" in stripeResult
                ? stripeResult.reason
                : "stripe_not_configured"
          },
          event: "stripe.catalog.validation_failed",
          level: "warn"
        })
      );
    }

    return {
      ...launchData,
      ...policyChecks,
      stripeMembershipPrices: stripeResult.ok,
      supabasePublicOperational: !publicResult.error,
      supabaseServiceRoleOperational:
        billingDelivery.supabaseServiceRoleOperational
    };
  } catch {
    return {
      ...unavailableLaunchData,
      ...policyChecks,
      stripeMembershipPrices: false,
      supabasePublicOperational: false,
      supabaseServiceRoleOperational: false
    };
  }
}

export function getOperationalReadiness(now = Date.now()) {
  if (readinessCache && readinessCache.expiresAt > now) {
    return readinessCache.result;
  }

  const result = probeOperationalReadiness();
  readinessCache = {
    expiresAt: now + READINESS_CACHE_MS,
    result
  };
  return result;
}
