"use client";

import dynamic from "next/dynamic";
import { useId, useState } from "react";

const MarkdownPreview = dynamic(
  () =>
    import("@/components/markdown-content").then((module) => module.MarkdownContent),
  {
    loading: () => <p className="text-sm text-cocoa/60">Rendering preview...</p>,
    ssr: false
  }
);

export function MarkdownEditor({
  label = "Body (Markdown)",
  onChange,
  rows = 10,
  value
}: {
  label?: string;
  onChange: (value: string) => void;
  rows?: number;
  value: string;
}) {
  const [mode, setMode] = useState<"write" | "preview">("write");
  const id = useId();
  const panelId = `${id}-panel`;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm text-cocoa/75">
          {label}
        </label>
        <div
          aria-label={`${label} mode`}
          className="inline-flex overflow-hidden rounded-md border border-dune bg-white p-1"
          role="tablist"
        >
          {(["write", "preview"] as const).map((item) => (
            <button
              key={item}
              aria-controls={panelId}
              aria-selected={mode === item}
              className={`rounded px-3 py-1.5 text-xs font-bold capitalize transition-colors ${
                mode === item ? "bg-cocoa text-white" : "text-cocoa/70 hover:text-cocoa"
              }`}
              onClick={() => setMode(item)}
              role="tab"
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div id={panelId} role="tabpanel">
        {mode === "write" ? (
          <textarea
            id={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={rows}
            className="w-full rounded-md border border-dune bg-white px-4 py-3 font-mono text-sm leading-6 text-cocoa outline-none"
          />
        ) : (
          <div className="min-h-64 border-y border-dune bg-white/55 py-5">
            {value.trim() ? (
              <MarkdownPreview content={value} />
            ) : (
              <p className="text-sm text-cocoa/60">Nothing to preview yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
