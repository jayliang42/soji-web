import { hasEntitlement } from "@soji/domain";
import type { EntitlementKey, OfficeHourSession } from "@soji/types";
import { validateOfficeHourDestination } from "@/lib/launch-inputs";

export type OfficeHourLifecycle =
  | "replay_pending"
  | "replay_ready"
  | "unavailable"
  | "upcoming";

export interface OfficeHourPresentation {
  accessLabel:
    | "Access temporarily unavailable"
    | "Included in your membership"
    | "Included with Guided membership";
  id: string;
  lifecycle: OfficeHourLifecycle;
  primaryAction?: {
    href?: string;
    label: "Compare membership" | "Replay coming soon" | "Reserve a seat" | "Watch replay";
  };
  startsAt: string;
  startsAtLabel: string;
  statusLabel: "Replay" | "Replay coming soon" | "Session unavailable" | "Upcoming";
  title: string;
}

export interface OfficeHourPresentationAccess {
  entitlements: EntitlementKey[];
  isAuthenticated: boolean;
  verificationUnavailable?: boolean;
}

function formatOfficeHourDate(startsAt: string) {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone: "America/Chicago",
    timeZoneName: "shortGeneric",
    year: "numeric"
  }).format(date);
}

function unavailablePresentation(
  session: OfficeHourSession,
  startsAtLabel: string
): OfficeHourPresentation {
  return {
    accessLabel: "Access temporarily unavailable",
    id: session.id,
    lifecycle: "unavailable",
    startsAt: session.startsAt,
    startsAtLabel,
    statusLabel: "Session unavailable",
    title: session.title
  };
}

export function buildOfficeHourPresentation(
  session: OfficeHourSession,
  access: OfficeHourPresentationAccess,
  now: Date
): OfficeHourPresentation {
  const startsAtLabel = formatOfficeHourDate(session.startsAt);
  const startsAt = new Date(session.startsAt);
  if (
    !startsAtLabel ||
    Number.isNaN(startsAt.getTime()) ||
    access.verificationUnavailable
  ) {
    return unavailablePresentation(session, startsAtLabel ?? "Date unavailable");
  }

  const upcoming = startsAt.getTime() > now.getTime();
  const selectedTarget = upcoming ? session.signupUrl : session.replayUrl;
  const targetValidation = selectedTarget
    ? validateOfficeHourDestination(selectedTarget)
    : null;

  if (selectedTarget && !targetValidation?.ok) {
    return unavailablePresentation(session, startsAtLabel);
  }
  const safeTarget = targetValidation?.ok ? targetValidation.value : undefined;

  const entitled =
    access.isAuthenticated &&
    hasEntitlement(access.entitlements, session.requiredEntitlements);
  const accessLabel = entitled
    ? "Included in your membership"
    : "Included with Guided membership";

  if (upcoming) {
    return {
      accessLabel,
      id: session.id,
      lifecycle: "upcoming",
      primaryAction: entitled
        ? { href: safeTarget, label: "Reserve a seat" }
        : { href: undefined, label: "Compare membership" },
      startsAt: session.startsAt,
      startsAtLabel,
      statusLabel: "Upcoming",
      title: session.title
    };
  }

  if (!session.replayUrl) {
    return {
      accessLabel,
      id: session.id,
      lifecycle: "replay_pending",
      primaryAction: { href: undefined, label: "Replay coming soon" },
      startsAt: session.startsAt,
      startsAtLabel,
      statusLabel: "Replay coming soon",
      title: session.title
    };
  }

  return {
    accessLabel,
    id: session.id,
    lifecycle: "replay_ready",
    primaryAction: entitled
      ? { href: safeTarget, label: "Watch replay" }
      : { href: undefined, label: "Compare membership" },
    startsAt: session.startsAt,
    startsAtLabel,
    statusLabel: "Replay",
    title: session.title
  };
}
