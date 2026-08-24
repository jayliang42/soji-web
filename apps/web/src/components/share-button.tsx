"use client";

import { useEffect, useId, useRef, useState } from "react";

interface ShareActions {
  copy?: (value: string) => Promise<void>;
  share?: (data: ShareData) => Promise<void>;
}

export type ShareResult = "cancelled" | "copied" | "manual" | "shared";

function isAbortError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}

export async function sharePage(
  data: { title: string; url: string },
  actions: ShareActions
): Promise<ShareResult> {
  if (actions.share) {
    try {
      await actions.share(data);
      return "shared";
    } catch (error) {
      if (isAbortError(error)) {
        return "cancelled";
      }
    }
  }

  if (actions.copy) {
    try {
      await actions.copy(data.url);
      return "copied";
    } catch {
      // A visible manual-copy field remains available below.
    }
  }

  return "manual";
}

export function ShareButton({
  label,
  title
}: {
  label: string;
  title: string;
}) {
  const inputId = useId();
  const manualInputRef = useRef<HTMLInputElement>(null);
  const [manualUrl, setManualUrl] = useState("");
  const [status, setStatus] = useState<
    "copied" | "idle" | "manual" | "shared" | "working"
  >("idle");

  useEffect(() => {
    if (status === "manual") {
      manualInputRef.current?.focus();
      manualInputRef.current?.select();
    }
  }, [status]);

  async function handleShare() {
    if (status === "working") {
      return;
    }

    const url = window.location.href;
    setStatus("working");

    const result = await sharePage(
      { title, url },
      {
        copy:
          typeof navigator.clipboard?.writeText === "function"
            ? (value) => navigator.clipboard.writeText(value)
            : undefined,
        share:
          typeof navigator.share === "function"
            ? (data) => navigator.share(data)
            : undefined
      }
    );

    if (result === "cancelled") {
      setStatus("idle");
      return;
    }

    if (result === "manual") {
      setManualUrl(url);
    }
    setStatus(result);
  }

  const buttonLabel = {
    copied: "链接已复制",
    idle: label,
    manual: "手动复制链接",
    shared: "已分享",
    working: "正在打开分享选项…"
  }[status];

  return (
    <div>
      <button
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-cocoa/30 bg-white px-4 py-3 text-sm font-bold text-cocoa transition-colors hover:border-cocoa hover:bg-shell disabled:cursor-wait disabled:opacity-70"
        disabled={status === "working"}
        onClick={handleShare}
        type="button"
      >
        <svg
          aria-hidden="true"
          className="h-4 w-4 flex-none"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
        <span aria-live="polite">{buttonLabel}</span>
      </button>

      {status === "manual" ? (
        <div
          className="mt-3 rounded-md border border-clay/35 bg-accent-muted p-3"
          role="status"
        >
          <label
            className="block text-xs font-bold text-cocoa"
            htmlFor={inputId}
          >
            手动复制此链接
          </label>
          <input
            aria-describedby={`${inputId}-hint`}
            className="mt-2 min-h-11 w-full rounded-md border border-cocoa/30 bg-white px-3 text-sm text-cocoa outline-none focus:border-clay focus:ring-2 focus:ring-clay/25"
            id={inputId}
            onFocus={(event) => event.currentTarget.select()}
            readOnly
            ref={manualInputRef}
            type="url"
            value={manualUrl}
          />
          <p className="mt-2 text-xs leading-5 text-cocoa/70" id={`${inputId}-hint`}>
            浏览器阻止了自动分享和复制。完整链接已选中，可以直接复制。
          </p>
        </div>
      ) : null}
    </div>
  );
}
