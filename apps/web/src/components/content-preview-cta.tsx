import Link from "next/link";

export function ContentPreviewCta({
  mode
}: {
  mode: "preview" | "locked";
}) {
  return (
    <div className="mt-8 rounded-[28px] border border-dune bg-sand p-6">
      <p className="text-sm uppercase tracking-[0.2em] text-clay">Member Access</p>
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
          href="/login"
          className="rounded-full bg-cocoa px-5 py-3 text-sm font-semibold text-white"
        >
          Create account
        </Link>
        <Link
          href="/pricing"
          className="rounded-full border border-cocoa px-5 py-3 text-sm font-semibold text-cocoa"
        >
          View membership
        </Link>
      </div>
    </div>
  );
}
