"use client";

import { useEffect, useRef, useState } from "react";
import {
  calculateReadingProgress,
  getBrowserReadingProgressStorage,
  getResumeScrollTop,
  readGuideProgress,
  type ReadingProgressEntry,
  writeGuideProgress
} from "@/lib/reading-progress";

const MOBILE_HEADER_OFFSET = 72;
const DESKTOP_HEADER_OFFSET = 76;
const RESUME_MINIMUM_PROGRESS = 5;
const RESUME_MAXIMUM_PROGRESS = 97;
const STORAGE_WRITE_INTERVAL_MS = 250;

function getHeaderOffset() {
  return window.matchMedia("(min-width: 768px)").matches
    ? DESKTOP_HEADER_OFFSET
    : MOBILE_HEADER_OFFSET;
}

function getTargetMeasurements(target: HTMLElement) {
  const headerOffset = getHeaderOffset();
  const targetTop = target.getBoundingClientRect().top + window.scrollY;
  const progress = calculateReadingProgress({
    headerOffset,
    scrollY: window.scrollY,
    targetHeight: target.scrollHeight,
    targetTop,
    viewportHeight: window.innerHeight
  });

  return {
    headerOffset,
    offset: Math.max(0, window.scrollY - targetTop + headerOffset),
    progress,
    targetTop
  };
}

function scrollToStoredProgress(
  target: HTMLElement,
  entry: ReadingProgressEntry
) {
  const { headerOffset, targetTop } = getTargetMeasurements(target);
  const top = getResumeScrollTop({
    headerOffset,
    offset: entry.offset,
    targetTop
  });
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  window.scrollTo({
    behavior: reduceMotion ? "auto" : "smooth",
    top
  });
}

function removeResumeRequest() {
  const url = new URL(window.location.href);
  url.searchParams.delete("resume");
  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}${url.hash}`
  );
}

export function GuideReadingProgress({
  slug,
  targetId,
  title
}: {
  slug: string;
  targetId: string;
  title: string;
}) {
  const [progress, setProgress] = useState(0);
  const [savedProgress, setSavedProgress] =
    useState<ReadingProgressEntry | null>(null);
  const [resumeStatus, setResumeStatus] = useState("");
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const lastMeasurementRef = useRef({ offset: 0, progress: 0 });
  const lastWriteAtRef = useRef(0);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) {
      return;
    }
    const readingTarget = target;

    const storage = getBrowserReadingProgressStorage();
    const restored = readGuideProgress(slug, storage);
    setSavedProgress(restored);

    let animationFrame = 0;
    let resumeAnimationFrame = 0;
    let active = true;

    function persistMeasurement(force = false) {
      const measurement = lastMeasurementRef.current;
      if (measurement.progress < 1) {
        return;
      }

      const now = Date.now();
      if (
        !force &&
        measurement.progress < 100 &&
        now - lastWriteAtRef.current < STORAGE_WRITE_INTERVAL_MS
      ) {
        return;
      }

      lastWriteAtRef.current = now;
      const next = writeGuideProgress(
        {
          offset: measurement.offset,
          progress: measurement.progress,
          slug,
          updatedAt: new Date(now).toISOString()
        },
        storage
      );

      if (!active) {
        return;
      }
      if (next) {
        setSavedProgress(next);
        setStorageUnavailable(false);
      } else {
        setStorageUnavailable(true);
      }
    }

    function measure(shouldPersist: boolean) {
      const measurement = getTargetMeasurements(readingTarget);
      lastMeasurementRef.current = {
        offset: measurement.offset,
        progress: measurement.progress
      };
      setProgress((current) =>
        current === measurement.progress ? current : measurement.progress
      );

      if (shouldPersist) {
        persistMeasurement();
      }
    }

    function scheduleMeasurement(shouldPersist: boolean) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() =>
        measure(shouldPersist)
      );
    }

    function handleScroll() {
      scheduleMeasurement(true);
    }

    function handleResize() {
      scheduleMeasurement(false);
    }

    function handlePageHide() {
      persistMeasurement(true);
    }

    measure(false);
    if (new URLSearchParams(window.location.search).get("resume") === "1") {
      if (
        restored &&
        restored.progress >= RESUME_MINIMUM_PROGRESS &&
        restored.progress <= RESUME_MAXIMUM_PROGRESS
      ) {
        resumeAnimationFrame = window.requestAnimationFrame(() => {
          scrollToStoredProgress(readingTarget, restored);
          setProgress(restored.progress);
          setResumeStatus(
            `已从《${title}》的 ${restored.progress}% 处继续阅读。`
          );
          removeResumeRequest();
        });
      } else {
        removeResumeRequest();
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);
    window.addEventListener("pagehide", handlePageHide);
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => scheduleMeasurement(false));
    resizeObserver?.observe(readingTarget);

    return () => {
      active = false;
      window.cancelAnimationFrame(animationFrame);
      window.cancelAnimationFrame(resumeAnimationFrame);
      resizeObserver?.disconnect();
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pagehide", handlePageHide);
      persistMeasurement(true);
    };
  }, [slug, targetId, title]);

  const canResume =
    savedProgress !== null &&
    savedProgress.progress >= RESUME_MINIMUM_PROGRESS &&
    savedProgress.progress <= RESUME_MAXIMUM_PROGRESS &&
    progress + 2 < savedProgress.progress;
  const progressLabel = storageUnavailable
    ? `已阅读 ${progress}% · 进度未保存`
    : `已阅读 ${progress}%`;

  function resumeReading() {
    const target = document.getElementById(targetId);
    if (!target || !savedProgress) {
      return;
    }

    scrollToStoredProgress(target, savedProgress);
    setProgress(savedProgress.progress);
    setResumeStatus(`已从《${title}》的 ${savedProgress.progress}% 处继续阅读。`);
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <span className="text-xs font-bold text-cocoa/62">{progressLabel}</span>
      {canResume ? (
        <button
          className="inline-flex min-h-11 items-center rounded-md border border-clay/35 bg-accent-muted px-3 text-xs font-bold text-clay transition-colors hover:border-clay hover:bg-sand"
          onClick={resumeReading}
          type="button"
        >
          从 {savedProgress.progress}% 处继续
        </button>
      ) : null}
      <progress
        aria-label={`《${title}》的阅读进度`}
        className={`reading-progress pointer-events-none fixed left-0 top-[72px] z-30 h-1 w-full transition-opacity md:top-[76px] ${
          progress > 0 && progress < 100 ? "opacity-100" : "opacity-0"
        }`}
        max={100}
        value={progress}
      >
        {progress}%
      </progress>
      <span aria-live="polite" className="sr-only">
        {resumeStatus}
      </span>
    </div>
  );
}
