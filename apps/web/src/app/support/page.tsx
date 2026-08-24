import Link from "next/link";
import type { Metadata, Route } from "next";
import {
  customerPolicyRoutes,
  getPublicSupportDestination
} from "@/lib/customer-policy";
import { SupportRequestComposer } from "@/components/support-request-composer";

export const metadata: Metadata = {
  title: "帮助中心",
  description:
    "获取有关 GS学院账号、会员、购买、下载或无障碍访问问题的帮助。",
  alternates: { canonical: "/support" }
};

const supportPaths: ReadonlyArray<{
  action: string;
  description: string;
  href: Route;
  label: string;
}> = [
  {
    action: "打开登录与找回页面",
    description:
      "在同一页面登录、创建账号或申请新的密码重置链接。",
    href: "/login?next=/account",
    label: "我无法登录账号"
  },
  {
    action: "打开会员页面",
    description:
      "查看账号中记录的会员状态，并在可用时打开账单管理。",
    href: "/account?view=subscriptions",
    label: "我需要会员或账单帮助"
  },
  {
    action: "打开购买记录",
    description:
      "查看购买记录、交付状态和可下载的产品。",
    href: "/account?view=purchases",
    label: "我需要购买或下载帮助"
  },
  {
    action: "查看访问帮助",
    description:
      "联系客服前，请先查看电子产品政策和访问步骤。",
    href: "/refund-policy#access",
    label: "购买后无法访问内容"
  }
] as const;

const policyLinks: ReadonlyArray<readonly [string, Route]> = [
  ["帮助中心", customerPolicyRoutes.support],
  ["隐私政策", customerPolicyRoutes.privacy],
  ["使用条款", customerPolicyRoutes.terms],
  ["退款政策", customerPolicyRoutes.refund],
  ["财务免责声明", customerPolicyRoutes.disclaimer]
] as const;

const contactChecklist = [
  "你原本想做什么，以及实际发生了什么。",
  "出现问题的页面名称和大致时间。",
  "与你账号关联的邮箱，以及相关会员或产品名称。"
] as const;

export default function SupportPage() {
  const destination = getPublicSupportDestination();

  return (
    <main className="px-6 pb-20 pt-10 md:pb-24 md:pt-16">
      <div className="mx-auto max-w-6xl">
        <header className="grid gap-6 border-b border-dune pb-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-cocoa/62">
              客户服务
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.02] text-cocoa md:text-6xl">
              帮助中心
            </h1>
          </div>
          <div>
            <p className="max-w-2xl text-lg font-medium leading-8 text-cocoa/76">
              请先选择与你情况最接近的问题。如果自助页面无法解决，再向客服发送调查所需的详情。
            </p>
            <p className="mt-4 text-sm font-semibold text-cocoa/62">
              更新于 <time dateTime="2026-07-30">2026年7月30日</time>
            </p>
          </div>
        </header>

        <section
          aria-labelledby="support-paths-heading"
          className="py-10 md:py-14"
        >
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-cocoa/62">
              从这里开始
            </p>
            <h2
              className="mt-3 font-display text-3xl font-bold leading-tight text-cocoa md:text-5xl"
              id="support-paths-heading"
            >
              选择最接近的问题类型
            </h2>
            <p className="mt-4 text-base font-medium leading-7 text-cocoa/72">
              以下链接会带你查看当前准确的账号、账单、交付或退款状态。
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {supportPaths.map((path, index) => (
              <Link
                className="group flex min-h-48 flex-col rounded-xl border border-dune bg-shell p-6 transition-all hover:-translate-y-0.5 hover:border-cocoa/40 hover:bg-white hover:shadow-lg motion-reduce:transform-none sm:p-7"
                href={path.href}
                key={path.href}
              >
                <span className="text-xs font-bold text-clay">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 font-display text-2xl font-semibold leading-tight text-cocoa">
                  {path.label}
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-6 text-cocoa/70">
                  {path.description}
                </p>
                <span className="mt-auto inline-flex min-h-11 items-end pt-5 text-sm font-bold text-clay underline decoration-clay/30 underline-offset-4 group-hover:decoration-clay">
                  {path.action}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="contact-support-heading"
          className="grid overflow-hidden rounded-xl border border-dune bg-cream lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)]"
        >
          <div className="bg-cocoa px-6 py-8 text-white sm:px-8 sm:py-10">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/58">
              仍然需要帮助？
            </p>
            <h2
              className="mt-3 font-display text-3xl font-semibold leading-tight md:text-4xl"
              id="contact-support-heading"
            >
              发送一条清楚的帮助请求
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/72">
              如果自助页面不能解释或解决问题，请使用网站公布的帮助渠道联系我们。
            </p>
            {destination.ok ? (
              <p className="mt-7 inline-flex min-h-11 items-center rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-bold text-white/88">
                帮助渠道已可用
              </p>
            ) : (
              <div
                className="mt-7 border-l-4 border-clay bg-white/10 px-5 py-4 text-sm leading-6 text-white/82"
                role="status"
              >
                固定帮助渠道仍在配置中。请在购买前回来确认；渠道正式可用之前，结账功能会保持关闭。
              </div>
            )}
          </div>

          <div className="px-6 py-8 sm:px-8 sm:py-10">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-cocoa/62">
              请提供以下信息
            </p>
            <ol className="mt-5 grid gap-4">
              {contactChecklist.map((item, index) => (
                <li className="flex gap-4" key={item}>
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-accent-muted text-xs font-bold text-clay">
                    {index + 1}
                  </span>
                  <span className="pt-0.5 text-sm font-medium leading-6 text-cocoa/76">
                    {item}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-6 border-t border-dune pt-5 text-sm leading-6 text-cocoa/68">
              请勿填写完整银行卡号、密码、验证码或敏感财务文件。
            </p>
          </div>

          <div className="lg:col-span-2">
            <SupportRequestComposer
              destination={destination.ok ? destination.value : null}
            />
          </div>
        </section>

        <section
          aria-labelledby="more-help-heading"
          className="grid gap-6 border-b border-dune py-10 md:grid-cols-2 md:py-14"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-cocoa/62">
              其他问题
            </p>
            <h2
              className="mt-3 font-display text-3xl font-bold leading-tight text-cocoa"
              id="more-help-heading"
            >
              阅读与线上答疑
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-cocoa/72">
              如果你在找内容，可以浏览公开指南；也可以查看线上答疑，了解参加和回放权限。
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end md:justify-center">
            <Link
              className="inline-flex min-h-11 items-center text-sm font-bold text-clay underline decoration-clay/35 underline-offset-4 hover:decoration-clay"
              href="/library"
            >
              浏览公开指南
            </Link>
            <Link
              className="inline-flex min-h-11 items-center text-sm font-bold text-clay underline decoration-clay/35 underline-offset-4 hover:decoration-clay"
              href="/office-hours"
            >
              查看线上答疑
            </Link>
          </div>
        </section>

        <nav
          aria-label="帮助与政策页面"
          className="pt-8"
        >
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-cocoa/62">
            帮助与政策
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold text-cocoa/76">
            {policyLinks.map(([label, href]) => (
              <li key={href}>
                <Link
                  className="inline-flex min-h-11 items-center underline decoration-clay/45 underline-offset-4 hover:text-clay"
                  href={href}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  );
}
