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

export type BillingEventStatus =
  | "received"
  | "processing"
  | "processed"
  | "failed"
  | "ignored";

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

export interface ManagedUser {
  accessRole: UserRole;
  createdAt: string;
  email: string;
  fullName: string | null;
  id: string;
  roles: UserRole[];
  tier: MembershipTier;
}

export interface ManagedUserSnapshot {
  error?: string;
  items: ManagedUser[];
  page: number;
  pageSize: number;
  query: string;
  source: "supabase" | "demo";
  totalItems: number;
  totalPages: number;
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
  revision?: number;
  updatedAt?: string;
  coverImage?: string;
  tags: string[];
  body: string;
}

export interface ContentSnapshot {
  items: ContentItem[];
  source: "supabase" | "demo";
  error?: string;
}

export interface ProductOffer {
  id: string;
  slug: string;
  title: string;
  summary: string;
  price: number;
  priceLabel: string;
  entitlement: EntitlementKey;
  stripePriceId?: string;
  isActive?: boolean;
  revision?: number;
  updatedAt?: string;
  bullets: string[];
  deliveryAsset?: {
    fileName: string;
    revision: number;
    sizeBytes: number;
  };
}

export interface ProductSnapshot {
  items: ProductOffer[];
  source: "supabase" | "demo";
  error?: string;
}

export interface ProductAssetCleanupJob {
  attemptCount: number;
  claimedAt: string | null;
  createdAt: string;
  id: string;
  lastAttemptedAt: string | null;
  lastError: string | null;
  notBefore: string;
  productId: string | null;
  reason: "abandoned_upload" | "deleted_asset" | "replaced_asset";
  status: "failed" | "pending" | "processing";
  storagePath: string;
}

export interface ProductAssetCleanupSnapshot {
  error?: string;
  items: ProductAssetCleanupJob[];
  source: "supabase" | "unavailable";
}

export interface OfficeHourSession {
  id: string;
  title: string;
  startsAt: string;
  replayUrl?: string;
  signupUrl: string;
  requiredEntitlements: EntitlementKey[];
  revision?: number;
  updatedAt?: string;
}

export interface OfficeHourSnapshot {
  items: OfficeHourSession[];
  source: "supabase" | "demo";
  error?: string;
}

export interface AdminMetric {
  label: string;
  value: string;
  detail: string;
}

export interface BillingEventLog {
  attemptCount: number;
  customerId?: string | null;
  disputeId?: string | null;
  lastAttemptedAt: string | null;
  id: string;
  objectId?: string | null;
  objectType?: string | null;
  paymentId?: string | null;
  provider: BillingProvider;
  providerEventId: string;
  eventType: string;
  status: BillingEventStatus;
  processedAt: string | null;
  processingError: string | null;
  processingStartedAt: string | null;
  subscriptionId?: string | null;
  createdAt: string;
}

export interface BillingEventSnapshot {
  error?: string;
  items: BillingEventLog[];
  page: number;
  pageSize: number;
  source: "supabase" | "demo";
  totalItems: number;
  totalPages: number;
}
