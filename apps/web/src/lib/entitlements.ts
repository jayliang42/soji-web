import type { EntitlementKey } from "@soji/types";

const entitlementLabels: Record<EntitlementKey, string> = {
  "community.vip_access": "私享会员社群",
  "contact.unlock": "直接联系权限",
  "content.all": "完整内容库",
  "content.basic": "基础月度文章",
  "library.case_studies": "案例资料库",
  "library.templates": "可下载模板",
  "monthly.updates": "每月内容更新",
  "office_hours.join": "线上答疑",
  "product.case_study_single": "单篇案例访问权限",
  "product.digital": "电子产品访问权限"
};

export function getEntitlementLabel(entitlement: EntitlementKey) {
  return entitlementLabels[entitlement];
}

export function formatEntitlementList(entitlements: EntitlementKey[]) {
  return new Intl.ListFormat("zh-CN", {
    style: "long",
    type: "conjunction"
  }).format(entitlements.map(getEntitlementLabel));
}
