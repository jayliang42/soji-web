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
    return "支付失败。";
  }

  if (typeof error === "string") {
    return error;
  }

  return "支付失败，请稍后重试。";
}

export function ProductCheckoutButton({
  accessPaused,
  alreadyPurchased,
  checkoutEnabled,
  customerEmail,
  membershipEntitled = false,
  darkSurface = false,
  nextPath = "/products",
  purchaseStateAvailable,
  productId,
  productSlug
}: {
  accessPaused: boolean;
  alreadyPurchased: boolean;
  checkoutEnabled: boolean;
  customerEmail: string | null;
  membershipEntitled?: boolean;
  darkSurface?: boolean;
  nextPath?: string;
  purchaseStateAvailable: boolean;
  productId?: string;
  productSlug: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const requestIdRef = useRef<string | null>(null);

  if (membershipEntitled && productId) {
    return (
      <div className="grid gap-2">
        <a
          href={`/api/account/products/${productId}/download`}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-cocoa px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-charcoal"
        >
          下载已包含内容
        </a>
        <p className="max-w-xs text-xs font-medium text-cocoa/65">
          Full Access 会员已包含，无需重复购买。
        </p>
      </div>
    );
  }

  if (!customerEmail) {
    return (
      <Link
        href={{ pathname: "/login", query: { next: nextPath } }}
        className={`inline-flex min-h-11 items-center justify-center rounded-md px-5 py-3 text-sm font-bold transition-colors ${
          darkSurface
            ? "bg-white text-cocoa hover:bg-sand"
            : "bg-cocoa text-white hover:bg-charcoal"
        }`}
      >
        登录后解锁
      </Link>
    );
  }

  if (!purchaseStateAvailable) {
    return (
      <div className="grid gap-2">
        <button
          type="button"
          disabled
          className={`inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-md border px-5 py-3 text-sm font-bold ${
            darkSurface
              ? "border-white/30 bg-white/10 text-white/60"
              : "border-dune bg-cream text-cocoa/60"
          }`}
        >
          购买状态暂不可用
        </button>
        <p className="max-w-xs text-xs font-medium text-cocoa/65">
          暂时无法确认你的购买记录，请刷新后再试。
        </p>
      </div>
    );
  }

  if (alreadyPurchased) {
    return (
      <Link
        href="/account#purchases-heading"
        className={`inline-flex min-h-11 items-center justify-center rounded-md border px-5 py-3 text-sm font-bold transition-colors ${
          darkSurface
            ? "border-white bg-transparent text-white hover:bg-white hover:text-cocoa"
            : "border-cocoa text-cocoa hover:bg-cocoa hover:text-white"
        }`}
      >
        {accessPaused ? "查看购买记录" : "进入已解锁内容"}
      </Link>
    );
  }

  if (!checkoutEnabled) {
    return (
      <div className="grid gap-2">
        <button
          type="button"
          disabled
          className={`inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-md border px-5 py-3 text-sm font-bold ${
            darkSurface
              ? "border-white/30 bg-white/10 text-white/60"
              : "border-dune bg-cream text-cocoa/60"
          }`}
        >
          支付配置中
        </button>
        <p className="max-w-xs text-xs font-medium text-cocoa/65">
          支付功能正在配置中，目前不会发起扣款。
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
        setMessage(error instanceof Error ? error.message : "支付失败，请稍后重试。");
      }
    });
  }

  return (
    <div className="grid gap-3">
      <button
        type="button"
        onClick={startCheckout}
        disabled={isPending}
        className={`inline-flex min-h-11 items-center justify-center rounded-md px-5 py-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          darkSurface
            ? "bg-white text-cocoa hover:bg-sand"
            : "bg-cocoa text-white hover:bg-charcoal"
        }`}
      >
        {isPending ? "正在打开支付..." : "立即解锁"}
      </button>
      {message ? (
        <p aria-live="polite" className="text-sm font-medium text-clay">
          {message}
        </p>
      ) : null}
    </div>
  );
}
