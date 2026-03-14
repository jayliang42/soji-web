import Image from "next/image";
import Link from "next/link";
import { membershipPlans } from "@soji/domain";
import { PlanCard } from "@/components/plan-card";
import { SectionShell } from "@/components/section-shell";

export default function HomePage() {
  return (
    <main>
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-12">
        <div className="mx-auto max-w-[920px] text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-darktext/60">
            Soji presents
          </p>
          <h1 className="font-display text-7xl leading-[0.85] tracking-[-0.055em] text-darktext md:text-9xl font-black">
            Well Endowed
          </h1>
          <p className="mt-6 max-w-[800px] mx-auto text-xl leading-[1.4] text-darktext md:text-2xl font-medium">
            The Secrets To Strategic Spending, Building A Financial Foundation For You And Your Family, And Creating Lasting Generational Wealth
          </p>
        </div>
        <div className="mt-16 grid gap-12 lg:grid-cols-2 lg:items-start">
          <div className="mx-auto w-full max-w-[340px] order-2 lg:order-1">
            <div className="relative">
              <div className="absolute inset-4 rounded-[26px] bg-[radial-gradient(circle_at_center,rgba(216,248,149,0.95),rgba(166,234,99,0.55)_48%,transparent_76%)] blur-2xl" />
              <div className="relative rounded-[10px] border border-black/18 bg-[#f7f0e4] p-4 shadow-[16px_16px_0_rgba(17,17,17,0.14)]">
                <div className="relative aspect-[0.7] overflow-hidden rounded-[4px] bg-[linear-gradient(180deg,#eef0dc_0%,#e6edd1_100%)]">
                  <Image
                    src="/Image_2026-03-14_185549_786.jpg"
                    alt="Well Endowed cover artwork"
                    fill
                    priority
                    className="object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(166,234,99,0.08),rgba(166,234,99,0.16))] mix-blend-multiply" />
                  <div className="absolute inset-0 ring-1 ring-black/6" />
                </div>
              </div>
            </div>
          </div>
          <div className="max-w-[680px] order-1 lg:order-2">
            <h2 className="text-4xl font-black leading-[1.1] text-darktext md:text-5xl">
              This Book Will Help You With...
            </h2>
            <div className="mt-8 space-y-4 text-lg leading-relaxed text-darktext md:text-xl">
              {[
                "Maximizing the benefits of life's largest purchases (house, car, insurance, and more!)",
                "Understanding how to navigate money topics with partners, friends, and family",
                "Setting your kids up for financial success through tax strategies and legal loopholes",
                "Building generational wealth that will care for your loved ones... even after you're gone"
              ].map((point) => (
                <div key={point} className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-checkgreen flex items-center justify-center mt-0.5">
                    <span className="text-white text-sm font-bold">✓</span>
                  </div>
                  <p className="font-medium">{point}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/login"
                className="rounded-full bg-black px-8 py-4 text-sm font-bold text-white hover:bg-gray-800 transition-all duration-200"
              >
                Create account
              </Link>
              <Link
                href="/library"
                className="rounded-full border-2 border-black px-8 py-4 text-sm font-bold text-black hover:bg-black hover:text-white transition-all duration-200"
              >
                Preview content
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-3xl bg-white/10 backdrop-blur-sm border border-darktext/20 p-10">
          <div className="grid gap-10 md:grid-cols-3">
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-darktext/80">
                Public preview
              </p>
              <p className="text-lg leading-relaxed text-darktext font-semibold">
                Let readers browse enough to trust the voice before they register.
              </p>
            </div>
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-darktext/80">
                Paid depth
              </p>
              <p className="text-lg leading-relaxed text-darktext font-semibold">
                Gate the real value behind essays, case studies, templates, and updates.
              </p>
            </div>
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-darktext/80">
                Intimate access
              </p>
              <p className="text-lg leading-relaxed text-darktext font-semibold">
                Add office hours and private group access for the highest tier.
              </p>
            </div>
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
      <section className="mx-auto max-w-6xl px-6 pb-28 pt-8">
        <div className="rounded-3xl border border-black/15 bg-white px-10 py-14 shadow-xl md:px-16">
          <p className="text-xs font-bold uppercase tracking-widest text-darktext/60">
            Start reading
          </p>
          <h2 className="mt-6 max-w-4xl font-display text-5xl leading-[0.95] text-darktext font-bold">
            Build the site like a book launch page, but monetize it like a membership product.
          </h2>
          <div className="mt-10 flex flex-wrap gap-5">
            <Link
              href="/library"
              className="rounded-full bg-black px-8 py-4 text-sm font-bold tracking-wide text-white hover:bg-gray-800 transition-all duration-200 shadow-lg"
            >
              Preview the library
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border-2 border-black px-8 py-4 text-sm font-bold tracking-wide text-black hover:bg-black hover:text-white transition-all duration-200"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
