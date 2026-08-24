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
              ? "此订阅的账单管理暂不可用。请等待账单同步完成后刷新账户页。"
              : "账单管理暂不可用。请刷新账户页后重试。"
          );
        }
        window.location.assign(result.url);
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "账单管理暂不可用。请刷新账户页后重试。"
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
          ? "账单管理不可用"
          : isPending
            ? "正在打开账单管理…"
            : "管理账单"}
      </button>
      {!enabled ? (
        <p className="mt-2 max-w-xs text-sm text-cocoa/65">
          在安全记录账单更新之前，相关修改已暂停。请稍后刷新账户页重试。
        </p>
      ) : (
        <p className="mt-2 max-w-xs text-sm text-cocoa/65">
          将打开 Stripe，用于更新付款方式或取消此订阅。
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
