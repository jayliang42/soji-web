import type { ProductOffer } from "@soji/types";
import type {
  LaunchInputState,
  OperationalReadiness
} from "@/lib/readiness";

export type LaunchChecklistStatus =
  | "invalid"
  | "manual"
  | "missing"
  | "needs_owner_input"
  | "ready";

export interface LaunchChecklistItem {
  detail: string;
  label: string;
  status: LaunchChecklistStatus;
}

export interface LaunchChecklistConfig {
  cronSecret: boolean;
  demoModeDisabled: boolean;
  operationsAlerts: boolean;
  productionSiteUrl: boolean;
  stripeCheckout: boolean;
  stripeWebhook: boolean;
  supabasePublic: boolean;
  supabaseServiceRole: boolean;
}

function launchInputStatus(state: LaunchInputState): LaunchChecklistStatus {
  return state;
}

export function buildLaunchChecklist({
  canInspectBilling,
  config,
  isDemoPreview,
  operationalReadiness,
  products
}: {
  canInspectBilling: boolean;
  config: LaunchChecklistConfig;
  isDemoPreview: boolean;
  operationalReadiness: OperationalReadiness;
  products: ProductOffer[];
}): LaunchChecklistItem[] {
  const activeProducts = products.filter((product) => product.isActive !== false);
  const activeProductsMissingPrice = activeProducts.filter(
    (product) => !product.stripePriceId
  ).length;
  const activeProductsMissingDelivery = activeProducts.filter(
    (product) => !product.deliveryAsset
  ).length;
  const hasVerifiedAdmin = canInspectBilling && !isDemoPreview;

  return [
    {
      detail: "Keep SOJI_DEMO_MODE unset or false in production.",
      label: "Production demo mode disabled",
      status: config.demoModeDisabled ? "ready" : "missing"
    },
    {
      detail: "Set NEXT_PUBLIC_SITE_URL to the deployed HTTPS origin without a path or query.",
      label: "Production site URL",
      status: config.productionSiteUrl ? "ready" : "missing"
    },
    {
      detail: operationalReadiness.supabasePublicOperational
        ? "Public Supabase configuration passed a live plans query."
        : "Set the public Supabase variables and verify the plans query succeeds.",
      label: "Supabase public auth",
      status:
        config.supabasePublic && operationalReadiness.supabasePublicOperational
          ? "ready"
          : "missing"
    },
    {
      detail: operationalReadiness.supabaseServiceRoleOperational
        ? "Service-role table and billing privileges passed the live readiness RPC."
        : "Set the service-role key and apply the required table/RPC grants.",
      label: "Supabase service role",
      status:
        config.supabaseServiceRole &&
        operationalReadiness.supabaseServiceRoleOperational
          ? "ready"
          : "missing"
    },
    {
      detail: "Set STRIPE_SECRET_KEY before subscription or product checkout can open.",
      label: "Stripe checkout",
      status: config.stripeCheckout ? "ready" : "missing"
    },
    {
      detail: "Set STRIPE_WEBHOOK_SECRET and point Stripe to /api/webhooks/stripe.",
      label: "Stripe webhook",
      status: config.stripeWebhook ? "ready" : "missing"
    },
    {
      detail: isDemoPreview
        ? "Demo access does not prove that a production Admin account exists."
        : hasVerifiedAdmin
          ? "The current signed-in account has the Admin role."
          : "Run publisher-setup.sql once for the first Admin, then use the Users workspace.",
      label: "First production Admin",
      status: hasVerifiedAdmin ? "ready" : "missing"
    },
    {
      detail: "Run schema.sql to create the public content-media bucket and editor upload policies.",
      label: "Content media storage",
      status: "manual"
    },
    {
      detail: isDemoPreview
        ? "Demo billing rows do not verify production billing-event access."
        : hasVerifiedAdmin
          ? "The current Admin account can open the Billing workspace."
          : "Sign in with a production Admin account and open the Billing workspace.",
      label: "Billing event access",
      status: hasVerifiedAdmin ? "ready" : "missing"
    },
    {
      detail: "Create active Stripe prices for tier_1_monthly, tier_2_monthly, and tier_3_monthly.",
      label: "Membership Stripe prices",
      status: operationalReadiness.stripeMembershipPrices ? "ready" : "missing"
    },
    {
      detail: isDemoPreview
        ? "Verify Stripe Price IDs against the production product catalog."
        : activeProductsMissingPrice > 0
          ? `${activeProductsMissingPrice} active product(s) are missing a Stripe price ID.`
          : activeProducts.length > 0
            ? "Every active product has a Stripe price ID."
            : "Activate a product after its Stripe price is configured.",
      label: "Product Stripe price IDs",
      status: isDemoPreview
        ? "manual"
        : activeProductsMissingPrice > 0
          ? "missing"
          : activeProducts.length > 0
            ? "ready"
            : "manual"
    },
    {
      detail: isDemoPreview
        ? "Verify private delivery files against the production product catalog."
        : activeProductsMissingDelivery > 0
          ? `${activeProductsMissingDelivery} active product(s) are missing a private delivery file.`
          : activeProducts.length > 0
            ? "Every active product has a private delivery file."
            : "Upload a private delivery file before activating a product.",
      label: "Product delivery assets",
      status: isDemoPreview
        ? "manual"
        : activeProductsMissingDelivery > 0
          ? "missing"
          : activeProducts.length > 0
            ? "ready"
            : "manual"
    },
    {
      detail: operationalReadiness.launchContentOperational
        ? `${operationalReadiness.launchContentCount} owned flagship item passed content and access checks.`
        : "Publish the flagship with an owned cover, preview, body, tags, and content.basic access rule.",
      label: "Flagship launch content",
      status: operationalReadiness.launchContentOperational
        ? "ready"
        : "invalid"
    },
    {
      detail:
        operationalReadiness.officeHourSignupState === "ready"
          ? `${operationalReadiness.officeHourSignupCount} valid signup destination(s) passed validation.`
          : operationalReadiness.officeHourSignupState === "invalid"
            ? "Replace malformed or placeholder signup destinations in Admin → Office Hours."
            : "Provide a real signup destination in Admin → Office Hours.",
      label: "Office Hours signup destination",
      status: launchInputStatus(
        operationalReadiness.officeHourSignupState
      )
    },
    {
      detail:
        operationalReadiness.officeHourReplayState === "ready"
          ? `${operationalReadiness.officeHourReplayCount} valid replay destination(s) passed validation.`
          : operationalReadiness.officeHourReplayState === "invalid"
            ? "Replace malformed or placeholder replay destinations in Admin → Office Hours."
            : "Provide a real replay destination in Admin → Office Hours.",
      label: "Office Hours replay destination",
      status: launchInputStatus(
        operationalReadiness.officeHourReplayState
      )
    },
    {
      detail:
        operationalReadiness.supportContactState === "ready"
          ? "The public support destination passed production validation."
          : operationalReadiness.supportContactState === "invalid"
            ? "Replace NEXT_PUBLIC_SUPPORT_URL with a safe non-placeholder HTTPS or mailto destination."
            : "Set NEXT_PUBLIC_SUPPORT_URL to the durable support destination.",
      label: "Customer support destination",
      status: launchInputStatus(
        operationalReadiness.supportContactState
      )
    },
    {
      detail:
        operationalReadiness.policiesApprovalState === "ready"
          ? "The owner approval flag is explicitly enabled."
          : operationalReadiness.policiesApprovalState === "invalid"
            ? "Set SOJI_POLICIES_APPROVED to true only after owner/legal review; remove unsupported values."
            : "Complete owner/legal review, then set SOJI_POLICIES_APPROVED=true.",
      label: "Customer policies approved",
      status: launchInputStatus(
        operationalReadiness.policiesApprovalState
      )
    },
    {
      detail:
        operationalReadiness.stripeTermsAcceptanceState === "ready"
          ? "Stripe-hosted Terms acceptance is explicitly marked ready."
          : operationalReadiness.stripeTermsAcceptanceState === "invalid"
            ? "Confirm Stripe Dashboard Terms configuration, then set STRIPE_TERMS_ACCEPTANCE_READY=true; remove unsupported values."
            : "Configure canonical policy links and Terms acceptance in Stripe, then set STRIPE_TERMS_ACCEPTANCE_READY=true.",
      label: "Stripe Terms acceptance",
      status: launchInputStatus(
        operationalReadiness.stripeTermsAcceptanceState
      )
    },
    {
      detail: config.operationsAlerts
        ? "A valid alert webhook is configured. Verify delivery from the deployed environment before launch."
        : "Set a valid HTTPS OPS_ALERT_WEBHOOK_URL to forward structured payment failures.",
      label: "Operations failure alerts",
      status: config.operationsAlerts ? "ready" : "manual"
    },
    {
      detail: "Set a 32+ character CRON_SECRET so scheduled private-file cleanup can authenticate.",
      label: "Scheduled file cleanup",
      status:
        config.cronSecret && operationalReadiness.supabaseServiceRoleOperational
          ? "ready"
          : "missing"
    }
  ];
}
