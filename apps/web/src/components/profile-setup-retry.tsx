"use client";

import { useState, useTransition } from "react";
import { getSafeNextPath } from "@/lib/navigation";

export function ProfileSetupRetry({ nextPath }: { nextPath?: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function retry() {
    startTransition(async () => {
      setMessage(null);
      try {
        const response = await fetch("/api/auth/bootstrap", { method: "POST" });
        if (!response.ok) {
          throw new Error("账号资料设置仍不可用。");
        }
        window.location.assign(getSafeNextPath(nextPath));
      } catch {
        setMessage("账号资料设置仍不可用，请稍后再试。");
      }
    });
  }

  return (
    <div className="mb-6 border-l-4 border-clay bg-accent-muted px-5 py-4 text-sm text-cocoa" role="alert">
      <p className="font-semibold">会员资料设置尚未完成</p>
      <p className="mt-1 text-cocoa/75">
        你已经登录，但在资料设置成功前，已购内容可能暂时不会显示。
      </p>
      <button
        className="mt-3 rounded-md bg-cocoa px-4 py-2 font-semibold text-white disabled:opacity-50"
        disabled={isPending}
        onClick={retry}
        type="button"
      >
        {isPending ? "正在重试…" : "重新设置账号资料"}
      </button>
      {message ? <p className="mt-2 text-clay" role="status">{message}</p> : null}
    </div>
  );
}
