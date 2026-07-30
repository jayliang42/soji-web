import { membershipPlans } from "@soji/domain";
import type { ContentItem } from "@soji/types";
import type { ContentAccessMode } from "@/lib/content-access";

type AccessTone = "accent" | "neutral" | "success";
type AccessContentItem = Pick<
  ContentItem,
  "requiredEntitlements" | "visibility"
>;

export interface ContentAccessPresentation {
  action: "Read article" | "Read preview" | "View access";
  label: string;
  membershipName: string | null;
  tone: AccessTone;
}

function getMinimumMembershipName(item: AccessContentItem) {
  if (item.requiredEntitlements.length === 0) {
    return null;
  }

  return (
    membershipPlans.find((plan) =>
      item.requiredEntitlements.every((entitlement) =>
        plan.entitlements.includes(entitlement)
      )
    )?.name ?? null
  );
}

export function getContentAccessPresentation(
  item: AccessContentItem,
  accessMode: ContentAccessMode,
  isAuthenticated: boolean
): ContentAccessPresentation {
  const membershipName = getMinimumMembershipName(item);

  if (accessMode === "unavailable") {
    return {
      action: "View access",
      label: "Access temporarily unavailable",
      membershipName,
      tone: "neutral"
    };
  }

  if (accessMode === "full") {
    return {
      action: "Read article",
      label:
        item.visibility === "public"
          ? "Public · Full article"
          : "Included in your membership",
      membershipName,
      tone: "success"
    };
  }

  if (accessMode === "preview" && !isAuthenticated) {
    return {
      action: "Read preview",
      label: "Public preview",
      membershipName,
      tone: "accent"
    };
  }

  return {
    action: "View access",
    label: membershipName
      ? `Included with ${membershipName} membership`
      : "Additional access required",
    membershipName,
    tone: "neutral"
  };
}
