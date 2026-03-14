export function ContentSourceBadge({
  source
}: {
  source: "supabase" | "demo";
}) {
  return (
    <div className="rounded-full border border-dune bg-shell px-4 py-2 text-sm text-cocoa/70">
      Content source: {source === "supabase" ? "Supabase" : "Demo fallback"}
    </div>
  );
}
