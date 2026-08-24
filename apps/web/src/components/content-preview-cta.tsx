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
              ? "会员内容"
              : "免费内容已读完"}
          </p>
          <h2
            className="mt-3 font-display text-3xl font-semibold leading-tight"
            id="content-access-heading"
          >
            {requiresDifferentAccess
              ? membershipName
                ? `使用 ${membershipName} 继续阅读`
                : "继续阅读需要额外权限"
              : "开通 GS学院 权益后继续阅读"}
          </h2>
        </div>

        <div className="bg-accent-muted px-5 py-7 sm:px-7 sm:py-8">
          <p className="max-w-2xl leading-7 text-cocoa/75">
            {requiresDifferentAccess
              ? membershipName
                ? "你当前可以阅读公开部分。查看包含完整内容的会员权益后继续阅读。"
                : "当前账户不包含完整内容。请查看可用的解锁方式。"
              : "你已读完公开部分。可以查看完整内容的解锁方式，或登录检查已有权益。"}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-cocoa px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-charcoal"
              href={pricingHref}
            >
              {requiresDifferentAccess
                ? "查看所需会员权益"
                : "比较解锁方式"}
            </Link>
            {isAuthenticated ? (
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-cocoa px-5 py-3 text-sm font-semibold text-cocoa transition-colors hover:bg-cocoa hover:text-white"
                href="/account"
              >
                查看我的账户
              </Link>
            ) : (
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-cocoa px-5 py-3 text-sm font-semibold text-cocoa transition-colors hover:bg-cocoa hover:text-white"
                href={{ pathname: "/login", query: { next: nextPath } }}
              >
                登录并检查权益
              </Link>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
