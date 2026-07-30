"use client";

import { useState } from "react";
import {
  buildOfficeHourCalendarFile,
  type OfficeHourCalendarFile
} from "@/lib/office-hour-calendar";

interface CalendarDownloadLink {
  click(): void;
  download: string;
  href: string;
  remove(): void;
}

interface CalendarDownloadEnvironment {
  appendLink(link: CalendarDownloadLink): void;
  createLink(): CalendarDownloadLink;
  createObjectUrl(blob: Blob): string;
  revokeObjectUrl(url: string): void;
}

export function downloadOfficeHourCalendar(
  file: OfficeHourCalendarFile,
  environment: CalendarDownloadEnvironment
) {
  let link: CalendarDownloadLink | undefined;
  let objectUrl: string | undefined;

  try {
    const blob = new Blob([file.content], {
      type: "text/calendar;charset=utf-8"
    });
    objectUrl = environment.createObjectUrl(blob);
    link = environment.createLink();
    link.download = file.filename;
    link.href = objectUrl;
    environment.appendLink(link);
    link.click();
    return true;
  } catch {
    return false;
  } finally {
    link?.remove();
    if (objectUrl) {
      environment.revokeObjectUrl(objectUrl);
    }
  }
}

export function OfficeHourCalendarButton({
  id,
  startsAt,
  title,
  tone = "dark"
}: {
  id: string;
  startsAt: string;
  title: string;
  tone?: "dark" | "light";
}) {
  const [status, setStatus] = useState<
    "downloaded" | "error" | "idle"
  >("idle");

  function handleDownload() {
    const file = buildOfficeHourCalendarFile({ id, startsAt, title });
    const downloaded =
      file &&
      downloadOfficeHourCalendar(file, {
        appendLink: (link) =>
          document.body.append(link as HTMLAnchorElement),
        createLink: () => document.createElement("a"),
        createObjectUrl: (blob) => URL.createObjectURL(blob),
        revokeObjectUrl: (url) => {
          window.setTimeout(() => URL.revokeObjectURL(url), 0);
        }
      });

    setStatus(downloaded ? "downloaded" : "error");
  }

  const visibleLabel =
    status === "downloaded"
      ? "Calendar downloaded"
      : status === "error"
        ? "Calendar unavailable"
        : "Add to calendar";

  return (
    <button
      aria-label={
        status === "error"
          ? `Calendar download unavailable for ${title}`
          : `Add ${title} to calendar`
      }
      className={`inline-flex min-h-11 items-center gap-2 rounded-md border px-5 py-3 text-sm font-bold transition-colors ${
        tone === "dark"
          ? "border-white/35 text-white hover:bg-white/10"
          : "border-cocoa/35 text-cocoa hover:border-cocoa hover:bg-cream"
      }`}
      onClick={handleDownload}
      type="button"
    >
      <svg
        aria-hidden="true"
        className="h-4 w-4 flex-none"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          d="M7 3v3m10-3v3M4.75 9h14.5M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm6 7v5m0 0-2-2m2 2 2-2"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
      <span aria-live="polite">{visibleLabel}</span>
    </button>
  );
}
