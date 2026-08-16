import Link from "next/link";

type PurchaseDisclosureProps =
  | { darkSurface?: boolean; priceLabel: string; variant: "membership" }
  | { darkSurface?: boolean; priceLabel?: never; variant: "product" };

const disclosureLinks = [
  ["Terms", "/terms"],
  ["Refund policy", "/refund-policy"],
  ["Privacy", "/privacy"],
  ["Support", "/support"]
] as const;

export function PurchaseDisclosure(props: PurchaseDisclosureProps) {
  const strongClassName = props.darkSurface ? "text-white" : "text-cocoa";
  const description =
    props.variant === "membership" ? (
      <>
        <strong className={`font-bold ${strongClassName}`}>
          {props.priceLabel} paid once.
        </strong>{" "}
        Full Access does not renew automatically. Review the refund policy
        before paying.
      </>
    ) : (
      <>
        <strong className={`font-bold ${strongClassName}`}>
          电子产品付款后不予退款。
        </strong>{" "}
        付款即表示你已阅读并同意
        <Link href="/refund-policy">退款政策</Link>，内容会交付到你的GS学院账号。
      </>
    );

  return (
    <aside
      aria-label={
        props.variant === "membership"
          ? "Membership purchase terms"
          : "Digital product purchase terms"
      }
      className={`mt-5 border-t pt-5 text-sm font-medium leading-[1.55] ${
        props.darkSurface
          ? "border-white/25 text-white/80"
          : "border-dune text-cocoa/72"
      }`}
    >
      <p>{description}</p>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5">
        {disclosureLinks.map(([label, href]) => (
          <li key={href}>
            <Link
              href={href}
              className={`inline-flex min-h-11 items-center font-semibold underline underline-offset-4 ${
                props.darkSurface
                  ? "text-white decoration-white/40 hover:decoration-white"
                  : "text-clay decoration-clay/40 hover:decoration-clay"
              }`}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
