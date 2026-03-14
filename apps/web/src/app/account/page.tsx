import { getPlanByTier } from "@soji/domain";
import { AuthStatus } from "@/components/auth-status";
import { SectionShell } from "@/components/section-shell";
import { getCurrentEntitlements, getSessionSnapshot } from "@/lib/session";

export default async function AccountPage() {
  const snapshot = await getSessionSnapshot();
  const user = snapshot.user;
  const plan = getPlanByTier(user?.tier ?? "free");
  const entitlements = await getCurrentEntitlements();

  return (
    <main>
      <SectionShell
        eyebrow="Account"
        title={user?.fullName ?? user?.email ?? "Guest"}
        description="This page is the canonical view of account-level access. Web and app should render from the same entitlement calculation."
      >
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-[28px] border border-dune bg-shell p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-cocoa/60">Current tier</p>
            <h3 className="mt-3 font-display text-4xl text-cocoa">{plan?.name ?? "Free"}</h3>
            <p className="mt-3 text-cocoa/75">{user?.email ?? "No active session"}</p>
            <p className="mt-2 text-sm text-cocoa/60">
              Providers: {user?.providers.join(", ") ?? "Not available"}
            </p>
          </div>
          <div className="rounded-[28px] border border-dune bg-shell p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-cocoa/60">
              Active entitlements
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {entitlements.map((entitlement) => (
                <span
                  key={entitlement}
                  className="rounded-full bg-sand px-4 py-2 text-sm text-cocoa"
                >
                  {entitlement}
                </span>
              ))}
            </div>
          </div>
        </div>
        {snapshot.error ? (
          <div className="mt-6 rounded-[24px] border border-clay/30 bg-[#fff1ea] px-5 py-4 text-sm text-cocoa">
            Supabase session query failed: {snapshot.error}
          </div>
        ) : null}
        <div className="mt-6">
          <AuthStatus user={snapshot.user} source={snapshot.source} />
        </div>
      </SectionShell>
    </main>
  );
}
