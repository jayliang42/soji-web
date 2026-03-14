import Link from "next/link";
import { marketingHighlights, membershipPlans } from "@soji/domain";
import { PlanCard } from "@/components/plan-card";
import { SectionShell } from "@/components/section-shell";

export default function HomePage() {
  return (
    <main>
      <section className="mx-auto grid min-h-[70vh] max-w-6xl gap-10 px-6 py-16 md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-clay">
            Editorial Membership
          </p>
          <h1 className="mt-6 max-w-3xl font-display text-6xl leading-[0.95] text-cocoa">
            A premium money membership built for web and app from day one.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-cocoa/75">
            Soji combines brand-driven content, recurring memberships, paid digital
            products, and private community access under one entitlement system.
          </p>
          <div className="mt-8 flex gap-4">
            <Link
              href="/pricing"
              className="rounded-full bg-cocoa px-6 py-3 text-sm font-semibold text-white"
            >
              Explore membership
            </Link>
            <Link
              href="/library"
              className="rounded-full border border-cocoa px-6 py-3 text-sm font-semibold text-cocoa"
            >
              Preview library
            </Link>
          </div>
        </div>
        <div className="rounded-[40px] border border-dune bg-shell p-8 shadow-sm">
          <div className="grid gap-4">
            {marketingHighlights.map((item) => (
              <div key={item} className="rounded-[24px] bg-sand p-5 text-cocoa">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
      <SectionShell
        eyebrow="Membership"
        title="Three tiers, one shared entitlement model"
        description="The same account unlocks access on web, in app, and across one-off digital products."
      >
        <div className="grid gap-6 md:grid-cols-3">
          {membershipPlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </SectionShell>
    </main>
  );
}
