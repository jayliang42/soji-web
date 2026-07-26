import { hasStripeWebhookConfig } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface BillingDeliveryReadiness {
  stripeWebhookConfigured: boolean;
  supabaseServiceRoleOperational: boolean;
}

const unavailableBillingDelivery: BillingDeliveryReadiness = {
  stripeWebhookConfigured: false,
  supabaseServiceRoleOperational: false
};

export const BILLING_DELIVERY_READINESS_CACHE_MS = 60_000;

let billingDeliveryCache:
  | {
      expiresAt: number;
      result: Promise<BillingDeliveryReadiness>;
    }
  | undefined;

export async function probeBillingDeliveryReadiness(): Promise<BillingDeliveryReadiness> {
  const stripeWebhookConfigured = hasStripeWebhookConfig();
  const admin = createSupabaseAdminClient();

  if (!admin) {
    return {
      ...unavailableBillingDelivery,
      stripeWebhookConfigured
    };
  }

  try {
    const { data, error } = await admin.rpc("service_role_readiness");
    return {
      stripeWebhookConfigured,
      supabaseServiceRoleOperational: !error && data === true
    };
  } catch {
    return {
      stripeWebhookConfigured,
      supabaseServiceRoleOperational: false
    };
  }
}

export function getBillingDeliveryReadiness(now = Date.now()) {
  if (billingDeliveryCache && billingDeliveryCache.expiresAt > now) {
    return billingDeliveryCache.result;
  }

  const result = probeBillingDeliveryReadiness();
  billingDeliveryCache = {
    expiresAt: now + BILLING_DELIVERY_READINESS_CACHE_MS,
    result
  };
  return result;
}

export function isBillingDeliveryReady(readiness: BillingDeliveryReadiness) {
  return (
    readiness.stripeWebhookConfigured &&
    readiness.supabaseServiceRoleOperational
  );
}
