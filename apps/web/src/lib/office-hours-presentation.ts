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
    | "访问权限暂时不可用"
    | "当前账号已包含"
    | "线上答疑方案包含";
  id: string;
  lifecycle: OfficeHourLifecycle;
  primaryAction?: {
    href?: string;
    label: "查看解锁方案" | "回放即将上线" | "预约席位" | "观看回放";
  };
  startsAt: string;
  startsAtLabel: string;
  statusLabel: "回放" | "回放即将上线" | "场次暂不可用" | "即将开始";
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

  return new Intl.DateTimeFormat("zh-CN", {
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
    accessLabel: "访问权限暂时不可用",
    id: session.id,
    lifecycle: "unavailable",
    startsAt: session.startsAt,
    startsAtLabel,
    statusLabel: "场次暂不可用",
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
    return unavailablePresentation(session, startsAtLabel ?? "日期暂不可用");
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
    ? "当前账号已包含"
    : "线上答疑方案包含";

  if (upcoming) {
    return {
      accessLabel,
      id: session.id,
      lifecycle: "upcoming",
      primaryAction: entitled
        ? { href: safeTarget, label: "预约席位" }
        : { href: undefined, label: "查看解锁方案" },
      startsAt: session.startsAt,
      startsAtLabel,
      statusLabel: "即将开始",
      title: session.title
    };
  }

  if (!session.replayUrl) {
    return {
      accessLabel,
      id: session.id,
      lifecycle: "replay_pending",
      primaryAction: { href: undefined, label: "回放即将上线" },
      startsAt: session.startsAt,
      startsAtLabel,
      statusLabel: "回放即将上线",
      title: session.title
    };
  }

  return {
    accessLabel,
    id: session.id,
    lifecycle: "replay_ready",
    primaryAction: entitled
      ? { href: safeTarget, label: "观看回放" }
      : { href: undefined, label: "查看解锁方案" },
    startsAt: session.startsAt,
    startsAtLabel,
    statusLabel: "回放",
    title: session.title
  };
}
