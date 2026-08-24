import Link from "next/link";
import type { Metadata } from "next";
import { PasswordResetForm } from "@/components/password-reset-form";
import { SectionShell } from "@/components/section-shell";
import { getSessionSnapshot } from "@/lib/session";

export const metadata: Metadata = {
  title: "重置密码",
  robots: { follow: false, index: false }
};

export default async function ResetPasswordPage() {
  const snapshot = await getSessionSnapshot();
  const canReset = Boolean(snapshot.user && snapshot.source === "supabase");

  return (
    <main>
      <SectionShell
        eyebrow="账号安全"
        headingLevel={1}
        title="设置新密码"
        description="通过重置邮件建立的安全会话，为你的账号设置新密码。"
      >
        {canReset ? (
          <PasswordResetForm />
        ) : (
          <div className="max-w-2xl rounded-lg border border-dune bg-white p-6 text-cocoa shadow-sm md:p-8">
            <h2 className="font-display text-3xl leading-tight">
              此重置链接已失效
            </h2>
            <p className="mt-3 text-sm leading-6 text-cocoa/75">
              请申请新的密码重置邮件，并打开最新收到的链接。
            </p>
            <Link
              href="/login?next=/account"
              className="mt-6 inline-flex min-h-11 items-center rounded-md bg-clay px-5 py-3 text-sm font-semibold text-white"
            >
              申请新链接
            </Link>
          </div>
        )}
      </SectionShell>
    </main>
  );
}
