import Link from "next/link";

export function ContentPreviewCta({
  mode,
  nextPath = "/library"
}: {
  mode: "preview" | "locked";
  nextPath?: string;
}) {
  return (
    <div className="mt-8 border-t border-dune pt-7">
      <p className="text-sm uppercase text-clay">Member Access</p>
      <h3 className="mt-3 font-display text-3xl text-cocoa">
        {mode === "preview"
          ? "Keep reading with a member account"
          : "Unlock the full library"}
      </h3>
      <p className="mt-3 text-cocoa/75">
        {mode === "preview"
          ? "You are seeing the public preview. Sign up or upgrade to unlock the rest of this piece and the full member library."
          : "This item is reserved for paying members or purchasers. Create an account to continue."}
      </p>
      <div className="mt-6 flex flex-wrap gap-4">
        <Link
          href={{ pathname: "/login", query: { next: nextPath } }}
          className="rounded-md bg-cocoa px-5 py-3 text-sm font-semibold text-white"
        >
          Create account
        </Link>
        <Link
          href="/pricing"
          className="rounded-md border border-cocoa px-5 py-3 text-sm font-semibold text-cocoa"
        >
          View membership
        </Link>
      </div>
    </div>
  );
}
