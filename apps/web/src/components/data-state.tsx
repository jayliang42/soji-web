import type { Route } from "next";
import Link from "next/link";

function CollectionStateArtwork({
  state
}: {
  state: "empty" | "unavailable";
}) {
  const isUnavailable = state === "unavailable";

  return (
    <div
      aria-hidden="true"
      className={`relative min-h-52 overflow-hidden border-t border-dune md:min-h-full md:border-l md:border-t-0 ${
        isUnavailable ? "bg-cocoa" : "bg-cream"
      }`}
    >
      <div
        className={`absolute -right-14 -top-16 h-52 w-52 rounded-full border ${
          isUnavailable ? "border-white/10" : "border-clay/15"
        }`}
      />
      <div
        className={`absolute -bottom-20 -left-12 h-44 w-44 rounded-full ${
          isUnavailable ? "bg-white/5" : "bg-accent-muted"
        }`}
      />
      <div
        className={`absolute inset-x-7 top-1/2 -translate-y-1/2 rounded-xl border p-5 shadow-xl sm:inset-x-12 md:inset-x-8 lg:inset-x-12 ${
          isUnavailable
            ? "border-white/15 bg-white/10 text-white"
            : "border-dune bg-shell text-cocoa"
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <span
            className={`text-[0.65rem] font-bold uppercase tracking-[0.18em] ${
              isUnavailable ? "text-white/55" : "text-cocoa/55"
            }`}
          >
            GS学院 内容库
          </span>
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isUnavailable ? "bg-gold" : "bg-sage"
            }`}
          />
        </div>
        <div className="mt-6 space-y-3">
          {[88, 68, 78].map((width, index) => (
            <div
              className={`h-2 rounded-full ${
                isUnavailable ? "bg-white/15" : "bg-dune"
              } ${index === 2 && isUnavailable ? "opacity-35" : ""}`}
              key={width}
              style={{ width: `${width}%` }}
            />
          ))}
        </div>
        <div
          className={`mt-6 flex items-center gap-2 border-t pt-4 text-xs font-bold uppercase tracking-[0.14em] ${
            isUnavailable
              ? "border-white/10 text-white/60"
              : "border-dune text-clay"
          }`}
        >
          <span
            className={`inline-block h-px w-7 ${
              isUnavailable ? "bg-white/35" : "bg-clay"
            }`}
          />
          {isUnavailable ? "等待重新连接" : "等待第一篇内容"}
        </div>
      </div>
    </div>
  );
}

export function DataUnavailable({
  alternativeHref,
  alternativeLabel,
  description,
  note,
  retryHref,
  retryLabel = "重新加载",
  title = "暂时无法使用",
  variant = "notice"
}: {
  alternativeHref?: Route;
  alternativeLabel?: string;
  description: string;
  note?: string;
  retryHref?: string;
  retryLabel?: string;
  title?: string;
  variant?: "notice" | "panel";
}) {
  if (variant === "panel") {
    return (
      <section
        role="alert"
        className="overflow-hidden rounded-xl border border-dune bg-shell text-cocoa shadow-sm"
      >
        <div className="grid md:grid-cols-[minmax(0,1.2fr)_minmax(17rem,0.8fr)]">
          <div className="p-6 sm:p-8 lg:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-clay">
              连接暂时中断
            </p>
            <h2 className="mt-3 max-w-xl font-display text-3xl font-bold leading-[1.05] text-cocoa sm:text-4xl">
              {title}
            </h2>
            <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-cocoa/72">
              {description}
            </p>
            {note ? (
              <p className="mt-5 border-l-2 border-gold pl-4 text-sm font-semibold leading-6 text-cocoa/72">
                {note}
              </p>
            ) : null}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {retryHref ? (
                <a
                  href={retryHref}
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-cocoa px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-charcoal"
                >
                  {retryLabel}
                </a>
              ) : (
                <form method="get">
                  <button
                    type="submit"
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-cocoa px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-charcoal sm:w-auto"
                  >
                    {retryLabel}
                  </button>
                </form>
              )}
              {alternativeHref && alternativeLabel ? (
                <Link
                  href={alternativeHref}
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-cocoa px-5 py-3 text-sm font-bold text-cocoa transition-colors hover:bg-cocoa hover:text-white"
                >
                  {alternativeLabel}
                </Link>
              ) : null}
            </div>
          </div>
          <CollectionStateArtwork state="unavailable" />
        </div>
      </section>
    );
  }

  return (
    <div
      role="alert"
      className="rounded-lg border border-clay/30 bg-accent-muted px-5 py-4 text-cocoa"
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-cocoa/75">{description}</p>
      {retryHref ? (
        <a
          href={retryHref}
          className="mt-4 inline-flex min-h-11 items-center rounded-md border border-cocoa px-4 text-sm font-bold text-cocoa transition-colors hover:bg-cocoa hover:text-white"
        >
          {retryLabel}
        </a>
      ) : null}
    </div>
  );
}

export function DataEmpty({
  actionHref,
  actionLabel,
  description,
  title,
  variant = "notice"
}: {
  actionHref?: Route;
  actionLabel?: string;
  description: string;
  title: string;
  variant?: "notice" | "panel";
}) {
  if (variant === "panel") {
    return (
      <section className="overflow-hidden rounded-xl border border-dune bg-shell text-cocoa shadow-sm">
        <div className="grid md:grid-cols-[minmax(0,1.2fr)_minmax(17rem,0.8fr)]">
          <div className="p-6 sm:p-8 lg:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-clay">
              从这里开始
            </p>
            <h2 className="mt-3 max-w-xl font-display text-3xl font-bold leading-[1.05] text-cocoa sm:text-4xl">
              {title}
            </h2>
            <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-cocoa/72">
              {description}
            </p>
            {actionHref && actionLabel ? (
              <Link
                href={actionHref}
                className="mt-7 inline-flex min-h-11 items-center justify-center rounded-md border border-cocoa px-5 py-3 text-sm font-bold text-cocoa transition-colors hover:bg-cocoa hover:text-white"
              >
                {actionLabel}
              </Link>
            ) : null}
          </div>
          <CollectionStateArtwork state="empty" />
        </div>
      </section>
    );
  }

  return (
    <div className="rounded-lg border border-dune bg-shell px-5 py-5 text-cocoa">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-cocoa/75">{description}</p>
    </div>
  );
}
