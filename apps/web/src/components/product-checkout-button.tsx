"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { rememberCheckoutReturnSession } from "@/components/checkout-return-cleanup";
import { shouldRotateCheckoutRequestId } from "@/lib/checkout";

type CheckoutResponse = {
  url?: string;
  sessionId?: string;
  error?: string | Record<string, unknown>;
};

function getErrorMessage(error: CheckoutResponse["error"]) {
  if (typeof error !== "string") {
    return "暂时无法开始支付，请稍后再试。";
  }

  const messages: Record<string, string> = {
    "A checkout for this product is already in progress. Return to it or try again after it expires.":
      "此产品已有一笔付款正在进行，请返回原付款页面，或等其失效后再试。",
    "Checkout test access is restricted.": "当前浏览器未获准使用测试支付。",
    "The signed-in account needs an email address before checkout.":
      "当前账号缺少邮箱地址，暂时无法支付。",
    "This product is included with your Full Access membership.":
      "Full Access 已包含此产品，无需重复购买。",
    "This product is not available for purchase.": "此产品目前不可购买。",
    "Too many checkout attempts. Try again later.":
      "支付尝试次数过多，请稍后再试。",
    "You already own this product. Access it from your account.":
      "你已经购买此产品，可前往账号中心查看。",
    customer_policy_not_ready: "支付政策配置尚未完成，暂时无法开始支付。"
  };

  return messages[error] ?? "暂时无法开始支付，请稍后再试。";
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
  productSlug,
  returnTo = "products"
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
  returnTo?: "pricing" | "products";
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
          Full Access 已包含此内容，无需重复购买。
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
            requestId,
            returnTo
          })
        });

        const payload = (await response.json().catch(() => null)) as CheckoutResponse | null;

        if (!response.ok || !payload?.url || !payload.sessionId) {
          if (shouldRotateCheckoutRequestId(response.status)) {
            requestIdRef.current = null;
          }
          throw new Error(getErrorMessage(payload?.error));
        }

        rememberCheckoutReturnSession(payload.sessionId);
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
