import Link from "next/link";
import type { Metadata } from "next";
import { CopySessionDetailsButton } from "@/components/copy-session-details-button";
import { OfficeHourCalendarButton } from "@/components/office-hour-calendar-button";
import { SectionShell } from "@/components/section-shell";
import { DataEmpty, DataUnavailable } from "@/components/data-state";
import { getOfficeHourSnapshot } from "@/lib/office-hours";
import {
  buildOfficeHourPresentation,
  type OfficeHourPresentation
} from "@/lib/office-hours-presentation";
import { getSessionSnapshot } from "@/lib/session";

export const metadata: Metadata = {
  title: "线上答疑",
  description:
    "查看即将开始的会员线上答疑、直播支持场次和往期回放。",
  alternates: { canonical: "/office-hours" }
};

function getOfficeHourDateParts(startsAt: string) {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return {
    day: new Intl.DateTimeFormat("zh-CN", {
      day: "2-digit",
      timeZone: "America/Chicago"
    }).format(date),
    month: new Intl.DateTimeFormat("zh-CN", {
      month: "short",
      timeZone: "America/Chicago"
    })
      .format(date)
      .toUpperCase()
  };
}

function sessionGridClass(itemCount: number) {
  return itemCount === 1
    ? "grid max-w-4xl gap-6"
    : "grid gap-6 lg:grid-cols-2";
}

