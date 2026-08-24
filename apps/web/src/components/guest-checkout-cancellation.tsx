"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type CancellationState = "cancelled" | "cancelling" | "failed";

export function GuestCheckoutCancellation({ requestId }: { requestId: string | null }) {
  const [state, setState] = useState<CancellationState>("cancelling");

  const cancelCheckout = useCallback(async () => {
    setState("cancelling");
    if (!requestId) {
      setState("failed");
      return;
    }
    try {
      const response = await fetch("/api/checkout/guest-cancel", {
        body: JSON.stringify({ requestId }),
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      if (!response.ok) {
        throw new Error("guest_checkout_cancellation_failed");
      }
      setState("cancelled");
    } catch {
      setState("failed");
    }
  }, [requestId]);

  useEffect(() => {
    void cancelCheckout();
  }, [cancelCheckout]);

  return (
    <section
      aria-live="polite"
      className="max-w-2xl rounded-xl border border-dune bg-white p-6 shadow-sm sm:p-8"
      role={state === "failed" ? "alert" : "status"}
    >
      <h2 className="font-display text-3xl font-semibold text-cocoa">
        {state === "cancelled"
          ? "付款已取消"
          : state === "failed"
            ? "暂时无法关闭付款"
            : "正在关闭付款"}
      </h2>
      <p className="mt-4 text-sm font-medium leading-6 text-cocoa/72">
        {state === "cancelled"
          ? "这次 Checkout 已关闭，没有完成付款。你可以安全返回价格页。"
          : state === "failed"
            ? "请重试。为避免重复付款，不要再次打开新的 Checkout。"
            : "请稍候，不要关闭这个页面。"}
      </p>
      {state === "cancelled" ? (
        <Link
          className="mt-6 inline-flex min-h-11 items-center rounded-md bg-cocoa px-5 py-3 text-sm font-bold text-white hover:bg-charcoal"
          href="/pricing"
        >
          返回价格页
        </Link>
      ) : state === "failed" ? (
        <button
          className="mt-6 min-h-11 rounded-md border border-cocoa px-5 py-3 text-sm font-bold text-cocoa"
          onClick={() => void cancelCheckout()}
          type="button"
        >
          重试关闭
        </button>
      ) : null}
    </section>
  );
}
