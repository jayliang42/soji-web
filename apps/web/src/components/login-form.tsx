"use client";

import { useState, useTransition } from "react";
import { getSafeNextPath } from "@/lib/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthMode = "sign_in" | "sign_up";

export function LoginForm({
  enabled,
  nextPath
}: {
  enabled: boolean;
  nextPath: string;
}) {
  const [mode, setMode] = useState<AuthMode>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const safeNextPath = getSafeNextPath(nextPath);

  async function bootstrapProfile() {
    const response = await fetch("/api/auth/bootstrap", {
      method: "POST"
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { reason?: string }
        | null;
      throw new Error(body?.reason ?? "Failed to initialize the member profile.");
    }
  }

  function handleEmailAuth() {
    if (!enabled) {
      setMessage("Add Supabase env vars before trying to sign in.");
      return;
    }

    startTransition(async () => {
      try {
        setMessage(null);
        const supabase = createSupabaseBrowserClient();
        if (!supabase) {
          throw new Error("Supabase browser client is not available.");
        }

        if (mode === "sign_in") {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (error) {
            throw error;
          }
        } else {
          const { data, error } = await supabase.auth.signUp({
            email,
            password
          });

          if (error) {
            throw error;
          }

          if (!data.session) {
            setMessage(
              "Account created. Check your email to confirm the address before signing in."
            );
            return;
          }
        }

        await bootstrapProfile();
        window.location.assign(safeNextPath);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Authentication failed.");
      }
    });
  }

  function handleGoogleAuth() {
    if (!enabled) {
      setMessage("Add Supabase env vars before trying Google login.");
      return;
    }

    startTransition(async () => {
      try {
        setMessage(null);
        const supabase = createSupabaseBrowserClient();
        if (!supabase) {
          throw new Error("Supabase browser client is not available.");
        }

        const redirectTarget = encodeURIComponent(safeNextPath);
        const redirectTo = `${window.location.origin}/auth/callback?next=${redirectTarget}`;
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo }
        });

        if (error) {
          throw error;
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Google login failed.");
      }
    });
  }

  return (
    <div className="rounded-[28px] border border-dune bg-shell p-6">
      <div className="flex items-center gap-3 text-sm">
        <button
          type="button"
          onClick={() => setMode("sign_in")}
          className={`rounded-full px-4 py-2 ${mode === "sign_in" ? "bg-cocoa text-white" : "bg-sand text-cocoa"}`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("sign_up")}
          className={`rounded-full px-4 py-2 ${mode === "sign_up" ? "bg-cocoa text-white" : "bg-sand text-cocoa"}`}
        >
          Create account
        </button>
      </div>

      <div className="mt-6 grid gap-4">
        <label className="grid gap-2 text-sm text-cocoa/75">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-2xl border border-dune bg-white px-4 py-3 text-cocoa outline-none"
            placeholder="you@example.com"
          />
        </label>
        <label className="grid gap-2 text-sm text-cocoa/75">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-2xl border border-dune bg-white px-4 py-3 text-cocoa outline-none"
            placeholder="Create a strong password"
          />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleEmailAuth}
          disabled={isPending}
          className="rounded-full bg-cocoa px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isPending
            ? "Working..."
            : mode === "sign_in"
              ? "Continue with email"
              : "Create account"}
        </button>
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={isPending}
          className="rounded-full border border-cocoa px-5 py-3 text-sm font-semibold text-cocoa disabled:opacity-50"
        >
          Continue with Google
        </button>
      </div>

      <p className="mt-4 text-sm text-cocoa/70">
        {mode === "sign_in"
          ? "Use an existing account, then bootstrap your member profile."
          : "New accounts are created in Supabase Auth first, then inserted into profiles."}
      </p>

      {message ? <p className="mt-4 text-sm text-clay">{message}</p> : null}
    </div>
  );
}
