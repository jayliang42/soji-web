"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { updateRecoveredPassword } from "@/lib/auth-recovery";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function PasswordResetForm() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      aria-busy={isPending}
      className="max-w-2xl rounded-lg border border-dune bg-white p-6 shadow-sm md:p-8"
      onSubmit={(event) => {
        event.preventDefault();
        if (password.length < 8) {
          setMessage("Use at least 8 characters for your new password.");
          return;
        }
        if (password !== confirmation) {
          setMessage("The passwords do not match.");
          return;
        }

        startTransition(async () => {
          setMessage(null);
          const supabase = createSupabaseBrowserClient();
          if (!supabase) {
            setMessage("Password reset is temporarily unavailable.");
            return;
          }

          try {
            await updateRecoveredPassword(supabase.auth, password);
            setSucceeded(true);
            setPassword("");
            setConfirmation("");
          } catch {
            setMessage(
              "Your password could not be updated. Request a new reset link and try again."
            );
          }
        });
      }}
    >
      <div className="grid gap-4">
        <label className="grid gap-2 text-sm text-cocoa/75">
          New password
          <input
            autoComplete="new-password"
            minLength={8}
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isPending || succeeded}
            className="min-h-12 rounded-md border border-dune bg-white px-4 py-3 text-cocoa outline-none disabled:bg-shell disabled:opacity-70"
          />
        </label>
        <label className="grid gap-2 text-sm text-cocoa/75">
          Confirm new password
          <input
            autoComplete="new-password"
            minLength={8}
            required
            type="password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            disabled={isPending || succeeded}
            className="min-h-12 rounded-md border border-dune bg-white px-4 py-3 text-cocoa outline-none disabled:bg-shell disabled:opacity-70"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending || succeeded}
        className="mt-6 min-h-12 w-full rounded-md bg-clay px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {isPending ? "Updating password…" : "Update password"}
      </button>

      {succeeded ? (
        <div className="mt-5 border-l-4 border-sage bg-success-muted px-4 py-3 text-sm text-cocoa" role="status">
          <h2 className="font-display text-2xl">Password updated</h2>
          <p className="mt-2 text-cocoa/75">
            Your new password is ready to use.
          </p>
          <Link
            href="/account"
            className="mt-4 inline-flex min-h-11 items-center rounded-md bg-clay px-5 py-3 font-semibold text-white"
          >
            Continue to your account
          </Link>
        </div>
      ) : null}
      {message ? (
        <p className="mt-4 text-sm text-clay" role="alert">
          {message}
        </p>
      ) : null}
    </form>
  );
}
