export function DataUnavailable({
  description,
  title = "Temporarily unavailable"
}: {
  description: string;
  title?: string;
}) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-clay/30 bg-accent-muted px-5 py-4 text-cocoa"
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-cocoa/75">{description}</p>
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
