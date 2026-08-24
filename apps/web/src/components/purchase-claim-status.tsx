"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  requestPendingPurchaseClaim,
  type PurchaseClaimStatus
} from "@/lib/purchase-claim";

type ClaimCopy = {
  description: string;
  eyebrow: string;
  title: string;
};

const claimCopy: Record<PurchaseClaimStatus, ClaimCopy> = {
  claimed: {
    description: "购买内容已经加入当前账号，可以立即查看。",
    eyebrow: "领取成功",
    title: "购买已绑定"
  },
  email_mismatch: {
    description:
      "登录邮箱与付款邮箱不一致。请使用付款邮箱登录，或联系支持。",
    eyebrow: "需要切换账号",
    title: "暂时无法绑定购买"
  },
  error: {
    description:
      "我们暂时无法领取这笔购买。请不要重复付款，稍后重试或联系支持。",
    eyebrow: "服务暂不可用",
    title: "领取没有完成"
  },
  invalid: {
    description:
      "我们无法确认可领取的购买。请不要重复付款，并联系支持核对付款记录。",
    eyebrow: "需要协助",
    title: "无法确认这笔购买"
  },
  processing: {
    description:
      "如果你刚完成付款，Stripe 确认可能仍在处理中；请稍候再检查。如果尚未付款，请返回价格页。",
    eyebrow: "等待付款确认",
    title: "暂未找到可领取的购买"
  }
};

export function getPurchaseClaimCopy(status: PurchaseClaimStatus) {
  return claimCopy[status];
}

export function getPurchaseClaimRetryNotice(status: PurchaseClaimStatus) {
  if (status === "processing") {
    return "已重新检查：暂未找到已确认的付款。如果尚未付款，请返回价格页；如果刚完成付款，请稍后再试。";
  }
  if (status === "error") {
    return "已重新检查，但领取服务暂时不可用。请稍后再试。";
  }
  return null;
}

export function PurchaseClaimStatus() {
  const [status, setStatus] = useState<PurchaseClaimStatus>("processing");
  const [isChecking, setIsChecking] = useState(true);
  const [retryNotice, setRetryNotice] = useState<string | null>(null);

  const checkClaim = useCallback(async (isManualRetry = false) => {
    setIsChecking(true);
    if (isManualRetry) setRetryNotice(null);
    const result = await requestPendingPurchaseClaim();
    if (result.kind === "redirect") {
      window.location.assign(result.href);
      return;
    }

    setStatus(result.status);
    setRetryNotice(
      isManualRetry ? getPurchaseClaimRetryNotice(result.status) : null
    );
    setIsChecking(false);
  }, []);

  useEffect(() => {
    void checkClaim();
  }, [checkClaim]);

  const copy = getPurchaseClaimCopy(status);

  return (
    <section
      aria-busy={isChecking}
      aria-live="polite"
      className="max-w-2xl rounded-xl border border-dune bg-white p-6 shadow-sm sm:p-8"
    >
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-clay">
        {copy.eyebrow}
      </p>
      <h2 className="mt-3 font-display text-3xl font-semibold text-cocoa">
        {copy.title}
      </h2>
      <p className="mt-4 max-w-xl text-sm font-medium leading-6 text-cocoa/72">
        {copy.description}
      </p>

      {status === "claimed" ? (
        <Link
          className="mt-6 inline-flex min-h-11 items-center rounded-md bg-cocoa px-5 py-3 text-sm font-bold text-white hover:bg-charcoal"
          href="/account#purchases-heading"
        >
          查看已解锁内容
        </Link>
      ) : status === "processing" || status === "error" ? (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              className="min-h-11 rounded-md border border-cocoa px-5 py-3 text-sm font-bold text-cocoa disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isChecking}
              onClick={() => void checkClaim(true)}
              type="button"
            >
              {isChecking ? "正在检查..." : "重新检查"}
            </button>
            {status === "processing" ? (
              <Link
                className="inline-flex min-h-11 items-center font-bold text-clay underline decoration-clay/40 underline-offset-4 hover:decoration-clay"
                href="/pricing"
              >
                返回价格页
              </Link>
            ) : null}
          </div>
          {retryNotice ? (
            <p
              className="mt-4 rounded-lg bg-cream px-4 py-3 text-sm font-medium leading-6 text-cocoa/75"
              role="status"
            >
              {retryNotice}
            </p>
          ) : null}
        </>
      ) : (
        <Link
          className="mt-6 inline-flex min-h-11 items-center font-bold text-clay underline decoration-clay/40 underline-offset-4 hover:decoration-clay"
          href="/support"
        >
          联系支持
        </Link>
      )}
    </section>
  );
}
