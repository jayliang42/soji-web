import Link from "next/link";

export function ContentPreviewCta({
  isAuthenticated,
  membershipName,
  mode,
  nextPath = "/library"
}: {
  isAuthenticated: boolean;
  membershipName: string | null;
  mode: "preview" | "locked";
  nextPath?: string;
}) {
  const requiresDifferentAccess = isAuthenticated || mode === "locked";

  return (
    <aside className="mt-10 border-t-2 border-clay bg-accent-muted px-5 py-7 sm:px-7">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-clay">
        {requiresDifferentAccess ? "Member edition" : "Public preview"}
      </p>
      <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-cocoa">
        {requiresDifferentAccess
          ? membershipName
            ? `The full guide is included with ${membershipName} membership`
            : "This guide needs additional access"
          : "Continue with Soji membership"}
      </h2>
      <p className="mt-3 max-w-2xl leading-7 text-cocoa/75">
        {requiresDifferentAccess
          ? membershipName
            ? "Your current access includes this public opening. Compare membership options to continue with the complete guide."
            : "Your account does not include the complete guide. Review the available access options to continue."
          : "You are reading the public opening. Compare membership for the complete guide, or sign in to check access you may already have."}
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link
          href="/pricing"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-cocoa px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-charcoal"
        >
          {requiresDifferentAccess
            ? "See the membership that includes this"
            : "Compare membership"}
        </Link>
        {isAuthenticated ? (
          <Link
            href="/account"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-cocoa px-5 py-3 text-sm font-semibold text-cocoa transition-colors hover:bg-cocoa hover:text-white"
          >
            Review your account
          </Link>
        ) : (
          <Link
            href={{ pathname: "/login", query: { next: nextPath } }}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-cocoa px-5 py-3 text-sm font-semibold text-cocoa transition-colors hover:bg-cocoa hover:text-white"
          >
            Sign in to check access
          </Link>
        )}
      </div>
    </aside>
  );
}
