import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { getStripeClient } from "@/lib/stripe";

const payloadSchema = z.object({
  lookupKey: z.string(),
  customerEmail: z.string().email()
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured yet." },
      { status: 501 }
    );
  }

  const prices = await stripe.prices.list({
    lookup_keys: [parsed.data.lookupKey],
    active: true,
    limit: 1,
    expand: ["data.product"]
  });
  const price = prices.data[0];

  if (!price) {
    return NextResponse.json(
      { error: `No active Stripe price found for lookup key "${parsed.data.lookupKey}".` },
      { status: 404 }
    );
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: parsed.data.customerEmail,
    line_items: [{ price: price.id, quantity: 1 }],
    success_url: `${env.SITE_URL}/account?checkout=success`,
    cancel_url: `${env.SITE_URL}/pricing?checkout=cancelled`,
    metadata: {
      price_lookup_key: parsed.data.lookupKey
    }
  });

  return NextResponse.json({ url: session.url });
}
