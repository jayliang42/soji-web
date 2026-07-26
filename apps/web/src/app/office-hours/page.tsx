import Link from "next/link";
import type { Metadata } from "next";
import { hasEntitlement } from "@soji/domain";
import { SectionShell } from "@/components/section-shell";
import { DataEmpty, DataUnavailable } from "@/components/data-state";
import { getOfficeHourSnapshot } from "@/lib/office-hours";
import { formatEntitlementList } from "@/lib/entitlements";
import { getSessionSnapshot } from "@/lib/session";

export const metadata: Metadata = {
  title: "Office Hours",
  description:
    "Review upcoming Well Endowed member office hours, live support sessions, and available replays.",
  alternates: { canonical: "/office-hours" }
};

export default async function OfficeHoursPage() {
  const [snapshot, officeHourSnapshot] = await Promise.all([
    getSessionSnapshot(),
    getOfficeHourSnapshot()
  ]);
  const entitlements = snapshot.entitlements;

  return (
    <main>
      <SectionShell
        eyebrow="Office hours"
        headingLevel={1}
        title="Closer support for higher-stakes decisions."
        description="Office hours turn the publication into a more personal membership experience: members can join live sessions, review replays, and bring sharper questions."
      >
        {snapshot.error ? (
          <div className="mb-6">
            <DataUnavailable
              title="Membership access is temporarily unavailable"
              description="We could not verify live-session or replay access. Your membership has not been changed, and protected links remain hidden. Please try again shortly."
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
              title="No sessions are scheduled"
              description="Upcoming live sessions and new replays will appear here."
            />
          </div>
        ) : null}
        <div className="grid gap-6 lg:grid-cols-2">
          {officeHourSnapshot.items.map((session) => {
            const accessUnavailable = Boolean(snapshot.error);
            const canJoin =
              !accessUnavailable &&
              hasEntitlement(entitlements, session.requiredEntitlements);
            const startsAt = new Intl.DateTimeFormat("en", {
              dateStyle: "medium",
              timeStyle: "short"
            }).format(new Date(session.startsAt));

            return (
              <article
                key={session.id}
                className="rounded-lg border border-dune bg-shell p-8"
              >
                <p className="text-sm uppercase text-cocoa/70">{startsAt}</p>
                <h3 className="mt-4 font-display text-4xl leading-[1.02] text-cocoa">
                  {session.title}
                </h3>
                <p className="mt-4 text-cocoa/72">
                  Membership access: {formatEntitlementList(session.requiredEntitlements)}
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  {accessUnavailable ? (
                    <span className="rounded-md border border-dune bg-shell px-5 py-3 text-sm font-semibold text-cocoa/70">
                      Access unavailable
                    </span>
                  ) : canJoin ? (
                    <a
                      href={session.signupUrl}
                      className="rounded-md bg-cocoa px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-charcoal"
                    >
                      Reserve a seat
                    </a>
                  ) : (
                    <Link
                      href="/pricing"
                      className="rounded-md bg-cocoa px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-charcoal"
                    >
                      Upgrade to join
                    </Link>
                  )}
                  {accessUnavailable ? (
                    <span className="rounded-md border border-dune px-5 py-3 text-sm font-semibold text-cocoa/70">
                      Replay unavailable
                    </span>
                  ) : canJoin && session.replayUrl ? (
                    <a
                      href={session.replayUrl}
                      className="rounded-md border border-cocoa px-5 py-3 text-sm font-semibold text-cocoa transition-colors hover:bg-cocoa hover:text-white"
                    >
                      Replay
                    </a>
                  ) : (
                    <span className="rounded-md border border-dune px-5 py-3 text-sm font-semibold text-cocoa/70">
                      Replay locked
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>

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
