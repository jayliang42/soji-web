export type MembershipTier = "free" | "tier_1" | "tier_2" | "tier_3";

export type EntitlementKey =
  | "content.basic"
  | "content.all"
  | "library.case_studies"
  | "library.templates"
  | "monthly.updates"
  | "office_hours.join"
  | "community.vip_access"
  | "contact.unlock"
  | "product.digital";

export type ContentType =
  | "article"
  | "case_study"
  | "template"
  | "monthly_update"
  | "product"
  | "office_hour_session";

export type Visibility = "public" | "members_only" | "purchase_required";

export type AuthProvider = "email" | "google" | "x" | "facebook";

export type BillingProvider = "stripe" | "app_store" | "play_store";

export type UserRole = "member" | "editor" | "admin";

export interface MembershipPlan {
  id: MembershipTier;
  name: string;
  monthlyPrice: number;
  annualPrice?: number;
  stripePriceLookupKey?: string;
  revenueCatEntitlement?: string;
  description: string;
  featured?: boolean;
  entitlements: EntitlementKey[];
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  tier: MembershipTier;
  roles: UserRole[];
  providers: AuthProvider[];
}

export interface ContentItem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  type: ContentType;
  visibility: Visibility;
  requiredEntitlements: EntitlementKey[];
  publishedAt: string;
  coverImage?: string;
  tags: string[];
  body: string;
}

export interface OfficeHourSession {
  id: string;
  title: string;
  startsAt: string;
  replayUrl?: string;
  signupUrl: string;
  requiredEntitlements: EntitlementKey[];
}

export interface AdminMetric {
  label: string;
  value: string;
  detail: string;
}
