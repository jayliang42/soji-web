"use client";

import { useEffect, useState } from "react";
import {
  getBrowserReadingSizeStorage,
  readReadingSize,
  READING_SIZE_STORAGE_KEY,
  type ReadingSize,
  writeReadingSize
} from "@/lib/reading-size";

const choices: ReadonlyArray<{ label: string; value: ReadingSize }> = [
  { label: "Default", value: "default" },
  { label: "Larger", value: "large" }
];

function applyReadingSize(targetId: string, size: ReadingSize) {
  const target = document.getElementById(targetId);
  if (!target) {
    return false;
  }

  target.dataset.readingSize = size;
  return true;
}

export function ReadingSizeControl({ targetId }: { targetId: string }) {
  const [size, setSize] = useState<ReadingSize>("default");
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    function restoreReadingSize() {
      const restored = readReadingSize(getBrowserReadingSizeStorage());
      if (applyReadingSize(targetId, restored)) {
        setSize(restored);
      }
      setAnnouncement("");
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === READING_SIZE_STORAGE_KEY) {
        restoreReadingSize();
      }
    }

    restoreReadingSize();
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [targetId]);

  function chooseSize(nextSize: ReadingSize) {
    if (!applyReadingSize(targetId, nextSize)) {
      return;
    }

    setSize(nextSize);
    const saved = writeReadingSize(
      nextSize,
      getBrowserReadingSizeStorage()
    );
    const visibleName = nextSize === "large" ? "Larger" : "Default";
    setAnnouncement(
      saved
        ? `${visibleName} reading text selected and saved on this device.`
        : `${visibleName} reading text selected for this visit; the preference could not be saved.`
    );
  }

  return (
    <>
      <div
        aria-label="Reading text size"
        className="flex flex-wrap items-center gap-1 rounded-md border border-dune bg-white p-1"
        role="group"
      >
        <span className="px-2 text-xs font-bold text-cocoa/62">Text size</span>
        {choices.map((choice) => {
          const selected = choice.value === size;

          return (
            <button
              aria-pressed={selected}
              className={`inline-flex min-h-11 items-center justify-center rounded px-3 text-xs font-bold transition-colors ${
                selected
                  ? "bg-cocoa text-white"
                  : "text-cocoa/72 hover:bg-cream hover:text-cocoa"
              }`}
              key={choice.value}
              onClick={() => chooseSize(choice.value)}
              type="button"
            >
              {choice.label}
            </button>
          );
        })}
      </div>
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </>
  );
}
