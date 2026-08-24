import Link from "next/link";

const membershipPolicyLinks = [
  ["使用条款", "/terms"],
  ["退款政策", "/refund-policy"],
  ["隐私政策", "/privacy"],
  ["帮助与支持", "/support"]
] as const;

const membershipBasics = [
  {
    label: "01",
    title: "一次性价格",
    description: "一次支付 $99，不会自动续费。"
  },
  {
    label: "02",
    title: "统一管理访问权限",
    description:
      "在账号中心查看购买记录及其包含的权益。"
  },
  {
    label: "03",
    title: "一次购买，持续访问",
    description:
      "这笔购买会解锁当前及未来更新的完整会员内容库。"
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
            解锁说明
          </p>
          <h3
            className="mt-3 font-display text-3xl font-semibold leading-tight"
            id="membership-terms-heading"
          >
            一次付款，完整访问
          </h3>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/72">
            一次支付 $99，即可在同一账号中使用当前及未来更新的全部权益。
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
            aria-label="会员政策与支持"
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
