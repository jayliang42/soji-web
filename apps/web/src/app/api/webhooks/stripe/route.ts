import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getStripeClient } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const stripe = getStripeClient();
  const signature = (await headers()).get("stripe-signature");

  if (!stripe || !env.STRIPE_WEBHOOK_SECRET || !signature) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 501 });
  }

  const payload = await request.text();
  const event = stripe.webhooks.constructEvent(
    payload,
    signature,
    env.STRIPE_WEBHOOK_SECRET
  );

  return NextResponse.json({
    received: true,
    type: event.type,
    note: "Persist billing events and entitlement updates here."
  });
}
