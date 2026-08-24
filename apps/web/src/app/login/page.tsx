import Link from "next/link";
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
  title: "登录",
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
  const copy = getLoginPageCopy(nextPath);
  const authEnabled = hasSupabaseConfig();
  const recoveryFailed = params.error === "password_reset_callback_failed";

  if (snapshot.user && snapshot.source === "supabase") {
    redirect(nextPath as Route);
  }

  return (
    <main>
      <SectionShell
        eyebrow="账号访问"
        headingLevel={1}
        title={copy.title}
        description={copy.description}
      >
        {recoveryFailed ? <LegacyRecoveryHandler /> : null}
        {params.error === "oauth_callback_failed" ||
        recoveryFailed ? (
          <div
            className="mb-6 border-l-4 border-clay bg-accent-muted px-5 py-4 text-sm text-cocoa"
            role="alert"
          >
            <p className="font-semibold">
              {params.error === "password_reset_callback_failed"
                ? "无法完成密码重置。"
                : "无法完成 Google 登录。"}
            </p>
            <p className="mt-1 text-cocoa/75">
              {params.error === "password_reset_callback_failed"
                ? "你的密码没有被修改，请在下方申请新的重置链接。"
                : "本次登录没有获得账号访问权限，请重新尝试。"}
            </p>
          </div>
        ) : null}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
          <LoginForm
            description={copy.panelDescription}
            enabled={authEnabled}
            heading={copy.panelTitle}
            initialMode={recoveryFailed ? "recovery" : "sign_in"}
            nextPath={nextPath}
          />
          <div className="grid content-start gap-6">
            {snapshot.user ? (
              <AuthStatus user={snapshot.user} source={snapshot.source} />
            ) : (
              <aside className="overflow-hidden rounded-xl bg-cocoa px-6 py-7 text-white sm:px-8 sm:py-8">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/58">
                  登录后
                </p>
                <h2 className="mt-3 font-display text-3xl font-semibold leading-tight">
                  继续前往{copy.destinationLabel}
                </h2>
                <p className="mt-4 text-sm leading-6 text-white/72">
                  {copy.destinationDescription}
                </p>
                <ol className="mt-6 grid gap-3 border-t border-white/15 pt-5 text-sm">
                  <li className="flex gap-3">
                    <span className="font-bold text-white/45">01</span>
                    <span>登录或创建一个 GS学院账号。</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-white/45">02</span>
                    <span>返回刚才正在进行的页面。</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-white/45">03</span>
                    <span>统一管理访问权限、购买记录和下载内容。</span>
                  </li>
                </ol>
                <Link
                  className="mt-6 inline-flex min-h-11 items-center text-sm font-bold text-white underline decoration-white/35 underline-offset-4 hover:decoration-white"
                  href="/library"
                >
                  暂时浏览公开指南
                </Link>
              </aside>
            )}
            {!authEnabled ? (
              <div className="border-l-4 border-clay bg-accent-muted px-5 py-4 text-sm text-cocoa/80">
                <p className="font-semibold text-cocoa">需要完成本地配置</p>
                <p className="mt-3">
                  配置 Supabase 公共网址和匿名密钥后，用户才能登录。
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </SectionShell>
    </main>
  );
}
