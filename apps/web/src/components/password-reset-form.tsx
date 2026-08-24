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
          setMessage("新密码至少需要 8 个字符。");
          return;
        }
        if (password !== confirmation) {
          setMessage("两次输入的密码不一致。");
          return;
        }

        startTransition(async () => {
          setMessage(null);
          const supabase = createSupabaseBrowserClient();
          if (!supabase) {
            setMessage("密码重置暂时不可用。");
            return;
          }

          try {
            await updateRecoveredPassword(supabase.auth, password);
            setSucceeded(true);
            setPassword("");
            setConfirmation("");
          } catch {
            setMessage(
              "无法更新密码，请申请新的重置链接后再试。"
            );
          }
        });
      }}
    >
      <div className="grid gap-4">
        <label className="grid gap-2 text-sm text-cocoa/75">
          新密码
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
          确认新密码
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
        {isPending ? "正在更新密码…" : "更新密码"}
      </button>

      {succeeded ? (
        <div className="mt-5 border-l-4 border-sage bg-success-muted px-4 py-3 text-sm text-cocoa" role="status">
          <h2 className="font-display text-2xl">密码已更新</h2>
          <p className="mt-2 text-cocoa/75">
            现在可以使用新密码登录。
          </p>
          <Link
            href="/account"
            className="mt-4 inline-flex min-h-11 items-center rounded-md bg-clay px-5 py-3 font-semibold text-white"
          >
            前往账号中心
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
