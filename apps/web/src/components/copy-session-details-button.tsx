"use client";

import { useState } from "react";

interface ClipboardWriter {
  writeText(value: string): Promise<void>;
}

export async function writeSessionDetails(
  details: string,
  clipboard: ClipboardWriter | undefined
) {
  if (!clipboard) {
    return false;
  }

  try {
    await clipboard.writeText(details);
    return true;
  } catch {
    return false;
  }
}

export function CopySessionDetailsButton({
  details,
  tone = "light"
}: {
  details: string;
  tone?: "dark" | "light";
}) {
  const [status, setStatus] = useState<"copied" | "error" | "idle">("idle");

  async function handleCopy() {
    const copied = await writeSessionDetails(details, navigator.clipboard);
    setStatus(copied ? "copied" : "error");
  }

  const label =
    status === "copied"
      ? "Details copied"
      : status === "error"
        ? "Copy unavailable"
        : "Copy date and title";

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex min-h-11 items-center rounded-md border px-5 py-3 text-sm font-bold transition-colors ${
        tone === "dark"
          ? "border-white/35 text-white hover:bg-white/10"
          : "border-cocoa/35 text-cocoa hover:border-cocoa hover:bg-cream"
      }`}
    >
      <span aria-live="polite">{label}</span>
    </button>
  );
}
