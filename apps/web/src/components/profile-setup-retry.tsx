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
          throw new Error("Profile setup is still unavailable.");
        }
        window.location.assign(getSafeNextPath(nextPath));
      } catch {
        setMessage("Profile setup is still unavailable. Try again shortly.");
      }
    });
  }

  return (
    <div className="mb-6 border-l-4 border-clay bg-accent-muted px-5 py-4 text-sm text-cocoa" role="alert">
      <p className="font-semibold">Member profile setup did not finish.</p>
      <p className="mt-1 text-cocoa/75">
        Your session is active, but paid access may not appear until setup succeeds.
      </p>
      <button
        className="mt-3 rounded-md bg-cocoa px-4 py-2 font-semibold text-white disabled:opacity-50"
        disabled={isPending}
        onClick={retry}
        type="button"
      >
        {isPending ? "Retrying..." : "Retry profile setup"}
      </button>
      {message ? <p className="mt-2 text-clay" role="status">{message}</p> : null}
    </div>
  );
}
