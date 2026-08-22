"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  checkoutReturnStorageKey,
  getCheckoutReturnAction,
  getCleanCancelledCheckoutHref,
  parseCheckoutReturnMarker
} from "@/lib/checkout-return-state";

type CleanupState = "cancelling" | "failed" | "idle";

export function rememberCheckoutReturnSession(sessionId: string) {
  const marker = parseCheckoutReturnMarker(JSON.stringify({ sessionId }));
  if (!marker) {
    return;
  }

  try {
    window.sessionStorage.setItem(checkoutReturnStorageKey, JSON.stringify(marker));
  } catch {
    // Checkout can still proceed; Stripe's own expiry remains the fallback.
  }
}

function readCheckoutReturnMarker() {
  try {
    const value = window.sessionStorage.getItem(checkoutReturnStorageKey);
    const marker = parseCheckoutReturnMarker(value);
    if (!marker && value) {
      window.sessionStorage.removeItem(checkoutReturnStorageKey);
    }
    return marker;
  } catch {
    return null;
  }
}

function clearCheckoutReturnMarker() {
  try {
    window.sessionStorage.removeItem(checkoutReturnStorageKey);
  } catch {
    // A blocked storage API must not prevent the return page from rendering.
  }
}

function isHistoryNavigation() {
  const navigation = window.performance
    .getEntriesByType("navigation")
    .at(0) as PerformanceNavigationTiming | undefined;
  return navigation?.type === "back_forward";
}

export function CheckoutReturnCleanup() {
  const [state, setState] = useState<CleanupState>("idle");
  const cleanupInFlight = useRef(false);

  const finishCancellation = useCallback(async (fromHistory: boolean) => {
    const marker = readCheckoutReturnMarker();
    if (!marker) {
      return;
    }

    const action = getCheckoutReturnAction({
      isHistoryNavigation: fromHistory,
      search: window.location.search
    });
    if (action === "clear") {
      clearCheckoutReturnMarker();
      return;
    }
    if (action !== "cancel" || cleanupInFlight.current) {
      return;
    }

    cleanupInFlight.current = true;
    setState("cancelling");

    try {
      const response = await fetch("/api/checkout/cancel", {
        body: JSON.stringify({ sessionId: marker.sessionId }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });

      if (!response.ok) {
        throw new Error("checkout_cancellation_failed");
      }

      clearCheckoutReturnMarker();
      window.location.replace(getCleanCancelledCheckoutHref(window.location.href));
    } catch {
      cleanupInFlight.current = false;
      setState("failed");
    }
  }, []);

  useEffect(() => {
    void finishCancellation(isHistoryNavigation());

    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        void finishCancellation(true);
      }
    }

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [finishCancellation]);

  if (state === "idle") {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-cocoa/35 px-6">
      <div
        className="max-w-md rounded-xl border border-dune bg-white p-6 text-center shadow-2xl"
        role={state === "failed" ? "alert" : "status"}
      >
        {state === "cancelling" ? (
          <>
            <p className="font-display text-2xl font-semibold text-cocoa">
              正在关闭未完成付款
            </p>
            <p className="mt-3 text-sm leading-6 text-cocoa/72">
              旧的 Stripe Checkout 失效后，才能安全重新开始。
            </p>
          </>
        ) : (
          <>
            <p className="font-display text-2xl font-semibold text-cocoa">
              暂时无法安全关闭付款
            </p>
            <p className="mt-3 text-sm leading-6 text-cocoa/72">
              请重试。为避免重复付款，当前 checkout 仍保持锁定。
            </p>
            <button
              className="mt-5 min-h-11 rounded-md bg-cocoa px-5 py-3 text-sm font-bold text-white"
              onClick={() => void finishCancellation(true)}
              type="button"
            >
              重试关闭
            </button>
          </>
        )}
      </div>
    </div>
  );
}
