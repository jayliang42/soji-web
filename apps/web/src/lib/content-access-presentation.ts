import { membershipPlans } from "@soji/domain";
import type { ContentItem, MembershipPlan } from "@soji/types";
import type { ContentAccessMode } from "@/lib/content-access";

type AccessTone = "accent" | "neutral" | "success";
type AccessContentItem = Pick<
  ContentItem,
  "requiredEntitlements" | "visibility"
>;

export interface ContentAccessPresentation {
  action: "阅读全文" | "阅读预览" | "查看权限";
  label: string;
  membershipName: string | null;
  membershipPlanId: MembershipPlan["id"] | null;
  tone: AccessTone;
}

function getMinimumMembership(item: AccessContentItem) {
  if (item.requiredEntitlements.length === 0) {
    return null;
  }

  return membershipPlans.find((plan) =>
    item.requiredEntitlements.every((entitlement) =>
      plan.entitlements.includes(entitlement)
    )
  );
}

export function getContentAccessPresentation(
  item: AccessContentItem,
  accessMode: ContentAccessMode,
  isAuthenticated: boolean
): ContentAccessPresentation {
  const membership = getMinimumMembership(item);
  const membershipName = membership?.name ?? null;
  const membershipPlanId = membership?.id ?? null;

  if (accessMode === "unavailable") {
    return {
      action: "查看权限",
      label: "暂时无法确认访问权限",
      membershipName,
      membershipPlanId,
      tone: "neutral"
    };
  }

  if (accessMode === "full") {
    return {
      action: "阅读全文",
      label:
        item.visibility === "public"
          ? "公开内容 · 可阅读全文"
          : "已包含在你的会员权益中",
      membershipName,
      membershipPlanId,
      tone: "success"
    };
  }

  if (accessMode === "preview" && !isAuthenticated) {
    return {
      action: "阅读预览",
      label: "公开预览",
      membershipName,
      membershipPlanId,
      tone: "accent"
    };
  }

  return {
    action: "查看权限",
    label: membershipName
      ? `${membershipName} 会员权益可读`
      : "需要额外权限",
    membershipName,
    membershipPlanId,
    tone: "neutral"
  };
}
