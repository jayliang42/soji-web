import Image from "next/image";
import Link from "next/link";
import type { Metadata, Route } from "next";
import { productOffers } from "@soji/domain";
import { ContinueReading } from "@/components/continue-reading";
import { getContentSnapshot } from "@/lib/content";

export const metadata: Metadata = {
  alternates: { canonical: "/" }
};

const outcomes = [
  {
    label: "直面非传统背景",
    href: "/library?focus=start" as Route,
    description:
      "Gap、转学、退学、第二本科，不绕开难点，先找到能被理解的申请定位。"
  },
  {
    label: "把经历变成故事线",
    href: "/library?focus=start" as Route,
    description:
      "从零散经历中提炼主线，控制叙事节奏，让每一句都服务于申请目标。"
  },
  {
    label: "覆盖真实高频问题",
    href: "/library?focus=start" as Route,
    description:
      "55篇真实录取案例，回应成绩单、专业匹配、休学经历与申请轮次等关键疑问。"
  },
  {
    label: "在原稿上反复打磨",
    href: "/library?focus=start" as Route,
    description:
      "基于你的真实经历逐轮反馈，把模糊想法变成有逻辑、有证据的文书表达。"
  }
];

const pathways = [
  {
    eyebrow: "01 · 看案例",
    meta: "55篇真实案例",
    title: "先找到与你相似的经历",
    description:
      "从 Gap、转学、退学、第二本科等真实录取案例里，看见别人如何面对非传统背景。",
    href: "/library?focus=start",
    action: "浏览案例"
  },
  {
    eyebrow: "02 · 做定位",
    meta: "理清专业与叙事",
    title: "把复杂经历讲清楚",
    description:
      "梳理你的教育轨迹、真实意图和专业选择，找到一条自然、可信、能被理解的故事线。",
    href: "/office-hours",
    action: "了解申请咨询"
  },
  {
    eyebrow: "03 · 打磨文书",
    meta: "不限次数返稿",
    title: "让每一句都为申请服务",
    description:
      "在你的原稿和思路上逐轮反馈，删掉模糊表达，补足关键证据，让 narrative 更清楚、更有说服力。",
    href: "/office-hours",
    action: "查看支持方式"
  }
] as const;

