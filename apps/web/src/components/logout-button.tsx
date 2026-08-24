"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LogoutButton({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    if (!enabled) {
      setMessage("当前环境尚未配置 Supabase。");
      return;
    }

    startTransition(async () => {
      try {
        setMessage(null);
        const supabase = createSupabaseBrowserClient();
        if (!supabase) {
          throw new Error("Supabase 浏览器客户端不可用。");
        }

        const { error } = await supabase.auth.signOut();
        if (error) {
          throw error;
        }

        router.push("/login");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "退出登录失败。");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleLogout}
        disabled={isPending}
        className="rounded-md border border-cocoa px-5 py-3 text-sm font-semibold text-cocoa disabled:opacity-50"
      >
        {isPending ? "正在退出…" : "退出登录"}
      </button>
      {message ? <p className="text-sm text-clay">{message}</p> : null}
    </div>
  );
}
