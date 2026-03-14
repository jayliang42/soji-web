import Link from "next/link";
import type { UserProfile } from "@soji/types";

export function AuthStatus({
  user,
  source
}: {
  user: UserProfile | null;
  source: "supabase" | "demo";
}) {
  return (
    <div className="rounded-[24px] border border-dune bg-shell p-5 text-sm text-cocoa/80">
      <p className="font-semibold text-cocoa">
        Session source: {source === "supabase" ? "Supabase" : "Demo fallback"}
      </p>
      <p className="mt-2">
        {user
          ? `Signed in as ${user.email}`
          : "No active session. Once Supabase env vars are set, this will reflect the real auth state."}
      </p>
      <div className="mt-4 flex gap-4">
        <Link href="/login" className="font-semibold text-clay">
          Login
        </Link>
      </div>
    </div>
  );
}
