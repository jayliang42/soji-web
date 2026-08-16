import Link from "next/link";

const membershipPolicyLinks = [
  ["Terms", "/terms"],
  ["Refund policy", "/refund-policy"],
  ["Privacy", "/privacy"],
  ["Support", "/support"]
] as const;

const membershipBasics = [
  {
    label: "01",
    title: "Your one-time price",
    description: "Pay $99 once. There is no automatic renewal."
  },
  {
    label: "02",
    title: "One place to manage access",
    description:
      "Use Account to review your purchase and the benefits attached to it."
  },
  {
    label: "03",
    title: "Access follows the purchase",
    description:
      "Your purchase unlocks the complete current and future member library."
  }
] as const;

export function MembershipTerms() {
  return (
    <aside
      aria-labelledby="membership-terms-heading"
      className="mt-8 overflow-hidden rounded-xl border border-dune bg-cream"
    >
      <div className="grid lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.6fr)]">
        <div className="bg-cocoa px-6 py-7 text-white sm:px-8 sm:py-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/58">
            Membership basics
          </p>
          <h3
            className="mt-3 font-display text-3xl font-semibold leading-tight"
            id="membership-terms-heading"
          >
            One billing rhythm for full access.
          </h3>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/72">
            One $99 payment keeps every current and future benefit in the same place.
          </p>
        </div>

        <div className="px-6 py-7 sm:px-8 sm:py-8">
          <ol className="grid gap-6 sm:grid-cols-3">
            {membershipBasics.map((item) => (
              <li key={item.label}>
                <p className="text-xs font-bold text-clay">{item.label}</p>
                <h4 className="mt-2 font-semibold leading-6 text-cocoa">
                  {item.title}
                </h4>
                <p className="mt-2 text-sm leading-6 text-cocoa/70">
                  {item.description}
                </p>
              </li>
            ))}
          </ol>

          <nav
            aria-label="Membership policies and support"
            className="mt-6 border-t border-dune pt-4"
          >
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {membershipPolicyLinks.map(([label, href]) => (
                <li key={href}>
                  <Link
                    className="inline-flex min-h-11 min-w-11 items-center justify-center font-semibold text-clay underline decoration-clay/35 underline-offset-4 hover:decoration-clay"
                    href={href}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </aside>
  );
}
