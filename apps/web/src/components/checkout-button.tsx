"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState, useTransition } from "react";

export function CheckoutButton({
  lookupKey,
  customerEmail,
  loginHref,
  stripeConfigured,
  canCheckout
}: {
  lookupKey?: string;
  customerEmail?: string;
  loginHref: string;
  stripeConfigured: boolean;
  canCheckout: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!stripeConfigured) {
    return (
      <Link
        href={"/library" as Route}
        className="block w-full rounded-full bg-black px-6 py-4 text-center text-sm font-bold tracking-wide text-white transition-all duration-200 hover:bg-gray-800 shadow-lg"
      >
        Explore the demo
      </Link>
    );
  }

  if (!canCheckout || !customerEmail) {
    return (
      <Link
        href={loginHref as Route}
        className="block w-full rounded-full bg-black px-6 py-4 text-center text-sm font-bold tracking-wide text-white transition-all duration-200 hover:bg-gray-800 shadow-lg"
      >
        Sign in to subscribe
      </Link>
    );
  }

  async function handleCheckout() {
    if (!lookupKey) {
      setError("This plan is missing a Stripe lookup key.");
      return;
    }

    startTransition(async () => {
      try {
        setError(null);
        const response = await fetch("/api/checkout/subscription", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            lookupKey,
            customerEmail
          })
        });

        const body = (await response.json().catch(() => null)) as
          | { url?: string; error?: string }
          | null;

        if (!response.ok || !body?.url) {
          const message =
            typeof body?.error === "string" ? body.error : "Failed to start checkout.";
          throw new Error(message);
        }

        window.location.assign(body.url);
      } catch (checkoutError) {
        setError(
          checkoutError instanceof Error
            ? checkoutError.message
            : "Failed to start checkout."
        );
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleCheckout}
        disabled={isPending}
        className="block w-full rounded-full bg-black px-6 py-4 text-center text-sm font-bold tracking-wide text-white transition-all duration-200 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg"
      >
        {isPending ? "Redirecting..." : "Subscribe now"}
      </button>
      {error ? <p className="mt-3 text-sm text-clay">{error}</p> : null}
    </div>
  );
}
