"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { getAuthCallbackUrl } from "@/lib/auth-redirect";
import { requestPasswordRecovery } from "@/lib/auth-recovery";
import { getClientSiteUrl } from "@/lib/env";
import { getSafeNextPath } from "@/lib/navigation";
import { getPublicAuthFailureMessage } from "@/lib/supabase/auth-errors";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthMode = "sign_in" | "sign_up";
type PendingOperation =
  | "email_sign_in"
  | "email_sign_up"
  | "google"
  | "recovery";
type AuthMessage = {
  kind: "error" | "status";
  text: string;
};

const pendingLabels: Record<PendingOperation, string> = {
  email_sign_in: "Signing in…",
  email_sign_up: "Creating account…",
  google: "Opening Google…",
  recovery: "Sending reset link…"
};

export function LoginForm({
  description,
  enabled,
  heading,
  nextPath
}: {
  description: string;
  enabled: boolean;
  heading: string;
  nextPath: string;
}) {
  const [mode, setMode] = useState<AuthMode>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<AuthMessage | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(
    null
  );
  const [pendingOperation, setPendingOperation] =
    useState<PendingOperation | null>(null);
  const [isPending, startTransition] = useTransition();
  const confirmationHeadingRef = useRef<HTMLHeadingElement>(null);
  const safeNextPath = getSafeNextPath(nextPath);
  const controlsDisabled = isPending || pendingOperation !== null;

  useEffect(() => {
    if (confirmationEmail) {
      confirmationHeadingRef.current?.focus();
    }
  }, [confirmationEmail]);

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
      setMessage({
        kind: "error",
        text: "Sign-in is not configured in this environment yet."
      });
      return;
    }

    if (!email || !password) {
      setMessage({
        kind: "error",
        text: "Enter both email and password."
      });
      return;
    }

    const operation =
      mode === "sign_in" ? "email_sign_in" : "email_sign_up";
    setPendingOperation(operation);
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
          const siteUrl = getClientSiteUrl(window.location.origin);
          if (!siteUrl) {
            throw new Error("canonical_auth_origin_unavailable");
          }

          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: getAuthCallbackUrl(siteUrl, safeNextPath)
            }
          });

          if (error) {
            throw error;
          }

          if (!data.session) {
            setConfirmationEmail(email);
            return;
          }
        }

        await bootstrapProfile();
        window.location.assign(safeNextPath);
      } catch {
        setMessage({
          kind: "error",
          text: getPublicAuthFailureMessage(operation)
        });
      } finally {
        setPendingOperation(null);
      }
    });
  }

  function handleGoogleAuth() {
    if (!enabled) {
      setMessage({
        kind: "error",
        text: "Google sign-in is not configured in this environment yet."
      });
      return;
    }

    setPendingOperation("google");
    startTransition(async () => {
      try {
        setMessage(null);
        const supabase = createSupabaseBrowserClient();
        if (!supabase) {
          throw new Error("Supabase browser client is not available.");
        }

        const siteUrl = getClientSiteUrl(window.location.origin);
        if (!siteUrl) {
          throw new Error("Google sign-in is temporarily unavailable.");
        }

        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: getAuthCallbackUrl(siteUrl, safeNextPath)
          }
        });

        if (error) {
          throw error;
        }
      } catch {
        setMessage({
          kind: "error",
          text: getPublicAuthFailureMessage("google")
        });
      } finally {
        setPendingOperation(null);
      }
    });
  }

  function handlePasswordRecovery() {
    if (!enabled) {
      setMessage({
        kind: "error",
        text: "Password reset is not configured in this environment yet."
      });
      return;
    }
    if (!email) {
      setMessage({
        kind: "error",
        text: "Enter your email first, then request a reset link."
      });
      return;
    }

    setPendingOperation("recovery");
    startTransition(async () => {
      setMessage(null);
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setMessage({
          kind: "error",
          text: "The reset email could not be sent. Try again shortly."
        });
        setPendingOperation(null);
        return;
      }

      try {
        const siteUrl = getClientSiteUrl(window.location.origin);
        if (!siteUrl) {
          throw new Error("Canonical site URL is not configured.");
        }
        await requestPasswordRecovery(supabase.auth, email, siteUrl);
        setMessage({
          kind: "status",
          text: "If an account matches that email, a password reset link is on its way."
        });
      } catch {
        setMessage({
          kind: "error",
          text: "The reset email could not be sent. Try again shortly."
        });
      } finally {
        setPendingOperation(null);
      }
    });
  }

  if (confirmationEmail) {
    return (
      <section className="max-w-2xl rounded-lg border border-dune bg-white p-6 shadow-sm md:p-8">
        <div className="border-l-4 border-sage bg-success-muted px-5 py-5 text-cocoa">
          <h2
            className="font-display text-3xl leading-tight"
            ref={confirmationHeadingRef}
            tabIndex={-1}
          >
            Check your inbox
          </h2>
          <p className="mt-3 text-sm leading-6 text-cocoa/80">
            We sent a confirmation link to{" "}
            <span className="font-semibold text-cocoa">{confirmationEmail}</span>.
            Open it to finish creating your Soji account.
          </p>
          <p className="mt-2 text-sm leading-6 text-cocoa/70">
            If it does not arrive, check spam or use a different email.
          </p>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            className="min-h-11 rounded-md border border-cocoa px-5 py-3 text-sm font-semibold text-cocoa"
            onClick={() => {
              setConfirmationEmail(null);
              setEmail("");
              setPassword("");
              setMode("sign_up");
            }}
            type="button"
          >
            Use a different email
          </button>
          <button
            className="min-h-11 rounded-md px-5 py-3 text-sm font-semibold text-clay"
            onClick={() => {
              setConfirmationEmail(null);
              setPassword("");
              setMode("sign_in");
            }}
            type="button"
          >
            Return to sign in
          </button>
        </div>
      </section>
    );
  }

  return (
    <form
      aria-busy={controlsDisabled}
      className="max-w-2xl rounded-lg border border-dune bg-white p-6 shadow-sm md:p-8"
      onSubmit={(event) => {
        event.preventDefault();
        handleEmailAuth();
      }}
    >
      <h2 className="font-display text-3xl leading-tight text-cocoa md:text-4xl">
        {heading}
      </h2>
      <p className="mt-3 max-w-xl text-cocoa/75">{description}</p>

      <button
        className="mt-8 min-h-12 w-full rounded-md bg-cocoa px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
        disabled={controlsDisabled}
        onClick={handleGoogleAuth}
        type="button"
      >
        {pendingOperation === "google"
          ? pendingLabels.google
          : "Continue with Google"}
      </button>

      <div className="my-6 flex items-center gap-3 text-sm text-cocoa/75">
        <span aria-hidden="true" className="h-px flex-1 bg-dune" />
        <span>or continue with email</span>
        <span aria-hidden="true" className="h-px flex-1 bg-dune" />
      </div>

      <div
        aria-label="Authentication mode"
        className="grid grid-cols-2 overflow-hidden rounded-md border border-dune text-sm"
        role="group"
      >
        <button
          type="button"
          aria-pressed={mode === "sign_in"}
          disabled={controlsDisabled}
          onClick={() => {
            setMode("sign_in");
            setMessage(null);
          }}
          className={`min-h-11 border-r border-dune px-4 py-2 disabled:opacity-50 ${mode === "sign_in" ? "bg-clay text-white" : "bg-shell text-cocoa"}`}
        >
          Sign in
        </button>
        <button
          type="button"
          aria-pressed={mode === "sign_up"}
          disabled={controlsDisabled}
          onClick={() => {
            setMode("sign_up");
            setMessage(null);
          }}
          className={`min-h-11 px-4 py-2 disabled:opacity-50 ${mode === "sign_up" ? "bg-clay text-white" : "bg-shell text-cocoa"}`}
        >
          Create account
        </button>
      </div>

      <div className="mt-6 grid gap-4">
        <label className="grid gap-2 text-sm text-cocoa/75">
          Email
          <input
            autoComplete="email"
            disabled={controlsDisabled}
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="min-h-12 rounded-md border border-dune bg-white px-4 py-3 text-cocoa outline-none disabled:bg-shell disabled:opacity-70"
            placeholder="you@example.com"
          />
        </label>
        <label className="grid gap-2 text-sm text-cocoa/75">
          Password
          <input
            autoComplete={mode === "sign_in" ? "current-password" : "new-password"}
            disabled={controlsDisabled}
            minLength={mode === "sign_up" ? 8 : 1}
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="min-h-12 rounded-md border border-dune bg-white px-4 py-3 text-cocoa outline-none disabled:bg-shell disabled:opacity-70"
            placeholder={mode === "sign_in" ? "Your password" : "Create a strong password"}
          />
        </label>
        {mode === "sign_up" ? (
          <p className="-mt-2 text-sm text-cocoa/65">Use at least 8 characters.</p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={controlsDisabled}
        className="mt-6 min-h-12 w-full rounded-md bg-clay px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pendingOperation === "email_sign_in" ||
        pendingOperation === "email_sign_up"
          ? pendingLabels[pendingOperation]
          : mode === "sign_in"
            ? "Sign in with email"
            : "Create account"}
      </button>

      {mode === "sign_in" ? (
        <button
          type="button"
          disabled={controlsDisabled}
          onClick={handlePasswordRecovery}
          className="mt-3 min-h-11 text-sm font-semibold text-clay disabled:opacity-50"
        >
          {pendingOperation === "recovery"
            ? pendingLabels.recovery
            : "Forgot password?"}
        </button>
      ) : null}

      {message ? (
        <p
          className={`mt-4 border-l-4 px-4 py-3 text-sm ${
            message.kind === "error"
              ? "border-clay bg-accent-muted text-cocoa"
              : "border-sage bg-success-muted text-cocoa"
          }`}
          role={message.kind === "error" ? "alert" : "status"}
        >
          {message.text}
        </p>
      ) : null}
    </form>
  );
}
