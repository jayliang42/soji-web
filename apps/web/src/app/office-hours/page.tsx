import Link from "next/link";
import type { Metadata } from "next";
import { SectionShell } from "@/components/section-shell";
import { DataEmpty, DataUnavailable } from "@/components/data-state";
import { getOfficeHourSnapshot } from "@/lib/office-hours";
import {
  buildOfficeHourPresentation,
  type OfficeHourPresentation
} from "@/lib/office-hours-presentation";
import { getSessionSnapshot } from "@/lib/session";

export const metadata: Metadata = {
  title: "Office Hours",
  description:
    "Review upcoming Well Endowed member office hours, live support sessions, and available replays.",
  alternates: { canonical: "/office-hours" }
};

function OfficeHourCard({
  presentation
}: {
  presentation: OfficeHourPresentation;
}) {
  const externalAction = presentation.primaryAction?.href
    ? presentation.primaryAction
    : null;
  const membershipAction =
    presentation.primaryAction?.label === "Compare membership";

  return (
    <article className="rounded-lg border border-dune bg-shell p-6 sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-clay">
        {presentation.statusLabel}
      </p>
      <time
        dateTime={presentation.startsAt}
        className="mt-3 block text-sm font-semibold text-cocoa/70"
      >
        {presentation.startsAtLabel}
      </time>
      <h3 className="mt-4 font-display text-3xl font-bold leading-[1.05] text-cocoa sm:text-4xl">
        {presentation.title}
      </h3>
      <p className="mt-4 max-w-[48ch] text-base leading-relaxed text-cocoa/72">
        Bring one decision, the facts you already know, and the tradeoff that
        still feels difficult.
      </p>
      <p className="mt-5 text-sm font-semibold text-cocoa">
        {presentation.accessLabel}
      </p>
      <div className="mt-7 flex flex-wrap items-center gap-3">
        {externalAction ? (
          <a
            href={externalAction.href}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex min-h-11 items-center rounded-md bg-cocoa px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-charcoal"
          >
            {externalAction.label}
            <span className="sr-only"> (Opens in a new tab)</span>
          </a>
        ) : membershipAction ? (
          <Link
            href="/pricing"
            className="inline-flex min-h-11 items-center rounded-md bg-cocoa px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-charcoal"
          >
            Compare membership
          </Link>
        ) : presentation.primaryAction ? (
          <span className="inline-flex min-h-11 items-center rounded-md border border-dune bg-sand px-5 py-3 text-sm font-semibold text-cocoa/75">
            {presentation.primaryAction.label}
          </span>
        ) : (
          <span className="inline-flex min-h-11 items-center rounded-md border border-dune bg-shell px-5 py-3 text-sm font-semibold text-cocoa/70">
            Access unavailable
          </span>
        )}
      </div>
    </article>
  );
}

export default async function OfficeHoursPage() {
  const [snapshot, officeHourSnapshot] = await Promise.all([
    getSessionSnapshot(),
    getOfficeHourSnapshot()
  ]);
  const now = new Date();
  const presentations = officeHourSnapshot.items.map((session) =>
    buildOfficeHourPresentation(
      session,
      {
        entitlements: snapshot.entitlements,
        isAuthenticated: Boolean(snapshot.user),
        verificationUnavailable: Boolean(
          snapshot.error || officeHourSnapshot.error
        )
      },
      now
    )
  );
  const upcoming = presentations
    .filter((item) => item.lifecycle === "upcoming")
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
  const replays = presentations
    .filter((item) =>
      ["replay_pending", "replay_ready"].includes(item.lifecycle)
    )
    .sort((left, right) => right.startsAt.localeCompare(left.startsAt));
  const unavailable = presentations.filter(
    (item) => item.lifecycle === "unavailable"
  );

  return (
    <main>
      <SectionShell
        eyebrow="Office hours"
        headingLevel={1}
        title="Closer support for higher-stakes decisions."
        description="Bring a specific money or life decision, compare tradeoffs with a clearer framework, and learn alongside other members. Sessions provide financial education, not individualized financial advice."
      >
        {snapshot.error ? (
          <div className="mb-6">
            <DataUnavailable
              title="Membership access is temporarily unavailable"
              description="We could not verify access right now. No member-only content or private links have been shown. Your membership has not changed; please try again shortly."
            />
          </div>
        ) : null}
        {officeHourSnapshot.error ? (
          <div className="mb-6">
            <DataUnavailable
              title="Office hours could not be loaded"
              description="No signup or replay links are available until the schedule connection recovers."
            />
          </div>
        ) : null}
        {!officeHourSnapshot.error && officeHourSnapshot.items.length === 0 ? (
          <div className="mb-6">
            <DataEmpty
              title="No live session is scheduled"
              description="Browse the library now; upcoming sessions and new replays will appear here."
            />
          </div>
        ) : null}
        {upcoming.length > 0 ? (
          <section aria-labelledby="office-hours-upcoming">
            <div className="mb-6 max-w-2xl">
              <h2
                id="office-hours-upcoming"
                className="font-display text-4xl font-bold text-cocoa"
              >
                Upcoming
              </h2>
              <p className="mt-3 leading-relaxed text-cocoa/72">
                Reserve a place, then arrive with one decision you want to make
                more deliberately.
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              {upcoming.map((presentation) => (
                <OfficeHourCard
                  key={presentation.id}
                  presentation={presentation}
                />
              ))}
            </div>
          </section>
        ) : null}

        {replays.length > 0 ? (
          <section
            aria-labelledby="office-hours-replays"
            className={upcoming.length > 0 ? "mt-12" : undefined}
          >
            <div className="mb-6 max-w-2xl">
              <h2
                id="office-hours-replays"
                className="font-display text-4xl font-bold text-cocoa"
              >
                Replay library
              </h2>
              <p className="mt-3 leading-relaxed text-cocoa/72">
                Revisit completed sessions when a similar decision appears in
                your own life.
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              {replays.map((presentation) => (
                <OfficeHourCard
                  key={presentation.id}
                  presentation={presentation}
                />
              ))}
            </div>
          </section>
        ) : null}

        {unavailable.length > 0 ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {unavailable.map((presentation) => (
              <OfficeHourCard
                key={presentation.id}
                presentation={presentation}
              />
            ))}
          </div>
        ) : null}

        <div className="mt-8 border-t border-dune pt-6 text-sm text-cocoa/75">
          New members can start with previews first.{" "}
          <Link href="/library" className="font-semibold text-clay">
            Browse the library
          </Link>
          .
        </div>
      </SectionShell>
    </main>
  );
}
