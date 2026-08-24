"use client";

import { useEffect, useState } from "react";
import { getLegacyRecoveryCredentials } from "@/lib/auth-recovery";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LegacyRecoveryHandler() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const credentials = getLegacyRecoveryCredentials(window.location.hash);
    if (!credentials) return;

    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`
    );
    setMessage("正在完成安全的密码重置…");

    void (async () => {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setMessage("密码重置暂时不可用。");
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken
      });
      if (error) {
        setMessage("此密码重置链接无效或已过期。");
        return;
      }

      const response = await fetch("/api/auth/bootstrap", { method: "POST" });
      if (!response.ok) {
        setMessage("无法初始化账号，请申请新的重置链接。");
        return;
      }

      window.location.replace("/reset-password");
    })();
  }, []);

  return message ? (
    <p className="mb-6 border-l-4 border-clay bg-accent-muted px-5 py-4 text-sm text-cocoa" role="status">
      {message}
    </p>
  ) : null;
}