export default async function HomePage() {
  const content = await getContentSnapshot();
  const continueReadingGuides = content.items.map(
    ({ slug, summary, title, type }) => ({
      slug,
      summary,
      title,
      type
    })
  );

  return (
    <main>
      <section className="relative h-[calc(100svh-216px)] min-h-[420px] max-h-[628px] overflow-hidden bg-white md:h-[calc(100svh-184px)] md:min-h-[520px] md:max-h-[680px]">
        <Image
          src="/bayarea-coral-sea-hero.jpg"
          alt="Snowy mountains above a blue bay with a fishing boat and rocky shoreline"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[50%_35%]"
        />
        <div className="relative z-10 mx-auto flex h-full max-w-6xl items-center px-6">
          <div className="max-w-2xl py-6 md:max-w-xl md:py-12">
            <p className="text-xs font-bold uppercase text-[#102536]/75">
              GS学院 presents
            </p>
            <h1 className="mt-3 font-display text-5xl font-black leading-[0.92] text-[#102536] sm:text-6xl md:mt-4 md:text-7xl">
              BayArea珊瑚海
            </h1>
            <p className="mt-4 text-lg font-semibold leading-7 text-[#172B3A] md:mt-6 md:text-2xl md:leading-8">
              解锁55篇精选真实录取案例解析
            </p>
            <div className="mt-6 flex flex-wrap gap-2 md:mt-9 md:gap-3">
              <Link
                href="/library"
                className="rounded-md bg-[#102536] px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#172B3A]"
              >
                Read a preview
              </Link>
              <Link
                href="/pricing"
                className="rounded-md border-2 border-[#102536] bg-white/80 px-6 py-3.5 text-sm font-bold text-[#102536] transition-colors hover:bg-[#102536] hover:text-white"
              >
                Explore membership
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section data-testid="home-outcomes" className="border-y border-dune bg-shell">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
            <div>
              <p className="text-xs font-bold uppercase text-clay">真实客户问题</p>
              <h2 className="mt-4 font-display text-4xl font-bold leading-tight text-cocoa md:text-5xl">
                不回避复杂经历，把它讲成一条有方向的申请故事。
              </h2>
            </div>
            <ol className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {outcomes.map((outcome, index) => (
                <li key={outcome.label} className="border-t border-dune pt-4">
                  <span className="text-xs font-bold text-clay">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 text-lg font-bold text-cocoa">
                    {outcome.label}
                  </h3>
                  <p className="mt-2 leading-7 text-cocoa/75">
                    {outcome.description}
                  </p>
                  <Link
                    href={outcome.href}
                    className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-clay underline decoration-clay/30 underline-offset-4 hover:decoration-clay"
                  >
                    查看相关案例
                    <span aria-hidden="true" className="ml-1">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <ContinueReading guides={continueReadingGuides} />

      <section className="bg-cream" aria-labelledby="how-soji-works">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase text-clay">从问题到行动</p>
              <h2
                id="how-soji-works"
                className="mt-4 font-display text-4xl font-bold leading-tight text-cocoa md:text-5xl"
              >
                从一个真实问题开始，走到一份更清晰的申请。
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-cocoa/72">
              先用案例找到共鸣，再梳理定位，最后把真实经历打磨成有逻辑的文书。
              每一步都对应你现在最需要解决的问题。
            </p>
          </div>
          <ol className="mt-10 grid gap-5 md:grid-cols-2">
            {pathways.map((pathway) => (
              <li
                key={pathway.eyebrow}
                className="group flex min-h-64 flex-col overflow-hidden rounded-xl border border-dune bg-shell p-6 transition-all duration-200 hover:-translate-y-1 hover:border-clay/45 hover:shadow-xl motion-reduce:transform-none sm:p-8"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-clay">
                    {pathway.eyebrow}
                  </p>
                  <p className="rounded-full border border-dune bg-cream px-3 py-1.5 text-xs font-bold text-cocoa/68">
                    {pathway.meta}
                  </p>
                </div>
                <h3 className="mt-5 font-display text-3xl font-bold leading-tight text-cocoa">
                  {pathway.title}
                </h3>
                <p className="mt-4 leading-7 text-cocoa/72">
                  {pathway.description}
                </p>
                <Link
                  href={pathway.href}
                  className="mt-auto inline-flex min-h-11 items-center pt-6 font-bold text-clay underline decoration-clay/35 underline-offset-4 transition-colors group-hover:text-cocoa group-hover:decoration-cocoa"
                >
                  {pathway.action}
                  <span aria-hidden="true" className="ml-2">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          <p className="mt-6 max-w-3xl text-sm leading-6 text-cocoa/62">
            内容仅用于申请信息参考，不构成录取承诺或个性化升学、法律建议。
          </p>
        </div>
      </section>

      <section
        aria-labelledby="home-case-study-heading"
        className="border-y border-dune bg-white"
      >
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:py-20">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase text-clay">
              解锁方式
            </p>
            <h2
              className="mt-4 font-display text-4xl font-bold leading-tight text-cocoa md:text-5xl"
              id="home-case-study-heading"
            >
              55篇真实录取案例，按你的需要解锁。
            </h2>
            <p className="mt-5 text-lg leading-8 text-cocoa/72">
              单篇 $5，或者一次性解锁完整合集 $99。没有月费，只为你当下要解决的申请问题付费。
            </p>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2">
              <Link
                className="inline-flex min-h-11 items-center rounded-md bg-cocoa px-5 text-sm font-bold text-white transition-colors hover:bg-charcoal"
                href="/pricing#case-study-offers"
              >
                查看解锁方式
              </Link>
              <Link
                className="inline-flex min-h-11 items-center text-sm font-bold text-clay underline decoration-clay/35 underline-offset-4 hover:decoration-clay"
                href="/library"
              >
                先看案例目录
              </Link>
            </div>
          </div>

          <ol className="divide-y divide-dune border-y border-dune">
            {productOffers.map((offer, index) => (
              <li key={offer.id}>
                <Link
                  className="group grid min-h-40 gap-4 px-1 py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-4"
                  href={"/pricing#case-study-offers" as Route}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-clay">
                        {index === 1 ? "完整合集" : "单篇解锁"}
                      </p>
                      {index === 1 ? (
                        <span className="rounded-full bg-accent-muted px-3 py-1 text-xs font-bold text-cocoa">
                          最划算
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-3 font-display text-3xl font-bold leading-tight text-cocoa">
                      {offer.title}
                    </h3>
                  </div>
                  <div className="flex items-baseline justify-between gap-5 sm:block sm:text-right">
                    <p className="font-display text-4xl font-bold text-cocoa">
                      {offer.priceLabel}
                    </p>
                    <p className="text-sm font-bold text-cocoa/58">一次性</p>
                    <span className="mt-3 hidden text-sm font-bold text-clay group-hover:text-cocoa sm:inline-block">
                      立即解锁 →
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        aria-label="纽约城市影像"
        className="border-y border-dune bg-cocoa"
      >
        <div className="relative aspect-[2.1/1] min-h-[280px] overflow-hidden sm:min-h-[360px] md:min-h-[470px]">
          <Image
            src="/new-york-editorial-hero-v2.png"
            alt="Rainy West Village street with warm cafe windows, brownstones, and a yellow taxi"
            fill
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>
      </section>
    </main>
  );
}
