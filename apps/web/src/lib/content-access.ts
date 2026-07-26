import { hasEntitlement } from "@soji/domain";
import type { ContentItem, EntitlementKey } from "@soji/types";

export type ContentAccessMode = "full" | "preview" | "locked" | "unavailable";

export function getContentAccessMode(
  item: ContentItem,
  {
    entitlements,
    accessUnavailable = false,
    isAuthenticated
  }: {
    accessUnavailable?: boolean;
    entitlements: EntitlementKey[];
    isAuthenticated: boolean;
  }
) {
  if (item.visibility === "public") {
    return "full" satisfies ContentAccessMode;
  }

  if (accessUnavailable) {
    return "unavailable" satisfies ContentAccessMode;
  }

  if (item.visibility === "members_only") {
    if (!isAuthenticated) {
      return "preview" satisfies ContentAccessMode;
    }

    if (
      item.requiredEntitlements.length === 0 ||
      hasEntitlement(entitlements, item.requiredEntitlements)
    ) {
      return "full" satisfies ContentAccessMode;
    }

    return "preview" satisfies ContentAccessMode;
  }

  if (
    item.requiredEntitlements.length > 0 &&
    hasEntitlement(entitlements, item.requiredEntitlements)
  ) {
    return "full" satisfies ContentAccessMode;
  }

  return "locked" satisfies ContentAccessMode;
}

export function getVisibleContentBody(
  item: ContentItem,
  accessMode: ContentAccessMode
) {
  if (accessMode === "full") {
    return item.body;
  }

  if (accessMode === "preview" || accessMode === "unavailable") {
    return item.summary;
  }

  return null;
}
