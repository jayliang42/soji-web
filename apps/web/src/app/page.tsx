import Image from "next/image";
import Link from "next/link";
import type { Metadata, Route } from "next";
import { membershipPlans } from "@soji/domain";

export const metadata: Metadata = {
  alternates: { canonical: "/" }
};

const outcomes = [
  {
    label: "Spend strategically",
    href: "/library?focus=spending" as Route,
    description:
      "Make large purchases with a plan that protects both your present and your future."
  },
  {
    label: "Talk about money",
    href: "/library?focus=family" as Route,
    description:
      "Navigate financial decisions with partners, friends, and family more confidently."
  },
  {
    label: "Prepare the next generation",
    href: "/library?focus=family" as Route,
    description:
      "Use practical tax and legal strategies to give your children a stronger foundation."
  },
  {
    label: "Build lasting wealth",
    href: "/library?focus=spending" as Route,
    description:
      "Create structures that continue caring for the people you love over time."
  }
];

const pathways = [
  {
    eyebrow: "01 · Read",
    meta: "Free previews",
    title: "Start with a clear explanation",
    description:
      "Browse public previews, then open deeper member guides when you want the full framework.",
    href: "/library?focus=start",
    action: "Explore the library"
  },
  {
    eyebrow: "02 · Apply",
    meta: "From $49 once",
    title: "Use one focused tool",
    description:
      "Turn an idea into a decision with practical templates you can keep in your account.",
    href: "/products",
    action: "Browse practical tools"
  },
  {
    eyebrow: "03 · Join",
    meta: "From $29 monthly",
    title: "Build an ongoing practice",
    description:
      "Open the member library and choose the depth of new material and support that fits you.",
    href: "/pricing#plan-finder-heading",
    action: "Find your membership"
  },
  {
    eyebrow: "04 · Ask",
    meta: "Guided membership",
    title: "Bring the hard questions",
    description:
      "Add live office hours when a higher-stakes decision needs closer context and support.",
    href: "/office-hours",
    action: "See office hours"
  }
] as const;

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
                  <h3 className="mt-2 text-lg font-bold text-cocoa">
                    {outcome.label}
                  </h3>
                  <p className="mt-2 leading-7 text-cocoa/75">
                    {outcome.description}
                  </p>
                  <Link
                    href={outcome.href}
                    className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-clay underline decoration-clay/30 underline-offset-4 hover:decoration-clay"
                  >
                    Explore related guides
                    <span aria-hidden="true" className="ml-1">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="bg-cream" aria-labelledby="how-soji-works">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase text-clay">
                Choose your starting point
              </p>
              <h2
                id="how-soji-works"
                className="mt-4 font-display text-4xl font-bold leading-tight text-cocoa md:text-5xl"
              >
                Choose the next step that fits today.
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-cocoa/72">
              Read freely, buy one practical tool, build an ongoing membership,
              or prepare for live support. Each path has a clear destination.
            </p>
          </div>
          <ol className="mt-10 grid gap-5 md:grid-cols-2">
            {pathways.map((pathway) => (
              <li
                key={pathway.href}
                className="group flex min-h-64 flex-col overflow-hidden rounded-xl border border-dune bg-shell p-6 transition-all duration-200 hover:-translate-y-1 hover:border-clay/45 hover:shadow-xl motion-reduce:transform-none sm:p-8"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-clay">
                    {pathway.eyebrow}
                  </p>
                  <p className="rounded-full border border-dune bg-cream px-3 py-1.5 text-xs font-bold text-cocoa/68">
                    {pathway.meta}
                  </p>
                </div>
                <h3 className="mt-5 font-display text-3xl font-bold leading-tight text-cocoa">
                  {pathway.title}
                </h3>
                <p className="mt-4 leading-7 text-cocoa/72">
                  {pathway.description}
                </p>
                <Link
                  href={pathway.href}
                  className="mt-auto inline-flex min-h-11 items-center pt-6 font-bold text-clay underline decoration-clay/35 underline-offset-4 transition-colors group-hover:text-cocoa group-hover:decoration-cocoa"
                >
                  {pathway.action}
                  <span aria-hidden="true" className="ml-2">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          <p className="mt-6 max-w-3xl text-sm leading-6 text-cocoa/62">
            Educational information only. Soji does not provide individualized
            financial, tax, investment, or legal advice.
          </p>
        </div>
      </section>

      <section
        aria-labelledby="home-membership-heading"
        className="border-y border-dune bg-white"
      >
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:py-20">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase text-clay">
              Membership at a glance
            </p>
            <h2
              className="mt-4 font-display text-4xl font-bold leading-tight text-cocoa md:text-5xl"
              id="home-membership-heading"
            >
              Three depths of access, one clear comparison.
            </h2>
            <p className="mt-5 text-lg leading-8 text-cocoa/72">
              Use the plan finder for a recommendation, then review every
              benefit and purchase detail on the membership page.
            </p>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2">
              <Link
                className="inline-flex min-h-11 items-center rounded-md bg-cocoa px-5 text-sm font-bold text-white transition-colors hover:bg-charcoal"
                href="/pricing#plan-finder-heading"
              >
                Use the plan finder
              </Link>
              <Link
                className="inline-flex min-h-11 items-center text-sm font-bold text-clay underline decoration-clay/35 underline-offset-4 hover:decoration-clay"
                href="/pricing#membership-options"
              >
                Compare every benefit
              </Link>
            </div>
          </div>

          <ol className="divide-y divide-dune border-y border-dune">
            {membershipPlans.map((plan) => (
              <li key={plan.id}>
                <Link
                  className="group grid min-h-40 gap-4 px-1 py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-4"
                  href={`/pricing#plan-${plan.id}` as Route}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-clay">
                        {plan.name}
                      </p>
                      {plan.featured ? (
                        <span className="rounded-full bg-accent-muted px-3 py-1 text-xs font-bold text-cocoa">
                          Most popular
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-3 font-display text-3xl font-bold leading-tight text-cocoa">
                      {plan.description}
                    </h3>
                  </div>
                  <div className="flex items-baseline justify-between gap-5 sm:block sm:text-right">
                    <p className="font-display text-4xl font-bold text-cocoa">
                      ${plan.monthlyPrice}
                    </p>
                    <p className="text-sm font-bold text-cocoa/58">per month</p>
                    <span className="mt-3 hidden text-sm font-bold text-clay group-hover:text-cocoa sm:inline-block">
                      Review plan →
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

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
