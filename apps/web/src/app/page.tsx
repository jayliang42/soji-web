import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { membershipPlans } from "@soji/domain";
import { PlanCard } from "@/components/plan-card";
import { SectionShell } from "@/components/section-shell";

export const metadata: Metadata = {
  alternates: { canonical: "/" }
};

const outcomes = [
  {
    label: "Spend strategically",
    description:
      "Make large purchases with a plan that protects both your present and your future."
  },
  {
    label: "Talk about money",
    description:
      "Navigate financial decisions with partners, friends, and family more confidently."
  },
  {
    label: "Prepare the next generation",
    description:
      "Use practical tax and legal strategies to give your children a stronger foundation."
  },
  {
    label: "Build lasting wealth",
    description:
      "Create structures that continue caring for the people you love over time."
  }
];

export default function HomePage() {
  return (
    <main>
      <section className="relative h-[calc(100svh-216px)] min-h-[420px] max-h-[628px] overflow-hidden bg-white md:h-[calc(100svh-184px)] md:min-h-[520px] md:max-h-[680px]">
        <Image
          src="/well-endowed-hero.png"
          alt="Well Endowed hardcover book in a bright reading room"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[62%_center]"
        />
        <div className="absolute inset-0 bg-white/70 md:right-[42%]" />
        <div className="relative z-10 mx-auto flex h-full max-w-6xl items-center px-6">
          <div className="max-w-2xl py-6 md:max-w-xl md:py-12">
            <p className="text-xs font-bold uppercase text-cocoa/70">
              Soji presents
            </p>
            <h1 className="mt-3 font-display text-5xl font-black leading-[0.92] text-cocoa sm:text-6xl md:mt-4 md:text-7xl">
              Well Endowed
            </h1>
            <p className="mt-4 text-lg font-semibold leading-7 text-cocoa md:mt-6 md:text-2xl md:leading-8">
              A practical guide to strategic spending, family financial foundations,
              and wealth that lasts beyond one generation.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 md:mt-9 md:gap-3">
              <Link
                href="/library"
                className="rounded-md bg-cocoa px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-charcoal"
              >
                Read a preview
              </Link>
              <Link
                href="/pricing"
                className="rounded-md border-2 border-cocoa bg-white/80 px-6 py-3.5 text-sm font-bold text-cocoa transition-colors hover:bg-cocoa hover:text-white"
              >
                Explore membership
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section data-testid="home-outcomes" className="border-y border-dune bg-shell">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
            <div>
              <p className="text-xs font-bold uppercase text-clay">Inside the work</p>
              <h2 className="mt-4 font-display text-4xl font-bold leading-tight text-cocoa md:text-5xl">
                Money choices that compound into a stronger life.
              </h2>
            </div>
            <ol className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {outcomes.map((outcome, index) => (
                <li key={outcome.label} className="border-t border-dune pt-4">
                  <span className="text-xs font-bold text-clay">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 text-lg font-bold text-cocoa">{outcome.label}</h3>
                  <p className="mt-2 leading-7 text-cocoa/75">{outcome.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <SectionShell
        eyebrow="Membership"
        title="Choose the level of access that matches the depth you want."
        description="Begin with the core ideas, open the complete working library, or add live access for closer support."
      >
        <div className="grid gap-6 lg:grid-cols-3">
          {membershipPlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </SectionShell>

      <section className="bg-cocoa text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-16 md:flex-row md:items-end md:justify-between md:py-20">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase text-white/70">Start reading</p>
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight md:text-5xl">
              Begin with the ideas that can change your next money decision.
            </h2>
          </div>
          <Link
            href="/library"
            className="w-fit shrink-0 rounded-md bg-white px-6 py-3.5 text-sm font-bold text-cocoa transition-colors hover:bg-sand"
          >
            Browse the library
          </Link>
        </div>
      </section>
    </main>
  );
}
