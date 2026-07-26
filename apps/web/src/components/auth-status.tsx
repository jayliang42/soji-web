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
        {user ? "Signed in" : "Not signed in"}
      </p>
      <p className="mt-2">
        {user
          ? `${user.email}${isDemo ? " is using demo access for local preview." : ""}`
          : "Create an account to save purchases and unlock member-only content."}
      </p>
      <div className="mt-4 flex gap-4">
        {user ? (
          <LogoutButton enabled={hasSupabaseConfig() && source === "supabase"} />
        ) : (
          <Link href="/login" className="font-semibold text-clay">
            Login
          </Link>
        )}
      </div>
    </div>
  );
}
