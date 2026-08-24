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
  if (typeof error !== "string") {
    return "暂时无法开始支付，请稍后再试。";
  }

  const messages: Record<string, string> = {
    "An existing Full Access purchase is already attached to this account.":
      "当前账号已拥有 Full Access，无需重复购买。",
    "A membership checkout is already in progress. Return to it or try again after it expires.":
      "当前已有一笔会员付款正在进行，请返回原付款页面，或等其失效后再试。",
    "Checkout test access is restricted.": "当前浏览器未获准使用测试支付。",
    "The signed-in account needs an email address before checkout.":
      "当前账号缺少邮箱地址，暂时无法支付。",
    "Too many checkout attempts. Try again later.":
      "支付尝试次数过多，请稍后再试。",
    "Unknown membership plan.": "无法识别所选方案。",
    customer_policy_not_ready: "支付政策配置尚未完成，暂时无法开始支付。"
  };

  return messages[error] ?? "暂时无法开始支付，请稍后再试。";
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
          暂时无法支付
        </button>
        <p
          className={`text-center text-xs font-medium ${
            darkSurface ? "text-white/65" : "text-cocoa/65"
          }`}
        >
          付款服务暂时不可用，目前不会发起扣款。
        </p>
      </div>
    );
  }

  function startCheckout() {
    if (!lookupKey) {
      setMessage("此方案尚未配置付款价格，暂时无法支付。");
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
        setMessage(
          error instanceof Error
            ? error.message
            : "暂时无法开始支付，请稍后再试。"
        );
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
        {isPending ? "正在打开支付页面…" : label}
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
