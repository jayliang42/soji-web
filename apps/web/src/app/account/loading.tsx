import { SectionShell } from "@/components/section-shell";

function LoadingBar({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded bg-sand motion-safe:animate-pulse ${className}`}
    />
  );
}

export default function AccountLoading() {
  return (
    <main aria-busy="true">
      <SectionShell
        compact
        eyebrow="Account"
        headingLevel={1}
        title="Account"
        description="Your membership, benefits, and purchase record are loading."
      >
        <p className="sr-only" role="status">
          Loading account billing…
        </p>

        <div
          aria-hidden="true"
          className="grid gap-4 lg:grid-cols-[1.15fr_0.9fr_0.95fr]"
          data-loading-section="current-tier"
        >
          <div className="rounded-xl bg-cocoa p-6">
            <LoadingBar className="h-4 w-24 bg-white/20" />
            <LoadingBar className="mt-5 h-9 w-40 bg-white/20" />
            <LoadingBar className="mt-4 h-4 w-56 max-w-full bg-white/20" />
            <LoadingBar className="mt-6 h-11 w-44 bg-white/20" />
          </div>
          <div className="rounded-xl border border-dune bg-shell p-6">
            <LoadingBar className="h-4 w-28" />
            <LoadingBar className="mt-4 h-9 w-20" />
            <LoadingBar className="mt-4 h-4 w-56 max-w-full" />
            <LoadingBar className="mt-3 h-4 w-44 max-w-full" />
          </div>
          <div className="rounded-xl border border-dune bg-cream p-6">
            <LoadingBar className="h-4 w-36" />
            <div className="mt-4 grid gap-2">
              <LoadingBar className="h-11 w-full" />
              <LoadingBar className="h-11 w-full" />
              <LoadingBar className="h-11 w-full" />
            </div>
          </div>
        </div>

        <section
          aria-labelledby="loading-subscriptions-heading"
          className="mt-6 rounded-xl border border-dune bg-shell p-5 sm:p-7"
          data-loading-section="subscriptions"
        >
          <p className="text-sm font-semibold uppercase text-cocoa/70">
            Membership billing
          </p>
          <h2
            className="mt-2 font-display text-2xl font-semibold text-cocoa"
            id="loading-subscriptions-heading"
          >
            Subscriptions
          </h2>
          <div
            aria-hidden="true"
            className="mt-4 border-y border-dune py-6"
          >
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:gap-6">
              <div>
                <LoadingBar className="h-5 w-44 max-w-full" />
                <LoadingBar className="mt-3 h-4 w-52 max-w-full" />
                <LoadingBar className="mt-3 h-4 w-36 max-w-full" />
              </div>
              <LoadingBar className="h-11 w-full md:w-36" />
            </div>
          </div>
        </section>

        <section
          aria-labelledby="loading-purchases-heading"
          className="mt-6 rounded-xl border border-dune bg-shell p-5 sm:p-7"
          data-loading-section="purchases"
        >
          <p className="text-sm font-semibold uppercase text-cocoa/70">
            Billing record
          </p>
          <h2
            className="mt-2 font-display text-2xl font-semibold text-cocoa"
            id="loading-purchases-heading"
          >
            Standalone purchases
          </h2>
          <div
            aria-hidden="true"
            className="mt-4 border-y border-dune py-6"
          >
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:gap-6">
              <div>
                <LoadingBar className="h-5 w-52 max-w-full" />
                <LoadingBar className="mt-3 h-4 w-36 max-w-full" />
                <LoadingBar className="mt-3 h-4 w-48 max-w-full" />
              </div>
              <LoadingBar className="h-11 w-full md:w-36" />
            </div>
          </div>
        </section>
      </SectionShell>
    </main>
  );
}
