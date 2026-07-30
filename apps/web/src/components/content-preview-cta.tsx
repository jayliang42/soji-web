import Link from "next/link";
import type { Route } from "next";
import type { MembershipPlan } from "@soji/types";

export function ContentPreviewCta({
  isAuthenticated,
  membershipName,
  membershipPlanId,
  mode,
  nextPath = "/library"
}: {
  isAuthenticated: boolean;
  membershipName: string | null;
  membershipPlanId: MembershipPlan["id"] | null;
  mode: "preview" | "locked";
  nextPath?: string;
}) {
  const requiresDifferentAccess = isAuthenticated || mode === "locked";
  const pricingHref: Route = membershipPlanId
    ? (`/pricing#plan-${membershipPlanId}` as Route)
    : "/pricing";

  return (
    <aside
      aria-labelledby="content-access-heading"
      className="mt-10 overflow-hidden rounded-xl border border-dune"
    >
      <div className="grid md:grid-cols-[minmax(15rem,0.78fr)_minmax(0,1.22fr)]">
        <div className="bg-cocoa px-5 py-7 text-white sm:px-7 sm:py-8">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/58">
            {requiresDifferentAccess
              ? "Member edition"
              : "Public opening complete"}
          </p>
          <h2
            className="mt-3 font-display text-3xl font-semibold leading-tight"
            id="content-access-heading"
          >
            {requiresDifferentAccess
              ? membershipName
                ? `Continue with ${membershipName}`
                : "This guide needs additional access"
              : "Continue with Soji membership"}
          </h2>
        </div>

        <div className="bg-accent-muted px-5 py-7 sm:px-7 sm:py-8">
          <p className="max-w-2xl leading-7 text-cocoa/75">
            {requiresDifferentAccess
              ? membershipName
                ? "Your current access includes this public opening. Review the membership that contains the complete guide."
                : "Your account does not include the complete guide. Review the available access options to continue."
              : "You finished the public opening. Compare membership for the complete guide, or sign in to check access you may already have."}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-cocoa px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-charcoal"
              href={pricingHref}
            >
              {requiresDifferentAccess
                ? "See the membership that includes this"
                : "Compare membership"}
            </Link>
            {isAuthenticated ? (
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-cocoa px-5 py-3 text-sm font-semibold text-cocoa transition-colors hover:bg-cocoa hover:text-white"
                href="/account"
              >
                Review your account
              </Link>
            ) : (
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-cocoa px-5 py-3 text-sm font-semibold text-cocoa transition-colors hover:bg-cocoa hover:text-white"
                href={{ pathname: "/login", query: { next: nextPath } }}
              >
                Sign in to check access
              </Link>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
