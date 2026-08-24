"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { getAuthCallbackUrl } from "@/lib/auth-redirect";
import { requestPasswordRecovery } from "@/lib/auth-recovery";
import { getClientSiteUrl } from "@/lib/env";
import { getSafeNextPath } from "@/lib/navigation";
import { getPublicAuthFailureMessage } from "@/lib/supabase/auth-errors";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthMode = "recovery" | "sign_in" | "sign_up";
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
  email_sign_in: "正在登录…",
  email_sign_up: "正在创建账号…",
  google: "正在打开 Google…",
  recovery: "正在发送重置链接…"
};

export function LoginForm({
  description,
  enabled,
  heading,
  initialMode = "sign_in",
  nextPath
}: {
  description: string;
  enabled: boolean;
  heading: string;
  initialMode?: Extract<AuthMode, "recovery" | "sign_in">;
  nextPath: string;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
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
  const formHeadingRef = useRef<HTMLHeadingElement>(null);
  const safeNextPath = getSafeNextPath(nextPath);
  const controlsDisabled = isPending || pendingOperation !== null;

  useEffect(() => {
    if (confirmationEmail) {
      confirmationHeadingRef.current?.focus();
    }
  }, [confirmationEmail]);

  useEffect(() => {
    if (mode === "recovery") {
      formHeadingRef.current?.focus();
    }
  }, [mode]);

  async function bootstrapProfile() {
    const response = await fetch("/api/auth/bootstrap", {
      method: "POST"
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { reason?: string }
        | null;
      throw new Error(body?.reason ?? "无法初始化会员资料。");
    }
  }

  function handleEmailAuth() {
    if (mode === "recovery") {
      return;
    }

    if (!enabled) {
      setMessage({
        kind: "error",
        text: "当前环境尚未配置登录功能。"
      });
      return;
    }

    if (!email || !password) {
      setMessage({
        kind: "error",
        text: "请输入邮箱和密码。"
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
          throw new Error("Supabase 浏览器客户端不可用。");
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
        text: "当前环境尚未配置 Google 登录。"
      });
      return;
    }

    setPendingOperation("google");
    startTransition(async () => {
      try {
        setMessage(null);
        const supabase = createSupabaseBrowserClient();
        if (!supabase) {
          throw new Error("Supabase 浏览器客户端不可用。");
        }

        const siteUrl = getClientSiteUrl(window.location.origin);
        if (!siteUrl) {
          throw new Error("Google 登录暂时不可用。");
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
        text: "当前环境尚未配置密码重置功能。"
      });
      return;
    }
    if (!email) {
      setMessage({
        kind: "error",
        text: "请先输入邮箱，再申请重置链接。"
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
          text: "无法发送重置邮件，请稍后再试。"
        });
        setPendingOperation(null);
        return;
      }

      try {
        const siteUrl = getClientSiteUrl(window.location.origin);
        if (!siteUrl) {
          throw new Error("网站标准地址尚未配置。");
        }
        await requestPasswordRecovery(supabase.auth, email, siteUrl);
        setMessage({
          kind: "status",
          text: "如果该邮箱对应一个账号，密码重置邮件很快会送达。"
        });
      } catch {
        setMessage({
          kind: "error",
          text: "无法发送重置邮件，请稍后再试。"
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
            请查看邮箱
          </h2>
          <p className="mt-3 text-sm leading-6 text-cocoa/80">
            我们已向{" "}
            <span className="font-semibold text-cocoa">{confirmationEmail}</span>
            {" "}发送确认链接。打开链接即可完成 GS学院账号注册。
          </p>
          <p className="mt-2 text-sm leading-6 text-cocoa/70">
            如果没有收到，请检查垃圾邮件，或改用其他邮箱。
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
            使用其他邮箱
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
            返回登录
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
        if (mode === "recovery") {
          handlePasswordRecovery();
        } else {
          handleEmailAuth();
        }
      }}
    >
      <h2
        className="font-display text-3xl leading-tight text-cocoa md:text-4xl"
        ref={formHeadingRef}
        tabIndex={mode === "recovery" ? -1 : undefined}
      >
        {mode === "recovery" ? "重置密码" : heading}
      </h2>
      <p className="mt-3 max-w-xl text-cocoa/75">
        {mode === "recovery"
          ? "输入与你的账号关联的邮箱，我们会发送一个设置新密码的链接。"
          : description}
      </p>

      {mode !== "recovery" ? (
        <>
          <button
            className="mt-8 min-h-12 w-full rounded-md bg-cocoa px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            disabled={controlsDisabled}
            onClick={handleGoogleAuth}
            type="button"
          >
            {pendingOperation === "google"
              ? pendingLabels.google
              : "使用 Google 继续"}
          </button>

          <div className="my-6 flex items-center gap-3 text-sm text-cocoa/75">
            <span aria-hidden="true" className="h-px flex-1 bg-dune" />
            <span>或使用邮箱继续</span>
            <span aria-hidden="true" className="h-px flex-1 bg-dune" />
          </div>

          <div
            aria-label="登录或注册"
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
                setPassword("");
              }}
              className={`min-h-11 border-r border-dune px-4 py-2 disabled:opacity-50 ${mode === "sign_in" ? "bg-clay text-white" : "bg-shell text-cocoa"}`}
            >
              登录
            </button>
            <button
              type="button"
              aria-pressed={mode === "sign_up"}
              disabled={controlsDisabled}
              onClick={() => {
                setMode("sign_up");
                setMessage(null);
                setPassword("");
              }}
              className={`min-h-11 px-4 py-2 disabled:opacity-50 ${mode === "sign_up" ? "bg-clay text-white" : "bg-shell text-cocoa"}`}
            >
              创建账号
            </button>
          </div>
        </>
      ) : null}

      <div className={`${mode === "recovery" ? "mt-8" : "mt-6"} grid gap-4`}>
        <label className="grid gap-2 text-sm text-cocoa/75">
          邮箱
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
        {mode !== "recovery" ? (
          <label className="grid gap-2 text-sm text-cocoa/75">
            密码
            <input
              autoComplete={
                mode === "sign_in" ? "current-password" : "new-password"
              }
              disabled={controlsDisabled}
              minLength={mode === "sign_up" ? 8 : 1}
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="min-h-12 rounded-md border border-dune bg-white px-4 py-3 text-cocoa outline-none disabled:bg-shell disabled:opacity-70"
              placeholder={
                mode === "sign_in"
                  ? "请输入密码"
                  : "请设置一个安全密码"
              }
            />
          </label>
        ) : null}
        {mode === "sign_up" ? (
          <p className="-mt-2 text-sm text-cocoa/65">密码至少需要 8 个字符。</p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={controlsDisabled}
        className="mt-6 min-h-12 w-full rounded-md bg-clay px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pendingOperation === "email_sign_in" ||
        pendingOperation === "email_sign_up" ||
        pendingOperation === "recovery"
          ? pendingLabels[pendingOperation]
          : mode === "recovery"
            ? "发送重置链接"
            : mode === "sign_in"
              ? "使用邮箱登录"
              : "创建账号"}
      </button>

      {mode === "sign_in" ? (
        <button
          type="button"
          disabled={controlsDisabled}
          onClick={() => {
            setMode("recovery");
            setMessage(null);
            setPassword("");
          }}
          className="mt-3 min-h-11 text-sm font-semibold text-clay disabled:opacity-50"
        >
          忘记密码？
        </button>
      ) : null}

      {mode === "recovery" ? (
        <button
          className="mt-3 min-h-11 text-sm font-semibold text-clay disabled:opacity-50"
          disabled={controlsDisabled}
          onClick={() => {
            setMode("sign_in");
            setMessage(null);
          }}
          type="button"
        >
          返回登录
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
