import Image from "next/image";
import Link from "next/link";
import { membershipPlans } from "@soji/domain";
import { PlanCard } from "@/components/plan-card";
import { SectionShell } from "@/components/section-shell";

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<{ cover?: string }>;
}) {
  const params = await searchParams;
  const coverMode = params.cover === "cutout" ? "cutout" : "original";

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
              {coverMode === "cutout" ? (
                <>
                  <div className="absolute inset-8 rounded-[42px] bg-[radial-gradient(circle_at_center,rgba(214,224,154,0.94),rgba(186,209,120,0.56)_52%,transparent_80%)] blur-3xl" />
                  <div className="absolute inset-x-12 bottom-8 top-14 rounded-[48px] bg-[radial-gradient(circle_at_50%_35%,rgba(239,241,214,0.52),rgba(202,214,145,0.32)_54%,transparent_78%)]" />
                </>
              ) : null}
              <div className="relative px-1 py-1">
                <div
                  className={
                    coverMode === "cutout"
                      ? "relative aspect-[0.7] overflow-hidden"
                      : "relative aspect-[0.7] overflow-hidden rounded-[12px] border border-black/15 bg-[#f4eee3] p-4 shadow-[16px_16px_0_rgba(17,17,17,0.12)]"
                  }
                >
                  <div className={coverMode === "cutout" ? "relative h-full w-full" : "relative h-full w-full overflow-hidden rounded-[6px]"}>
                    <Image
                      src={
                        coverMode === "cutout"
                          ? "/well-endowed-cutout.png"
                          : "/Image_2026-03-14_185549_786.jpg"
                      }
                      alt="Well Endowed cover artwork"
                      fill
                      priority
                      className={
                        coverMode === "cutout"
                          ? "object-contain object-center"
                          : "object-cover object-center"
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-darktext/70">
                <Link
                  href="/"
                  className={
                    coverMode === "original"
                      ? "rounded-full bg-black px-4 py-2 text-white"
                      : "rounded-full border border-black/20 px-4 py-2"
                  }
                >
                  Original cover
                </Link>
                <Link
                  href="/?cover=cutout"
                  className={
                    coverMode === "cutout"
                      ? "rounded-full bg-black px-4 py-2 text-white"
                      : "rounded-full border border-black/20 px-4 py-2"
                  }
                >
                  Cutout blend
                </Link>
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
