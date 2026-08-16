"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import type { MembershipTier } from "@soji/types";
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

export function PlanCheckoutButton({
  accountLabel,
  checkoutEnabled,
  customerEmail,
  darkSurface = false,
  label,
  lookupKey,
  planId
}: {
  accountLabel: string;
  checkoutEnabled: boolean;
  customerEmail: string | null;
  darkSurface?: boolean;
  label: string;
  lookupKey: string | null;
  planId: MembershipTier;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const requestIdRef = useRef<string | null>(null);

  if (!customerEmail) {
    return (
      <Link
        href="/login?next=/pricing"
        className={`block w-full rounded-md px-6 py-4 text-center text-sm font-bold transition-colors ${
          darkSurface
            ? "bg-white text-cocoa hover:bg-sand"
            : "bg-cocoa text-white hover:bg-charcoal"
        }`}
      >
        {accountLabel}
      </Link>
    );
  }

  if (!checkoutEnabled) {
    return (
      <div className="grid gap-2">
        <button
          type="button"
          disabled
          className={`w-full cursor-not-allowed rounded-md border px-6 py-4 text-sm font-bold ${
            darkSurface
              ? "border-white/30 bg-white/10 text-white/60"
              : "border-dune bg-cream text-cocoa/60"
          }`}
        >
          Checkout unavailable
        </button>
        <p
          className={`text-center text-xs font-medium ${
            darkSurface ? "text-white/65" : "text-cocoa/65"
          }`}
        >
          Billing is temporarily unavailable. No payment can be started.
        </p>
      </div>
    );
  }

  function startCheckout() {
    if (!lookupKey) {
      setMessage("This plan is missing a Stripe price lookup key.");
      return;
    }

    startTransition(async () => {
      try {
        setMessage(null);
        const requestId = requestIdRef.current ?? crypto.randomUUID();
        requestIdRef.current = requestId;
        const response = await fetch("/api/checkout/subscription", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            planId,
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
        className={`w-full rounded-md px-6 py-4 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          darkSurface
            ? "bg-white text-cocoa hover:bg-sand"
            : "bg-cocoa text-white hover:bg-charcoal"
        }`}
      >
        {isPending ? "Opening checkout..." : label}
      </button>
      {message ? (
        <p
          aria-live="polite"
          className={`text-sm font-medium ${
            darkSurface ? "text-white/80" : "text-clay"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
