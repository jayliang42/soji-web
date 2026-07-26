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
    setMessage("Completing your secure password reset...");

    void (async () => {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setMessage("Password reset is temporarily unavailable.");
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken
      });
      if (error) {
        setMessage("This password reset link is invalid or has expired.");
        return;
      }

      const response = await fetch("/api/auth/bootstrap", { method: "POST" });
      if (!response.ok) {
        setMessage("Your account could not be initialized. Request a new reset link.");
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
