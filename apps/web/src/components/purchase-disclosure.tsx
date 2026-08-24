import Link from "next/link";

type PurchaseDisclosureProps =
  | { darkSurface?: boolean; priceLabel: string; variant: "membership" }
  | { darkSurface?: boolean; priceLabel?: never; variant: "product" };

const disclosureLinks = [
  ["使用条款", "/terms"],
  ["退款政策", "/refund-policy"],
  ["隐私政策", "/privacy"],
  ["帮助与支持", "/support"]
] as const;

export function PurchaseDisclosure(props: PurchaseDisclosureProps) {
  const strongClassName = props.darkSurface ? "text-white" : "text-cocoa";
  const description =
    props.variant === "membership" ? (
      <>
        <strong className={`font-bold ${strongClassName}`}>
          一次性支付 {props.priceLabel}。
        </strong>{" "}
        Full Access 不会自动续费。付款前请阅读退款政策。
      </>
    ) : (
      <>
        <strong className={`font-bold ${strongClassName}`}>
          电子产品付款后不予退款。
        </strong>{" "}
        付款即表示你已阅读并同意
        <Link href="/refund-policy">退款政策</Link>，内容会交付到你的 GS学院账号。
      </>
    );

  return (
    <aside
      aria-label={
        props.variant === "membership"
          ? "会员购买条款"
          : "数字产品购买条款"
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
