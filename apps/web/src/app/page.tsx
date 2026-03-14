import Link from "next/link";
import { membershipPlans } from "@soji/domain";
import { PlanCard } from "@/components/plan-card";
import { SectionShell } from "@/components/section-shell";

export default function HomePage() {
  return (
    <main>
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-2">
        <div className="mx-auto max-w-[910px]">
          <h1 className="font-display text-[5.4rem] leading-[0.86] tracking-[-0.06em] text-cocoa md:text-[7.2rem]">
            Soji
          </h1>
          <p className="mt-6 max-w-[860px] text-[2.05rem] leading-[1.17] tracking-[-0.045em] text-cocoa md:text-[3rem]">
            The membership for strategic spending, building a financial foundation,
            and turning content into lasting generational wealth.
          </p>
        </div>
        <div className="mt-16 grid gap-14 lg:grid-cols-[0.72fr_1fr] lg:items-center">
          <div className="mx-auto w-full max-w-[340px]">
            <div className="relative rounded-[10px] border border-black/18 bg-[#f7f0e4] p-4 shadow-[16px_16px_0_rgba(17,17,17,0.14)]">
              <div className="aspect-[0.7] rounded-[4px] bg-[linear-gradient(180deg,#eee6d9_0%,#f7f1e7_100%)] p-5">
                <p className="text-[0.58rem] font-semibold uppercase leading-4 tracking-[0.14em] text-cocoa/75">
                  The secrets to strategic spending, building a financial foundation
                  for you and your family, and creating lasting generational wealth
                </p>
                <div className="mt-8">
                  <p className="font-display text-[4rem] leading-[0.9] tracking-[-0.055em] text-[#d2a42f]">
                    Well
                  </p>
                  <p className="font-display text-[4rem] leading-[0.9] tracking-[-0.055em] text-[#d2a42f]">
                    Endowed
                  </p>
                </div>
                <div className="mt-10 rounded-[6px] bg-[#ead7b6] px-4 py-12 text-center text-sm uppercase tracking-[0.18em] text-cocoa/55">
                  Cover visual
                </div>
                <p className="mt-6 font-display text-[2.1rem] tracking-[-0.03em] text-[#a87512]">
                  Soji Club
                </p>
              </div>
            </div>
          </div>
          <div className="max-w-[650px]">
            <h2 className="text-[3.5rem] font-semibold leading-[0.92] tracking-[-0.055em] text-cocoa md:text-[5rem]">
              This membership will help you with...
            </h2>
            <div className="mt-9 space-y-5 text-lg leading-8 text-cocoa/88 md:text-[1.3rem] md:leading-[2.35rem]">
              {[
                "Maximizing the value of your biggest financial decisions across home, car, insurance, and lifestyle.",
                "Understanding how to navigate money conversations with partners, family, and the people around you.",
                "Building a financial system that supports your kids, your future, and the generations after you.",
                "Turning content into a high-trust preview funnel that moves readers into paid membership tiers."
              ].map((point) => (
                <div key={point} className="flex gap-4">
                  <span className="mt-1 text-[2rem] leading-none text-[#447c4c]">✓</span>
                  <p>{point}</p>
                </div>
              ))}
            </div>
            <div className="mt-11 flex flex-wrap gap-4">
              <Link
                href="/pricing"
                className="rounded-full bg-black px-7 py-4 text-[0.78rem] font-semibold uppercase tracking-[0.24em] text-white"
              >
                Explore membership
              </Link>
              <Link
                href="/library"
                className="rounded-full border border-black px-7 py-4 text-[0.78rem] font-semibold uppercase tracking-[0.24em] text-cocoa"
              >
                Preview content
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-8 border-t border-black/10 py-10 md:grid-cols-3">
          <div>
            <p className="text-[0.72rem] uppercase tracking-[0.28em] text-cocoa/55">
              Public preview
            </p>
            <p className="mt-3 text-xl leading-8 text-cocoa/82">
              Let readers browse enough to trust the voice before they register.
            </p>
          </div>
          <div>
            <p className="text-[0.72rem] uppercase tracking-[0.28em] text-cocoa/55">
              Paid depth
            </p>
            <p className="mt-3 text-xl leading-8 text-cocoa/82">
              Gate the real value behind essays, case studies, templates, and updates.
            </p>
          </div>
          <div>
            <p className="text-[0.72rem] uppercase tracking-[0.28em] text-cocoa/55">
              Intimate access
            </p>
            <p className="mt-3 text-xl leading-8 text-cocoa/82">
              Add office hours and private group access for the highest tier.
            </p>
          </div>
        </div>
      </section>
      <SectionShell
        eyebrow="Membership"
        title="Choose the level of access that matches the depth you want."
        description="The structure is simple: public previews on the surface, paid editorial depth underneath, and increasingly personal access at the top tier."
      >
        <div className="grid gap-6 lg:grid-cols-3">
          {membershipPlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </SectionShell>
      <section className="mx-auto max-w-6xl px-6 pb-24 pt-6">
        <div className="rounded-[28px] border border-black/12 bg-[rgba(248,243,235,0.46)] px-8 py-10 backdrop-blur md:px-12">
          <p className="text-[0.72rem] uppercase tracking-[0.28em] text-cocoa/55">
            Start reading
          </p>
          <h2 className="mt-4 max-w-4xl font-display text-5xl leading-[0.95] text-cocoa">
            Build the site like a book launch page, but monetize it like a membership product.
          </h2>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/library"
              className="rounded-full bg-black px-7 py-4 text-[0.78rem] font-semibold uppercase tracking-[0.24em] text-white"
            >
              Preview the library
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-black px-7 py-4 text-[0.78rem] font-semibold uppercase tracking-[0.24em] text-cocoa"
            >
              Create account
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
