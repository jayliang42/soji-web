import Link from "next/link";

type PurchaseDisclosureProps =
  | { priceLabel: string; variant: "membership" }
  | { priceLabel?: never; variant: "product" };

const disclosureLinks = [
  ["Terms", "/terms"],
  ["Refund policy", "/refund-policy"],
  ["Privacy", "/privacy"],
  ["Support", "/support"]
] as const;

export function PurchaseDisclosure(props: PurchaseDisclosureProps) {
  const description =
    props.variant === "membership" ? (
      <>
        <strong className="font-bold text-cocoa">
          {props.priceLabel} billed monthly until canceled.
        </strong>{" "}
        Cancel from Account through the Stripe Customer Portal. Cancellation
        stops future renewal; access continues according to your paid period
        and billing status.
      </>
    ) : (
      <>
        <strong className="font-bold text-cocoa">One-time purchase.</strong>{" "}
        Delivered to your GS学院 account. Review the digital-product refund
        policy before paying.
      </>
    );

  return (
    <aside
      aria-label={
        props.variant === "membership"
          ? "Membership purchase terms"
          : "Digital product purchase terms"
      }
      className="mt-5 border-t border-dune pt-5 text-sm font-medium leading-[1.55] text-cocoa/72"
    >
      <p>{description}</p>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5">
        {disclosureLinks.map(([label, href]) => (
          <li key={href}>
            <Link
              href={href}
              className="inline-flex min-h-11 items-center font-semibold text-clay underline decoration-clay/40 underline-offset-4 hover:decoration-clay"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
