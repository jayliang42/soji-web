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
      "我们正在确认付款并绑定到当前账号。请稍候，不要重复付款。",
    eyebrow: "付款确认中",
    title: "正在绑定你的购买"
  }
};

export function getPurchaseClaimCopy(status: PurchaseClaimStatus) {
  return claimCopy[status];
}

export function PurchaseClaimStatus() {
  const [status, setStatus] = useState<PurchaseClaimStatus>("processing");
  const [isChecking, setIsChecking] = useState(true);

  const checkClaim = useCallback(async () => {
    setIsChecking(true);
    const result = await requestPendingPurchaseClaim();
    if (result.kind === "redirect") {
      window.location.assign(result.href);
      return;
    }

    setStatus(result.status);
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
        <button
          className="mt-6 min-h-11 rounded-md border border-cocoa px-5 py-3 text-sm font-bold text-cocoa disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isChecking}
          onClick={() => void checkClaim()}
          type="button"
        >
          {isChecking ? "正在检查..." : "重新检查"}
        </button>
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
