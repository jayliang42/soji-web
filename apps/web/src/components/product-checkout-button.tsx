"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { shouldRotateCheckoutRequestId } from "@/lib/checkout";

type CheckoutResponse = {
  url?: string;
  error?: string | Record<string, unknown>;
};

function getErrorMessage(error: CheckoutResponse["error"]) {
  if (!error) {
    return "Checkout failed.";
  }

  if (typeof error === "string") {
    return error;
  }

  return "Checkout failed. Please try again.";
}

export function ProductCheckoutButton({
  accessPaused,
  alreadyPurchased,
  checkoutEnabled,
  customerEmail,
  nextPath = "/products",
  purchaseStateAvailable,
  productSlug
}: {
  accessPaused: boolean;
  alreadyPurchased: boolean;
  checkoutEnabled: boolean;
  customerEmail: string | null;
  nextPath?: string;
  purchaseStateAvailable: boolean;
  productSlug: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const requestIdRef = useRef<string | null>(null);

  if (!customerEmail) {
    return (
      <Link
        href={{ pathname: "/login", query: { next: nextPath } }}
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-cocoa px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-charcoal"
      >
        Create account to buy
      </Link>
    );
  }

  if (!purchaseStateAvailable) {
    return (
      <div className="grid gap-2">
        <button
          type="button"
          disabled
          className="inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-md border border-dune bg-cream px-5 py-3 text-sm font-bold text-cocoa/60"
        >
          Purchase status unavailable
        </button>
        <p className="max-w-xs text-xs font-medium text-cocoa/65">
          We cannot safely confirm your purchase history. Try again before buying this item.
        </p>
      </div>
    );
  }

  if (alreadyPurchased) {
    return (
      <Link
        href="/account#purchases-heading"
        className="inline-flex min-h-11 items-center justify-center rounded-md border border-cocoa px-5 py-3 text-sm font-bold text-cocoa transition-colors hover:bg-cocoa hover:text-white"
      >
        {accessPaused ? "Review purchase" : "Access purchase"}
      </Link>
    );
  }

  if (!checkoutEnabled) {
    return (
      <div className="grid gap-2">
        <button
          type="button"
          disabled
          className="inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-md border border-dune bg-cream px-5 py-3 text-sm font-bold text-cocoa/60"
        >
          Checkout unavailable
        </button>
        <p className="max-w-xs text-xs font-medium text-cocoa/65">
          Billing is temporarily unavailable. No payment can be started.
        </p>
      </div>
    );
  }

  function startCheckout() {
    startTransition(async () => {
      try {
        setMessage(null);
        const requestId = requestIdRef.current ?? crypto.randomUUID();
        requestIdRef.current = requestId;
        const response = await fetch("/api/checkout/product", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            productSlug,
            requestId
          })
        });

        const payload = (await response.json().catch(() => null)) as CheckoutResponse | null;

        if (!response.ok || !payload?.url) {
          if (shouldRotateCheckoutRequestId(response.status)) {
            requestIdRef.current = null;
          }
          throw new Error(getErrorMessage(payload?.error));
        }

        window.location.assign(payload.url);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Checkout failed.");
      }
    });
  }

  return (
    <div className="grid gap-3">
      <button
        type="button"
        onClick={startCheckout}
        disabled={isPending}
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-cocoa px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-charcoal disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Opening checkout..." : "Buy once"}
      </button>
      {message ? (
        <p aria-live="polite" className="text-sm font-medium text-clay">
          {message}
        </p>
      ) : null}
    </div>
  );
}
