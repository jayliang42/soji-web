import Stripe from "stripe";
import { env } from "./env";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  if (!env.STRIPE_SECRET_KEY) {
    return null;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-08-27.basil",
      maxNetworkRetries: 1,
      timeout: 10_000
    });
  }

  return stripeClient;
}
