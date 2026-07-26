export function ContentSourceBadge({
  source
}: {
  source: "supabase" | "demo";
}) {
  if (source !== "demo") {
    return null;
  }

  return (
    <div className="inline-flex rounded-full border border-dune bg-shell px-4 py-2 text-sm text-cocoa/70">
      Preview catalog
    </div>
  );
}
