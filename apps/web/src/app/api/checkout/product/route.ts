import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { getStripeClient } from "@/lib/stripe";

const payloadSchema = z.object({
  priceId: z.string(),
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

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: parsed.data.customerEmail,
    line_items: [{ price: parsed.data.priceId, quantity: 1 }],
    success_url: `${env.SITE_URL}/account?purchase=success`,
    cancel_url: `${env.SITE_URL}/pricing?purchase=cancelled`
  });

  return NextResponse.json({ url: session.url });
}
