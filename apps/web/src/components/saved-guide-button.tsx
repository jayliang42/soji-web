"use client";

import { useEffect, useState } from "react";
import {
  getBrowserSavedGuidesStorage,
  readSavedGuideSlugs,
  SAVED_GUIDES_EVENT,
  SAVED_GUIDES_STORAGE_KEY,
  updateSavedGuide
} from "@/lib/saved-guides";

export function SavedGuideButton({
  slug,
  title,
  variant = "compact"
}: {
  slug: string;
  title: string;
  variant?: "compact" | "full";
}) {
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState<"error" | "idle">("idle");

  useEffect(() => {
    function refreshSavedState() {
      setSaved(
        readSavedGuideSlugs(getBrowserSavedGuidesStorage()).includes(slug)
      );
      setStatus("idle");
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === SAVED_GUIDES_STORAGE_KEY) {
        refreshSavedState();
      }
    }

    refreshSavedState();
    window.addEventListener(SAVED_GUIDES_EVENT, refreshSavedState);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(SAVED_GUIDES_EVENT, refreshSavedState);
      window.removeEventListener("storage", handleStorage);
    };
  }, [slug]);

  function handleSave() {
    const next = updateSavedGuide(
      slug,
      !saved,
      getBrowserSavedGuidesStorage()
    );

    if (!next) {
      setStatus("error");
      return;
    }

    setSaved(next.includes(slug));
    setStatus("idle");
    window.dispatchEvent(new Event(SAVED_GUIDES_EVENT));
  }

  const visibleLabel =
    status === "error" ? "Save unavailable" : saved ? "Saved" : "Save guide";
  const accessibleLabel = saved
    ? `Remove ${title} from saved guides`
    : `Save ${title} for later`;

  return (
    <button
      aria-label={status === "error" ? `${accessibleLabel}; storage unavailable` : accessibleLabel}
      aria-pressed={saved}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-bold transition-colors ${
        saved
          ? "border-clay/45 bg-accent-muted text-clay hover:border-clay"
          : "border-cocoa/30 bg-white text-cocoa hover:border-cocoa hover:bg-shell"
      } ${variant === "full" ? "w-full" : ""}`}
      onClick={handleSave}
      type="button"
    >
      <svg
        aria-hidden="true"
        className="h-4 w-4 flex-none"
        fill={saved ? "currentColor" : "none"}
        viewBox="0 0 24 24"
      >
        <path
          d="M7 4.75A1.75 1.75 0 0 1 8.75 3h6.5A1.75 1.75 0 0 1 17 4.75V21l-5-3.25L7 21V4.75Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
      <span aria-live="polite">{visibleLabel}</span>
    </button>
  );
}