function OfficeHourCard({
  presentation
}: {
  presentation: OfficeHourPresentation;
}) {
  const externalAction = presentation.primaryAction?.href
    ? presentation.primaryAction
    : null;
  const membershipAction =
    presentation.primaryAction?.label === "查看解锁方案";
  const isUpcoming = presentation.lifecycle === "upcoming";
  const isUnavailable = presentation.lifecycle === "unavailable";
  const dateParts = getOfficeHourDateParts(presentation.startsAt);
  const primaryActionClass = isUpcoming
    ? "bg-white text-cocoa hover:bg-cream"
    : "bg-cocoa text-white hover:bg-charcoal";

  return (
    <article
      className={`relative overflow-hidden rounded-xl border p-6 sm:p-8 ${
        isUpcoming
          ? "border-cocoa bg-cocoa text-white shadow-xl"
          : isUnavailable
            ? "border-dune bg-cream text-cocoa"
            : "border-dune bg-shell text-cocoa"
      }`}
    >
      {isUpcoming ? (
        <>
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-20 h-56 w-56 rounded-full border border-white/10"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-24 right-16 h-48 w-48 rounded-full bg-white/5"
          />
        </>
      ) : null}

      <div className="relative grid gap-5 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:gap-7">
        <div
          aria-hidden="true"
          className={`flex h-[5.5rem] w-[5.5rem] flex-col items-center justify-center rounded-xl border ${
            isUpcoming
              ? "border-white/15 bg-white/10"
              : "border-dune bg-shell"
          }`}
        >
          <span
            className={`text-xs font-bold tracking-[0.16em] ${
              isUpcoming ? "text-white/60" : "text-clay"
            }`}
          >
            {dateParts?.month ?? "日期"}
          </span>
          <span
            className={`mt-1 font-display text-3xl font-semibold ${
              isUpcoming ? "text-white" : "text-cocoa"
            }`}
          >
            {dateParts?.day ?? "—"}
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
                isUpcoming
                  ? "bg-white/10 text-white/75"
                  : "bg-accent-muted text-clay"
              }`}
            >
              {presentation.statusLabel}
            </span>
            <time
              dateTime={presentation.startsAt}
              className={`text-sm font-semibold ${
                isUpcoming ? "text-white/65" : "text-cocoa/65"
              }`}
            >
              {presentation.startsAtLabel}
            </time>
          </div>
          <h3
            className={`mt-5 font-display text-3xl font-bold leading-[1.05] sm:text-4xl ${
              isUpcoming ? "text-white" : "text-cocoa"
            }`}
          >
            {presentation.title}
          </h3>
          <p
            className={`mt-4 max-w-[48ch] text-base leading-relaxed ${
              isUpcoming ? "text-white/72" : "text-cocoa/72"
            }`}
          >
            带来一个具体问题、你已经掌握的事实，以及仍然难以权衡的取舍。
          </p>
          <p
            className={`mt-5 text-sm font-semibold ${
              isUpcoming ? "text-white" : "text-cocoa"
            }`}
          >
            {presentation.accessLabel}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            {externalAction ? (
              <a
                href={externalAction.href}
                target="_blank"
                rel="noreferrer noopener"
                className={`inline-flex min-h-11 items-center rounded-md px-5 py-3 text-sm font-bold transition-colors ${primaryActionClass}`}
              >
                {externalAction.label}
                <span className="sr-only">（在新标签页中打开）</span>
              </a>
            ) : membershipAction ? (
              <Link
                href="/pricing"
                className={`inline-flex min-h-11 items-center rounded-md px-5 py-3 text-sm font-bold transition-colors ${primaryActionClass}`}
              >
                查看解锁方案
              </Link>
            ) : presentation.primaryAction ? (
              <span
                className={`inline-flex min-h-11 items-center rounded-md border px-5 py-3 text-sm font-semibold ${
                  isUpcoming
                    ? "border-white/20 bg-white/10 text-white/75"
                    : "border-dune bg-sand text-cocoa/75"
                }`}
              >
                {presentation.primaryAction.label}
              </span>
            ) : (
              <span className="inline-flex min-h-11 items-center rounded-md border border-dune bg-shell px-5 py-3 text-sm font-semibold text-cocoa/70">
                暂时无法访问
              </span>
            )}
            {isUpcoming ? (
              <>
                <OfficeHourCalendarButton
                  id={presentation.id}
                  startsAt={presentation.startsAt}
                  title={presentation.title}
                />
                <CopySessionDetailsButton
                  details={`${presentation.title}\n${presentation.startsAtLabel}\nGS学院线上答疑`}
                  tone="dark"
                />
              </>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export default async function OfficeHoursPage() {
  const [snapshot, officeHourSnapshot] = await Promise.all([
    getSessionSnapshot(),
    getOfficeHourSnapshot()
  ]);
  const now = new Date();
  const presentations = officeHourSnapshot.items.map((session) =>
    buildOfficeHourPresentation(
      session,
      {
        entitlements: snapshot.entitlements,
        isAuthenticated: Boolean(snapshot.user),
        verificationUnavailable: Boolean(
          snapshot.error || officeHourSnapshot.error
        )
      },
      now
    )
  );
  const upcoming = presentations
    .filter((item) => item.lifecycle === "upcoming")
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
  const replays = presentations
    .filter((item) =>
      ["replay_pending", "replay_ready"].includes(item.lifecycle)
    )
    .sort((left, right) => right.startsAt.localeCompare(left.startsAt));
  const unavailable = presentations.filter(
    (item) => item.lifecycle === "unavailable"
  );

  return (
    <main>
      <SectionShell
        compact
        eyebrow="线上答疑"
        headingLevel={1}
        title="重要决定，需要更深入的支持"
        description="带来一个具体的金钱或人生决定，用更清晰的框架比较取舍，并与其他成员一起学习。所有场次仅提供财务教育，不构成个性化财务建议。"
      >
        {snapshot.error && !officeHourSnapshot.error ? (
          <div className="mb-6">
            <DataUnavailable
              title="暂时无法确认会员访问权限"
              description="我们目前无法确认访问权限，因此没有显示会员专属内容或私密链接。你的会员状态没有改变，请稍后再试。"
            />
          </div>
        ) : null}
        {officeHourSnapshot.error ? (
          <div className="mb-6">
            <DataUnavailable
              alternativeHref="/library"
              alternativeLabel="等待时先阅读指南"
              title="暂时无法加载线上答疑"
              description="日程连接恢复前，预约和回放链接暂不可用。"
              note="日程不可用期间，不会显示任何私密场次或回放链接。"
              retryHref="/office-hours"
              variant="panel"
            />
          </div>
        ) : null}
        {!officeHourSnapshot.error && officeHourSnapshot.items.length === 0 ? (
          <div className="mb-6">
            <DataEmpty
              actionHref="/library"
              actionLabel="浏览内容库"
              title="目前没有已安排的直播场次"
              description="你可以先浏览内容库；新的直播场次和回放会显示在这里。"
              variant="panel"
            />
          </div>
        ) : null}

        <section
          aria-labelledby="office-hours-format"
          className="mb-10 overflow-hidden rounded-xl border border-dune bg-dune"
        >
          <div className="bg-shell px-5 py-5 sm:px-7">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-clay">
              参与方式
            </p>
            <h2
              className="mt-2 font-display text-2xl font-semibold text-cocoa sm:text-3xl"
              id="office-hours-format"
            >
              一个决定，三个实用步骤
            </h2>
          </div>
          <ol className="grid gap-px md:grid-cols-3">
            {[
              {
                description:
                  "选择当前最让你犹豫的金钱或人生决定。",
                label: "明确问题"
              },
              {
                description:
                  "准备好已知事实、受影响的人，以及真正的截止时间。",
                label: "带来背景"
              },
              {
                description:
                  "通过讨论找到更清晰的下一步，而不是追求完美答案。",
                label: "带走方向"
              }
            ].map((step, index) => (
              <li className="bg-cream p-5 sm:p-6" key={step.label}>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cocoa text-sm font-bold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-4 font-display text-xl font-semibold text-cocoa">
                  {step.label}
                </h3>
                <p className="mt-2 text-sm leading-6 text-cocoa/70">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {upcoming.length > 0 ? (
          <section aria-labelledby="office-hours-upcoming">
            <div className="mb-6 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-clay">
                直播场次 · {upcoming.length}
              </p>
              <h2
                id="office-hours-upcoming"
                className="mt-2 font-display text-4xl font-bold text-cocoa"
              >
                即将开始
              </h2>
              <p className="mt-3 leading-relaxed text-cocoa/72">
                先预约席位，再带着一个你想认真做出的决定参加。
              </p>
            </div>
            <div className={sessionGridClass(upcoming.length)}>
              {upcoming.map((presentation) => (
                <OfficeHourCard
                  key={presentation.id}
                  presentation={presentation}
                />
              ))}
            </div>
          </section>
        ) : null}

        {replays.length > 0 ? (
          <section
            aria-labelledby="office-hours-replays"
            className={upcoming.length > 0 ? "mt-12" : undefined}
          >
            <div className="mb-6 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-clay">
                往期场次 · {replays.length}
              </p>
              <h2
                id="office-hours-replays"
                className="mt-2 font-display text-4xl font-bold text-cocoa"
              >
                回放内容库
              </h2>
              <p className="mt-3 leading-relaxed text-cocoa/72">
                当你遇到类似决定时，可以回来查看往期场次。
              </p>
            </div>
            <div className={sessionGridClass(replays.length)}>
              {replays.map((presentation) => (
                <OfficeHourCard
                  key={presentation.id}
                  presentation={presentation}
                />
              ))}
            </div>
          </section>
        ) : null}

        {unavailable.length > 0 ? (
          <section
            aria-labelledby="office-hours-unavailable"
            className={
              upcoming.length > 0 || replays.length > 0 ? "mt-12" : undefined
            }
          >
            <div className="mb-6 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-clay">
                日程检查
              </p>
              <h2
                className="mt-2 font-display text-4xl font-bold text-cocoa"
                id="office-hours-unavailable"
              >
                场次状态
              </h2>
              <p className="mt-3 leading-relaxed text-cocoa/72">
                场次信息仍可查看，但访问权限或目标链接尚未恢复验证。
              </p>
            </div>
            <div className={sessionGridClass(unavailable.length)}>
              {unavailable.map((presentation) => (
                <OfficeHourCard
                  key={presentation.id}
                  presentation={presentation}
                />
              ))}
            </div>
          </section>
        ) : null}

        <aside className="mt-10 overflow-hidden rounded-xl bg-cocoa p-6 text-white sm:p-8">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/60">
                开始前先做好准备
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-4xl">
                先读一篇指南，再带来一个决定
              </h2>
              <p className="mt-3 max-w-[60ch] text-sm leading-6 text-white/70">
                公开预览可以帮你看清取舍；需要更深入支持时，可通过相应方案参加直播答疑。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/library"
                className="inline-flex min-h-11 items-center rounded-md bg-white px-5 py-3 text-sm font-bold text-cocoa transition-colors hover:bg-cream"
              >
                浏览内容库
              </Link>
              <Link
                href="/pricing"
                className="inline-flex min-h-11 items-center rounded-md border border-white/35 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
              >
                查看解锁方案
              </Link>
            </div>
          </div>
        </aside>
      </SectionShell>
    </main>
  );
}
