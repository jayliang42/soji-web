import { redirect } from "next/navigation";
import type { Metadata, Route } from "next";
import { AuthStatus } from "@/components/auth-status";
import { LoginForm } from "@/components/login-form";
import { LegacyRecoveryHandler } from "@/components/legacy-recovery-handler";
import { SectionShell } from "@/components/section-shell";
import { hasSupabaseConfig } from "@/lib/env";
import { getLoginPageCopy } from "@/lib/login-copy";
import { getSafeNextPath } from "@/lib/navigation";
import { getSessionSnapshot } from "@/lib/session";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { follow: false, index: false }
};

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const snapshot = await getSessionSnapshot();
  const params = await searchParams;
  const nextPath = getSafeNextPath(params.next);
  const copy = getLoginPageCopy(params.next ? nextPath : "/");
  const authEnabled = hasSupabaseConfig();

  if (snapshot.user && snapshot.source === "supabase") {
    redirect(nextPath as Route);
  }

  return (
    <main>
      <SectionShell
        eyebrow="Member access"
        headingLevel={1}
        title={copy.title}
        description={copy.description}
      >
        {params.error === "password_reset_callback_failed" ? (
          <LegacyRecoveryHandler />
        ) : null}
        {params.error === "oauth_callback_failed" ||
        params.error === "password_reset_callback_failed" ? (
          <div
            className="mb-6 border-l-4 border-clay bg-accent-muted px-5 py-4 text-sm text-cocoa"
            role="alert"
          >
            <p className="font-semibold">
              {params.error === "password_reset_callback_failed"
                ? "The password reset link could not be completed."
                : "Google sign-in could not be completed."}
            </p>
            <p className="mt-1 text-cocoa/75">
              {params.error === "password_reset_callback_failed"
                ? "No password was changed. Request a new reset link below."
                : "No account access was assumed. Try signing in again."}
            </p>
          </div>
        ) : null}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
          <LoginForm
            description={copy.panelDescription}
            enabled={authEnabled}
            heading={copy.panelTitle}
            nextPath={nextPath}
          />
          <div className="grid content-start gap-6">
            {snapshot.user ? (
              <AuthStatus user={snapshot.user} source={snapshot.source} />
            ) : (
              <aside className="rounded-lg border border-dune bg-cream px-6 py-6 text-cocoa">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-clay">
                  One trusted identity
                </p>
                <h2 className="mt-3 font-display text-2xl leading-tight">
                  Your access stays with your account.
                </h2>
                <p className="mt-3 text-sm leading-6 text-cocoa/75">
                  Memberships, purchases, downloads, and saved access use the
                  same private profile. Soji never asks for payment details on
                  this page.
                </p>
              </aside>
            )}
            {!authEnabled ? (
              <div className="border-l-4 border-clay bg-accent-muted px-5 py-4 text-sm text-cocoa/80">
                <p className="font-semibold text-cocoa">Local setup needed</p>
                <p className="mt-3">
                  Add the Supabase public URL and anon key before real users can
                  sign in.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </SectionShell>
    </main>
  );
}
