import Link from "next/link";
import type { Metadata } from "next";
import { CopySessionDetailsButton } from "@/components/copy-session-details-button";
import { OfficeHourCalendarButton } from "@/components/office-hour-calendar-button";
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

function getOfficeHourDateParts(startsAt: string) {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return {
    day: new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      timeZone: "America/Chicago"
    }).format(date),
    month: new Intl.DateTimeFormat("en-US", {
      month: "short",
      timeZone: "America/Chicago"
    })
      .format(date)
      .toUpperCase()
  };
}

function sessionGridClass(itemCount: number) {
  return itemCount === 1
    ? "grid max-w-4xl gap-6"
    : "grid gap-6 lg:grid-cols-2";
}

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
  const isUpcoming = presentation.lifecycle === "upcoming";
  const isUnavailable = presentation.lifecycle === "unavailable";
  const dateParts = getOfficeHourDateParts(presentation.startsAt);
  const primaryActionClass = isUpcoming
    ? "bg-white text-cocoa hover:bg-cream"
    : "bg-cocoa text-white hover:bg-charcoal";

  return (
    <article
      className={`relative overflow-hidden rounded-xl border p-6 sm:p-8 ${
        isUpcoming
          ? "border-cocoa bg-cocoa text-white shadow-xl"
          : isUnavailable
            ? "border-dune bg-cream text-cocoa"
            : "border-dune bg-shell text-cocoa"
      }`}
    >
      {isUpcoming ? (
        <>
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-20 h-56 w-56 rounded-full border border-white/10"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-24 right-16 h-48 w-48 rounded-full bg-white/5"
          />
        </>
      ) : null}

      <div className="relative grid gap-5 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:gap-7">
        <div
          aria-hidden="true"
          className={`flex h-[5.5rem] w-[5.5rem] flex-col items-center justify-center rounded-xl border ${
            isUpcoming
              ? "border-white/15 bg-white/10"
              : "border-dune bg-shell"
          }`}
        >
          <span
            className={`text-xs font-bold tracking-[0.16em] ${
              isUpcoming ? "text-white/60" : "text-clay"
            }`}
          >
            {dateParts?.month ?? "DATE"}
          </span>
          <span
            className={`mt-1 font-display text-3xl font-semibold ${
              isUpcoming ? "text-white" : "text-cocoa"
            }`}
          >
            {dateParts?.day ?? "—"}
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
                isUpcoming
                  ? "bg-white/10 text-white/75"
                  : "bg-accent-muted text-clay"
              }`}
            >
              {presentation.statusLabel}
            </span>
            <time
              dateTime={presentation.startsAt}
              className={`text-sm font-semibold ${
                isUpcoming ? "text-white/65" : "text-cocoa/65"
              }`}
            >
              {presentation.startsAtLabel}
            </time>
          </div>
          <h3
            className={`mt-5 font-display text-3xl font-bold leading-[1.05] sm:text-4xl ${
              isUpcoming ? "text-white" : "text-cocoa"
            }`}
          >
            {presentation.title}
          </h3>
          <p
            className={`mt-4 max-w-[48ch] text-base leading-relaxed ${
              isUpcoming ? "text-white/72" : "text-cocoa/72"
            }`}
          >
            Bring one decision, the facts you already know, and the tradeoff
            that still feels difficult.
          </p>
          <p
            className={`mt-5 text-sm font-semibold ${
              isUpcoming ? "text-white" : "text-cocoa"
            }`}
          >
            {presentation.accessLabel}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            {externalAction ? (
              <a
                href={externalAction.href}
                target="_blank"
                rel="noreferrer noopener"
                className={`inline-flex min-h-11 items-center rounded-md px-5 py-3 text-sm font-bold transition-colors ${primaryActionClass}`}
              >
                {externalAction.label}
                <span className="sr-only"> (Opens in a new tab)</span>
              </a>
            ) : membershipAction ? (
              <Link
                href="/pricing"
                className={`inline-flex min-h-11 items-center rounded-md px-5 py-3 text-sm font-bold transition-colors ${primaryActionClass}`}
              >
                Compare membership
              </Link>
            ) : presentation.primaryAction ? (
              <span
                className={`inline-flex min-h-11 items-center rounded-md border px-5 py-3 text-sm font-semibold ${
                  isUpcoming
                    ? "border-white/20 bg-white/10 text-white/75"
                    : "border-dune bg-sand text-cocoa/75"
                }`}
              >
                {presentation.primaryAction.label}
              </span>
            ) : (
              <span className="inline-flex min-h-11 items-center rounded-md border border-dune bg-shell px-5 py-3 text-sm font-semibold text-cocoa/70">
                Access unavailable
              </span>
            )}
            {isUpcoming ? (
              <>
                <OfficeHourCalendarButton
                  id={presentation.id}
                  startsAt={presentation.startsAt}
                  title={presentation.title}
                />
                <CopySessionDetailsButton
                  details={`${presentation.title}\n${presentation.startsAtLabel}\nGS学院 Office Hours`}
                  tone="dark"
                />
              </>
            ) : null}
          </div>
        </div>
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
        compact
        eyebrow="Office hours"
        headingLevel={1}
        title="Closer support for higher-stakes decisions."
        description="Bring a specific money or life decision, compare tradeoffs with a clearer framework, and learn alongside other members. Sessions provide financial education, not individualized financial advice."
      >
        {snapshot.error && !officeHourSnapshot.error ? (
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
              alternativeHref="/library"
              alternativeLabel="Read while you wait"
              title="Office hours could not be loaded"
              description="No signup or replay links are available until the schedule connection recovers."
              note="No private session or replay links are shown while the schedule is unavailable."
              retryHref="/office-hours"
              variant="panel"
            />
          </div>
        ) : null}
        {!officeHourSnapshot.error && officeHourSnapshot.items.length === 0 ? (
          <div className="mb-6">
            <DataEmpty
              actionHref="/library"
              actionLabel="Browse the library"
              title="No live session is scheduled"
              description="Browse the library now; upcoming sessions and new replays will appear here."
              variant="panel"
            />
          </div>
        ) : null}

        <section
          aria-labelledby="office-hours-format"
          className="mb-10 overflow-hidden rounded-xl border border-dune bg-dune"
        >
          <div className="bg-shell px-5 py-5 sm:px-7">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-clay">
              The format
            </p>
            <h2
              className="mt-2 font-display text-2xl font-semibold text-cocoa sm:text-3xl"
              id="office-hours-format"
            >
              One decision. Three useful moves.
            </h2>
          </div>
          <ol className="grid gap-px md:grid-cols-3">
            {[
              {
                description:
                  "Choose the money or life decision that is creating the most drag.",
                label: "Name the decision"
              },
              {
                description:
                  "Bring the facts you know, the people affected, and the real deadline.",
                label: "Bring the context"
              },
              {
                description:
                  "Use the discussion to identify a clearer next move—not a perfect answer.",
                label: "Leave with direction"
              }
            ].map((step, index) => (
              <li className="bg-cream p-5 sm:p-6" key={step.label}>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cocoa text-sm font-bold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-4 font-display text-xl font-semibold text-cocoa">
                  {step.label}
                </h3>
                <p className="mt-2 text-sm leading-6 text-cocoa/70">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {upcoming.length > 0 ? (
          <section aria-labelledby="office-hours-upcoming">
            <div className="mb-6 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-clay">
                Live sessions · {upcoming.length}
              </p>
              <h2
                id="office-hours-upcoming"
                className="mt-2 font-display text-4xl font-bold text-cocoa"
              >
                Upcoming
              </h2>
              <p className="mt-3 leading-relaxed text-cocoa/72">
                Reserve a place, then arrive with one decision you want to make
                more deliberately.
              </p>
            </div>
            <div className={sessionGridClass(upcoming.length)}>
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
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-clay">
                Previous sessions · {replays.length}
              </p>
              <h2
                id="office-hours-replays"
                className="mt-2 font-display text-4xl font-bold text-cocoa"
              >
                Replay library
              </h2>
              <p className="mt-3 leading-relaxed text-cocoa/72">
                Revisit completed sessions when a similar decision appears in
                your own life.
              </p>
            </div>
            <div className={sessionGridClass(replays.length)}>
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
          <section
            aria-labelledby="office-hours-unavailable"
            className={
              upcoming.length > 0 || replays.length > 0 ? "mt-12" : undefined
            }
          >
            <div className="mb-6 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-clay">
                Schedule check
              </p>
              <h2
                className="mt-2 font-display text-4xl font-bold text-cocoa"
                id="office-hours-unavailable"
              >
                Session status
              </h2>
              <p className="mt-3 leading-relaxed text-cocoa/72">
                These session details are visible, but access or destination
                verification still needs to recover.
              </p>
            </div>
            <div className={sessionGridClass(unavailable.length)}>
              {unavailable.map((presentation) => (
                <OfficeHourCard
                  key={presentation.id}
                  presentation={presentation}
                />
              ))}
            </div>
          </section>
        ) : null}

        <aside className="mt-10 overflow-hidden rounded-xl bg-cocoa p-6 text-white sm:p-8">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/60">
                Prepare before the room opens
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-4xl">
                Start with a guide, then bring one decision.
              </h2>
              <p className="mt-3 max-w-[60ch] text-sm leading-6 text-white/70">
                Public previews help you name the tradeoff. Guided membership
                adds live Office Hours access when closer support is useful.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/library"
                className="inline-flex min-h-11 items-center rounded-md bg-white px-5 py-3 text-sm font-bold text-cocoa transition-colors hover:bg-cream"
              >
                Browse the library
              </Link>
              <Link
                href="/pricing"
                className="inline-flex min-h-11 items-center rounded-md border border-white/35 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
              >
                Compare membership
              </Link>
            </div>
          </div>
        </aside>
      </SectionShell>
    </main>
  );
}
