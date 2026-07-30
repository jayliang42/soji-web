export function DataUnavailable({
  description,
  retryHref,
  retryLabel = "Try loading again",
  title = "Temporarily unavailable"
}: {
  description: string;
  retryHref?: string;
  retryLabel?: string;
  title?: string;
}) {
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
  description,
  title
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="rounded-lg border border-dune bg-shell px-5 py-5 text-cocoa">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-cocoa/75">{description}</p>
    </div>
  );
}
