import Link from "next/link";
import { membershipPlans } from "@soji/domain";
import { PlanCard } from "@/components/plan-card";
import { SectionShell } from "@/components/section-shell";

export default function PricingPage() {
  return (
    <main>
      <section className="mx-auto max-w-6xl px-6 pb-8 pt-10">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-[0.74rem] uppercase tracking-[0.34em] text-cocoa/55">
              Membership tiers
            </p>
            <h1 className="mt-5 max-w-4xl font-display text-[5rem] leading-[0.9] tracking-[-0.05em] text-cocoa md:text-[6.4rem]">
              Pricing that feels like subscribing to a premium publication, not buying software.
            </h1>
            <p className="mt-6 max-w-2xl text-xl leading-9 text-cocoa/72">
              Readers enter through public previews, then choose how much depth,
              structure, and proximity they want.
            </p>
          </div>
          <div className="rounded-[28px] border border-black/12 bg-[rgba(248,243,235,0.55)] p-8">
            <p className="text-[0.72rem] uppercase tracking-[0.28em] text-cocoa/55">
              What changes
            </p>
            <div className="mt-5 space-y-5 text-lg leading-8 text-cocoa/76">
              <p>Tier 1 opens the foundational article library.</p>
              <p>Tier 2 is the core offer with case studies, templates, and monthly drops.</p>
              <p>Tier 3 adds intimacy with office hours and direct group access.</p>
            </div>
          </div>
        </div>
      </section>
      <SectionShell
        eyebrow="Pricing"
        title="Subscriptions for every level of access"
        description="The first impression should feel like a premium reading experience. The pricing logic sits underneath, but it should not dominate the aesthetic."
      >
        <div className="grid gap-6 lg:grid-cols-3">
          {membershipPlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </SectionShell>
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-6">
        <div className="rounded-[28px] border border-black/12 bg-[rgba(248,243,235,0.56)] px-8 py-10 md:px-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-[0.72rem] uppercase tracking-[0.28em] text-cocoa/55">
                Need a softer entry point?
              </p>
              <h2 className="mt-4 font-display text-4xl leading-[1] text-cocoa">
                Let readers browse previews first, then convert them when they want the rest.
              </h2>
            </div>
            <Link
              href="/library"
              className="rounded-full border border-cocoa px-7 py-4 text-[0.78rem] font-semibold uppercase tracking-[0.24em] text-cocoa"
            >
              Browse public previews
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
