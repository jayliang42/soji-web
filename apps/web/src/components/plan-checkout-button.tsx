"use client";

import { useRef, useState, useTransition } from "react";
import type { MembershipTier } from "@soji/types";
import { rememberCheckoutReturnSession } from "@/components/checkout-return-cleanup";
import { shouldRotateCheckoutRequestId } from "@/lib/checkout";

type CheckoutResponse = {
  url?: string;
  sessionId?: string;
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
  checkoutEnabled,
  customerEmail,
  darkSurface = false,
  label,
  lookupKey,
  planId
}: {
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

        if (!response.ok || !payload?.url || !payload.sessionId) {
          if (shouldRotateCheckoutRequestId(response.status)) {
            requestIdRef.current = null;
          }
          throw new Error(getErrorMessage(payload?.error));
        }

        if (shouldRememberMembershipCheckoutSession(customerEmail)) {
          rememberCheckoutReturnSession(payload.sessionId);
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
      <p
        className={`text-center text-xs font-medium leading-5 ${
          darkSurface ? "text-white/70" : "text-cocoa/70"
        }`}
      >
        {customerEmail
          ? `购买将绑定到 ${maskEmail(customerEmail)}。`
          : "无需先注册。付款后使用付款邮箱登录或创建账号，内容会自动绑定。"}
      </p>
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

export function shouldRememberMembershipCheckoutSession(
  customerEmail: string | null
) {
  return Boolean(customerEmail);
}

export function maskEmail(email: string) {
  const separatorIndex = email.lastIndexOf("@");
  if (separatorIndex <= 0 || separatorIndex === email.length - 1) {
    return "当前登录账号";
  }

  return `${email.slice(0, 1)}***@${email.slice(separatorIndex + 1)}`;
}
