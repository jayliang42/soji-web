import { hasEntitlement } from "@soji/domain";
import type { ContentItem, EntitlementKey } from "@soji/types";

export type ContentAccessMode = "full" | "preview" | "locked";

export function getContentAccessMode(
  item: ContentItem,
  entitlements: EntitlementKey[]
) {
  if (item.visibility === "public") {
    return "full" satisfies ContentAccessMode;
  }

  if (hasEntitlement(entitlements, item.requiredEntitlements)) {
    return "full" satisfies ContentAccessMode;
  }

  if (item.visibility === "members_only") {
    return "preview" satisfies ContentAccessMode;
  }

  return "locked" satisfies ContentAccessMode;
}

export function getPreviewBody(body: string) {
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (paragraphs.length <= 2) {
    return body;
  }

  return `${paragraphs.slice(0, 2).join("\n\n")}\n\n...`;
}
