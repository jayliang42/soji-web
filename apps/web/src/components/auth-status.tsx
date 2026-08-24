import Link from "next/link";
import type { UserProfile } from "@soji/types";
import { hasSupabaseConfig } from "@/lib/env";
import { LogoutButton } from "@/components/logout-button";

export function AuthStatus({
  user,
  source
}: {
  user: UserProfile | null;
  source: "supabase" | "demo";
}) {
  const isDemo = source === "demo";

  return (
    <div className="rounded-lg border border-dune bg-shell p-5 text-sm text-cocoa/80">
      <p className="font-semibold text-cocoa">
        {user ? "已登录" : "尚未登录"}
      </p>
      <p className="mt-2">
        {user
          ? `${user.email}${isDemo ? " 正在使用本地演示访问权限。" : ""}`
          : "创建账号后可保存购买记录并解锁会员内容。"}
      </p>
      <div className="mt-4 flex gap-4">
        {user ? (
          <LogoutButton enabled={hasSupabaseConfig() && source === "supabase"} />
        ) : (
          <Link href="/login" className="font-semibold text-clay">
            登录
          </Link>
        )}
      </div>
    </div>
  );
}
