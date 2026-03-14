import { getPlanByTier } from "@soji/domain";
import { SectionShell } from "@/components/section-shell";
import { getCurrentEntitlements, getMockSession } from "@/lib/session";

export default async function AccountPage() {
  const user = await getMockSession();
  const plan = getPlanByTier(user.tier);
  const entitlements = await getCurrentEntitlements();

  return (
    <main>
      <SectionShell
        eyebrow="Account"
        title={user.fullName ?? user.email}
        description="This page is the canonical view of account-level access. Web and app should render from the same entitlement calculation."
      >
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-[28px] border border-dune bg-shell p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-cocoa/60">Current tier</p>
            <h3 className="mt-3 font-display text-4xl text-cocoa">{plan?.name ?? "Free"}</h3>
            <p className="mt-3 text-cocoa/75">{user.email}</p>
            <p className="mt-2 text-sm text-cocoa/60">
              Providers: {user.providers.join(", ")}
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
      </SectionShell>
    </main>
  );
}
