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
        eyebrow="Account"
        headingLevel={1}
        title="Account"
        description="Your membership and purchase record is loading."
      >
        <p className="sr-only" role="status">
          Loading account billing…
        </p>

        <div
          aria-hidden="true"
          className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]"
          data-loading-section="current-tier"
        >
          <div className="rounded-lg border border-dune bg-shell p-6">
            <LoadingBar className="h-4 w-24" />
            <LoadingBar className="mt-4 h-9 w-40" />
            <LoadingBar className="mt-4 h-4 w-56 max-w-full" />
            <LoadingBar className="mt-3 h-4 w-44 max-w-full" />
          </div>
          <div className="rounded-lg border border-dune bg-shell p-6">
            <LoadingBar className="h-4 w-36" />
            <div className="mt-4 flex flex-wrap gap-3">
              <LoadingBar className="h-9 w-28" />
              <LoadingBar className="h-9 w-36" />
            </div>
          </div>
        </div>

        <section
          aria-labelledby="loading-subscriptions-heading"
          className="mt-6 border-t border-dune pt-6"
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
          className="mt-6 border-t border-dune pt-6"
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
