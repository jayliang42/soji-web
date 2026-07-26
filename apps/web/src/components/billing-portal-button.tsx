"use client";

import { useState, useTransition } from "react";

export function BillingPortalButton({
  enabled,
  subscriptionId
}: {
  enabled: boolean;
  subscriptionId: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openPortal() {
    startTransition(async () => {
      setMessage(null);
      try {
        const response = await fetch("/api/account/billing-portal", {
          body: JSON.stringify({ subscriptionId }),
          headers: { "Content-Type": "application/json" },
          method: "POST"
        });
        const result = (await response.json().catch(() => null)) as
          | { ok?: boolean; reason?: string; url?: string }
          | null;
        if (!response.ok || !result?.ok || !result.url) {
          throw new Error(
            result?.reason === "billing_customer_not_found"
              ? "Billing management is not available for this subscription yet. Refresh Account after billing finishes syncing."
              : "Billing management is temporarily unavailable. Refresh Account and try again."
          );
        }
        window.location.assign(result.url);
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Billing management is temporarily unavailable. Refresh Account and try again."
        );
      }
    });
  }

  return (
    <div aria-busy={isPending} className="w-full md:text-right">
      <button
        className="min-h-11 w-full rounded-md border border-cocoa px-5 py-3 text-sm font-semibold text-cocoa disabled:opacity-50 md:w-auto"
        disabled={!enabled || isPending}
        onClick={openPortal}
        type="button"
      >
        {!enabled
          ? "Billing unavailable"
          : isPending
            ? "Opening billing…"
            : "Manage billing"}
      </button>
      {!enabled ? (
        <p className="mt-2 max-w-xs text-sm text-cocoa/65">
          Changes are paused until secure billing updates can be recorded.
          Refresh Account and try again later.
        </p>
      ) : (
        <p className="mt-2 max-w-xs text-sm text-cocoa/65">
          Opens Stripe to update payment methods or cancel this subscription.
        </p>
      )}
      {message ? (
        <p className="mt-2 max-w-xs text-sm text-clay" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
