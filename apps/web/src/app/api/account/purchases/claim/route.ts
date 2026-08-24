import { NextRequest, NextResponse } from "next/server";
import {
  claimGuestMembershipCheckout,
  getGuestCheckoutBrowser,
  getGuestCheckoutRequestId
} from "@/lib/guest-membership-checkout";
import { reportOperationalError } from "@/lib/observability";
import { isMissingAuthSession } from "@/lib/supabase/auth-errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Purchase claiming is temporarily unavailable." },
      { status: 503 }
    );
  }

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError && !isMissingAuthSession(authError)) {
    await reportOperationalError("stripe.checkout.claim_auth_lookup_failed", authError);
    return NextResponse.json(
      { error: "Authentication is temporarily unavailable." },
      { status: 503 }
    );
  }
  if (!user) {
    return NextResponse.json(
      { error: "Sign in before claiming a purchase." },
      { status: 401 }
    );
  }
  if (!user.email || !user.email_confirmed_at) {
    return NextResponse.json(
      { error: "A verified account email is required." },
      { status: 403 }
    );
  }

  const browser = getGuestCheckoutBrowser(request);
  const claim = await claimGuestMembershipCheckout({
    browserHmac: browser?.browserHmac ?? null,
    email: user.email,
    requestId: getGuestCheckoutRequestId(request),
    userId: user.id
  });
  if (!claim.ok) {
    await reportOperationalError(
      "stripe.checkout.guest_claim_failed",
      new Error(claim.reason),
      { userId: user.id }
    );
    return NextResponse.json(
      { error: "Purchase claiming is temporarily unavailable." },
      { status: 503 }
    );
  }

  return NextResponse.json({ status: claim.status });
}
