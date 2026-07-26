import Link from "next/link";
import type { Metadata } from "next";
import { PasswordResetForm } from "@/components/password-reset-form";
import { SectionShell } from "@/components/section-shell";
import { getSessionSnapshot } from "@/lib/session";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { follow: false, index: false }
};

export default async function ResetPasswordPage() {
  const snapshot = await getSessionSnapshot();
  const canReset = Boolean(snapshot.user && snapshot.source === "supabase");

  return (
    <main>
      <SectionShell
        eyebrow="Account security"
        headingLevel={1}
        title="Choose a new password"
        description="Use the secure session from your recovery email to replace your account password."
      >
        {canReset ? (
          <PasswordResetForm />
        ) : (
          <div className="max-w-2xl rounded-lg border border-dune bg-white p-6 text-cocoa shadow-sm md:p-8">
            <h2 className="font-display text-3xl leading-tight">
              This reset link is no longer valid.
            </h2>
            <p className="mt-3 text-sm leading-6 text-cocoa/75">
              Request a new password reset email and open the newest link.
            </p>
            <Link
              href="/login?next=/account"
              className="mt-6 inline-flex min-h-11 items-center rounded-md bg-clay px-5 py-3 text-sm font-semibold text-white"
            >
              Request another link
            </Link>
          </div>
        )}
      </SectionShell>
    </main>
  );
}
