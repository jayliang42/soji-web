import type { NextRequest, NextResponse } from "next/server";
import type { MembershipTier } from "@soji/types";
import { env } from "@/lib/env";
import {
  getGuestCheckoutBrowserHmac,
  getGuestCheckoutEmailHmac,
  getGuestCheckoutNetworkHmac,
  guestCheckoutBrowserCookieName,
  guestCheckoutRequestCookieName,
  resolveGuestCheckoutBrowserId
} from "@/lib/guest-checkout-identity";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function getRpcClient() {
  return createSupabaseAdminClient();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getSingleRow(data: unknown) {
  return Array.isArray(data) && data.length === 1 && isRecord(data[0])
    ? data[0]
    : null;
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

export function getGuestCheckoutBrowser(request: NextRequest) {
  const { browserId } = resolveGuestCheckoutBrowserId(
    request.cookies.get(guestCheckoutBrowserCookieName)?.value
  );
  const browserHmac = getGuestCheckoutBrowserHmac(
    browserId,
    env.GUEST_CHECKOUT_HMAC_SECRET
  );

  return browserHmac ? { browserHmac, browserId } : null;
}

export function getGuestCheckoutNetwork(request: NextRequest) {
  const address =
    process.env.VERCEL === "1"
      ? request.headers.get("x-vercel-forwarded-for")
      : process.env.NODE_ENV === "production"
        ? null
        : request.headers.get("x-forwarded-for");
  return getGuestCheckoutNetworkHmac(
    address,
    env.GUEST_CHECKOUT_HMAC_SECRET
  );
}

export function setGuestCheckoutBrowserCookie(
  response: NextResponse,
  browserId: string,
  requestId?: string
) {
  response.cookies.set({
    httpOnly: true,
    maxAge: 24 * 60 * 60,
    name: guestCheckoutBrowserCookieName,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    value: browserId
  });
  if (requestId) {
    response.cookies.set({
      httpOnly: true,
      maxAge: 24 * 60 * 60,
      name: guestCheckoutRequestCookieName,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      value: requestId
    });
  }
}

export function getGuestCheckoutRequestId(request: NextRequest) {
  const value = request.cookies.get(guestCheckoutRequestCookieName)?.value;
  return value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
    ? value
    : null;
}

export async function consumeGuestMembershipCheckoutRateLimit(
  browserHmac: string,
  networkHmac: string
) {
  const supabase = getRpcClient();
  if (!supabase) {
    return { ok: false, reason: "supabase_service_role_not_configured" } as const;
  }

  const { data, error } = await supabase.rpc(
    "consume_guest_full_access_checkout_rate_limit",
    {
      p_browser_hmac: browserHmac,
      p_network_hmac: networkHmac
    }
  );
  const row = getSingleRow(data);
  if (
    error ||
    !row ||
    typeof row.allowed !== "boolean" ||
    typeof row.remaining !== "number" ||
    typeof row.reset_at !== "string"
  ) {
    return {
      ok: false,
      reason: error?.message ?? "guest_checkout_rate_limit_invalid"
    } as const;
  }

  return {
    allowed: row.allowed,
    ok: true,
    remaining: row.remaining,
    resetAt: row.reset_at
  } as const;
}

export async function reserveGuestMembershipCheckout({
  browserHmac,
  requestId
}: {
  browserHmac: string;
  planId: MembershipTier;
  requestId: string;
}) {
  const supabase = getRpcClient();
  if (!supabase) {
    return { ok: false, reason: "supabase_service_role_not_configured" } as const;
  }

  const { data, error } = await supabase.rpc(
    "reserve_guest_full_access_checkout",
    {
      p_browser_hmac: browserHmac,
      p_request_id: requestId
    }
  );
  const row = getSingleRow(data);
  if (
    error ||
    !row ||
    (row.outcome !== "reserved" && row.outcome !== "existing") ||
    !isUuid(row.checkout_id) ||
    row.expected_amount_cents !== 9_900 ||
    row.expected_currency !== "usd" ||
    typeof row.stripe_expires_at !== "string" ||
    !Number.isFinite(Date.parse(row.stripe_expires_at))
  ) {
    return {
      ok: false,
      reason: error?.message ?? "guest_checkout_reservation_invalid"
    } as const;
  }

  return {
    checkoutId: row.checkout_id,
    expiresAt: row.stripe_expires_at,
    ok: true,
    outcome: row.outcome
  } as const;
}

export async function attachGuestMembershipCheckoutSession({
  browserHmac,
  checkoutId,
  checkoutSessionId,
  requestId,
  stripeExpiresAt
}: {
  browserHmac: string;
  checkoutId: string;
  checkoutSessionId: string;
  requestId: string;
  stripeExpiresAt: string;
}) {
  const supabase = getRpcClient();
  if (!supabase) {
    return { ok: false, reason: "supabase_service_role_not_configured" } as const;
  }

  const { data, error } = await supabase.rpc(
    "attach_guest_full_access_checkout",
    {
      p_browser_hmac: browserHmac,
      p_request_id: requestId,
      p_stripe_checkout_session_id: checkoutSessionId,
      p_stripe_expires_at: stripeExpiresAt
    }
  );
  const row = getSingleRow(data);
  if (
    error ||
    !row ||
    (row.outcome !== "attached" && row.outcome !== "existing") ||
    row.checkout_id !== checkoutId
  ) {
    return {
      ok: false,
      reason: error?.message ?? "guest_checkout_attachment_invalid"
    } as const;
  }

  return { ok: true, outcome: row.outcome } as const;
}

export async function claimGuestMembershipCheckout({
  browserHmac,
  email,
  requestId,
  userId
}: {
  browserHmac: string | null;
  email: string;
  requestId: string | null;
  userId: string;
}) {
  const verifiedEmailHmac = getGuestCheckoutEmailHmac(
    email,
    env.GUEST_CHECKOUT_HMAC_SECRET
  );
  const supabase = getRpcClient();
  if (!supabase || !verifiedEmailHmac) {
    return { ok: false, reason: "guest_checkout_claim_not_configured" } as const;
  }

  const { data, error } = await supabase.rpc(
    "claim_guest_full_access_checkout",
    {
      p_browser_hmac: browserHmac ?? undefined,
      p_request_id: requestId ?? undefined,
      p_user_id: userId,
      p_verified_email_hmac: verifiedEmailHmac
    }
  );
  const row = getSingleRow(data);
  if (
    error ||
    !row ||
    (row.outcome !== "claimed" &&
      row.outcome !== "processing" &&
      row.outcome !== "email_mismatch" &&
      row.outcome !== "invalid")
  ) {
    return {
      ok: false,
      reason: error?.message ?? "guest_checkout_claim_invalid"
    } as const;
  }

  return { ok: true, status: row.outcome } as const;
}

export async function recordGuestMembershipPayment({
  amountTotal,
  currency,
  email,
  observedAt,
  paymentId,
  paymentStatus,
  sessionId
}: {
  amountTotal: number;
  currency: string;
  email: string | null;
  observedAt: string;
  paymentId: string;
  paymentStatus: "no_payment_required" | "paid";
  sessionId: string;
}) {
  const emailHmac = getGuestCheckoutEmailHmac(
    email,
    env.GUEST_CHECKOUT_HMAC_SECRET
  );
  const supabase = getRpcClient();
  if (!supabase || !emailHmac) {
    return { ok: false, reason: "guest_checkout_payment_not_configured" } as const;
  }

  const { data, error } = await supabase.rpc(
    "record_stripe_guest_full_access_payment",
    {
      p_amount_total: amountTotal,
      p_currency: currency,
      p_email_hmac: emailHmac,
      p_observed_at: observedAt,
      p_payment_status: paymentStatus,
      p_provider_payment_id: paymentId,
      p_stripe_checkout_session_id: sessionId
    }
  );
  if (
    error ||
    (data !== "paid_unclaimed" &&
      data !== "claimed" &&
      data !== "refunded" &&
      data !== "disputed")
  ) {
    return {
      ok: false,
      reason: error?.message ?? "guest_checkout_payment_record_invalid"
    } as const;
  }

  return { ok: true, status: data } as const;
}

export async function syncGuestMembershipRefund({
  guestCheckoutId,
  observedAt,
  paymentId,
  status
}: {
  guestCheckoutId: string;
  observedAt: string;
  paymentId: string;
  status: "partially_refunded" | "refunded";
}) {
  const supabase = getRpcClient();
  if (!supabase) {
    return { ok: false, reason: "supabase_service_role_not_configured" } as const;
  }

  const { data, error } = await supabase.rpc(
    "sync_stripe_guest_full_access_refund",
    {
      p_guest_checkout_id: guestCheckoutId,
      p_observed_at: observedAt,
      p_provider_payment_id: paymentId,
      p_status: status
    }
  );
  const row = getSingleRow(data);
  if (error || !row || typeof row.outcome !== "string") {
    return {
      ok: false,
      reason: error?.message ?? "guest_checkout_refund_sync_invalid"
    } as const;
  }

  return { ok: true, outcome: row.outcome } as const;
}

export async function syncGuestMembershipDispute({
  disputeId,
  guestCheckoutId,
  observedAt,
  paymentId,
  status
}: {
  disputeId: string;
  guestCheckoutId: string;
  observedAt: string;
  paymentId: string;
  status: string;
}) {
  const supabase = getRpcClient();
  if (!supabase) {
    return { ok: false, reason: "supabase_service_role_not_configured" } as const;
  }

  const { data, error } = await supabase.rpc(
    "sync_stripe_guest_full_access_dispute",
    {
      p_guest_checkout_id: guestCheckoutId,
      p_observed_at: observedAt,
      p_provider_dispute_id: disputeId,
      p_provider_payment_id: paymentId,
      p_status: status
    }
  );
  const row = getSingleRow(data);
  if (error || !row || typeof row.outcome !== "string") {
    return {
      ok: false,
      reason: error?.message ?? "guest_checkout_dispute_sync_invalid"
    } as const;
  }

  return { ok: true, outcome: row.outcome } as const;
}

export async function closeGuestMembershipCheckoutBySession({
  observedAt,
  reason,
  sessionId
}: {
  observedAt: string;
  reason: "cancelled" | "expired";
  sessionId: string;
}) {
  const supabase = getRpcClient();
  if (!supabase) {
    return { ok: false, reason: "supabase_service_role_not_configured" } as const;
  }

  const { data, error } = await supabase.rpc(
    "close_guest_full_access_checkout",
    {
      p_browser_hmac: undefined,
      p_observed_at: observedAt,
      p_reason: reason,
      p_request_id: undefined,
      p_stripe_checkout_session_id: sessionId
    }
  );
  if (error || typeof data !== "string") {
    return {
      ok: false,
      reason: error?.message ?? "guest_checkout_close_invalid"
    } as const;
  }

  return { ok: true, status: data } as const;
}

export async function getGuestMembershipCheckoutForCancel({
  browserHmac,
  requestId
}: {
  browserHmac: string;
  requestId: string;
}) {
  const supabase = getRpcClient();
  if (!supabase) {
    return { ok: false, reason: "supabase_service_role_not_configured" } as const;
  }

  const { data, error } = await supabase.rpc(
    "get_guest_full_access_checkout_for_cancel",
    {
      p_browser_hmac: browserHmac,
      p_request_id: requestId
    }
  );
  const row = getSingleRow(data);
  if (
    error ||
    !row ||
    !isUuid(row.checkout_id) ||
    typeof row.stripe_checkout_session_id !== "string" ||
    row.status !== "created" ||
    typeof row.stripe_expires_at !== "string"
  ) {
    return {
      ok: false,
      reason: error?.message ?? "guest_checkout_cancel_lookup_invalid"
    } as const;
  }

  return {
    checkoutId: row.checkout_id,
    expiresAt: row.stripe_expires_at,
    ok: true,
    sessionId: row.stripe_checkout_session_id,
    status: row.status
  } as const;
}

export async function closeGuestMembershipCheckout({
  browserHmac,
  observedAt,
  reason,
  requestId
}: {
  browserHmac: string;
  observedAt: string;
  reason: "cancelled" | "expired";
  requestId: string;
}) {
  const supabase = getRpcClient();
  if (!supabase) {
    return { ok: false, reason: "supabase_service_role_not_configured" } as const;
  }

  const { data, error } = await supabase.rpc(
    "close_guest_full_access_checkout",
    {
      p_browser_hmac: browserHmac,
      p_observed_at: observedAt,
      p_reason: reason,
      p_request_id: requestId
    }
  );
  if (error || typeof data !== "string") {
    return {
      ok: false,
      reason: error?.message ?? "guest_checkout_close_invalid"
    } as const;
  }

  return { ok: true, status: data } as const;
}
