import type { ProductOffer } from "@soji/types";
import { describe, expect, it } from "vitest";
import {
  buildLaunchChecklist,
  type LaunchChecklistConfig
} from "@/lib/admin-launch-checklist";
import type { OperationalReadiness } from "@/lib/readiness";

const configured: LaunchChecklistConfig = {
  cronSecret: true,
  demoModeDisabled: true,
  operationsAlerts: true,
  productionSiteUrl: true,
  stripeCheckout: true,
  stripeWebhook: true,
  supabasePublic: true,
  supabaseServiceRole: true
};

const operational: OperationalReadiness = {
  launchContentCount: 1,
  launchContentOperational: true,
  officeHourReplayCount: 1,
  officeHourReplayState: "ready",
  officeHourSignupCount: 1,
  officeHourSignupState: "ready",
  officeHoursOperational: true,
  policiesApprovalState: "ready",
  policiesApproved: true,
  stripeMembershipPrices: true,
  stripeTermsAcceptanceReady: true,
  stripeTermsAcceptanceState: "ready",
  supportContactConfigured: true,
  supportContactState: "ready",
  supabasePublicOperational: true,
  supabaseServiceRoleOperational: true
};

const product: ProductOffer = {
  bullets: [],
  deliveryAsset: {
    fileName: "guide.pdf",
    revision: 1,
    sizeBytes: 1024
  },
  entitlement: "product.digital",
  id: "guide",
  isActive: true,
  price: 49,
  priceLabel: "$49",
  slug: "guide",
  stripePriceId: "price_guide",
  summary: "A production-ready guide.",
  title: "Guide"
};

function itemStatus(
  items: ReturnType<typeof buildLaunchChecklist>,
  label: string
) {
  return items.find((item) => item.label === label);
}

function build(overrides: Partial<Parameters<typeof buildLaunchChecklist>[0]> = {}) {
  return buildLaunchChecklist({
    canInspectBilling: true,
    config: configured,
    isDemoPreview: false,
    operationalReadiness: operational,
    products: [product],
    ...overrides
  });
}

describe("admin launch checklist", () => {
  it("does not treat demo Admin access as production evidence", () => {
    const items = build({ isDemoPreview: true });

    expect(itemStatus(items, "First production Admin")).toMatchObject({
      detail: "Demo access does not prove that a production Admin account exists.",
      status: "missing"
    });
    expect(itemStatus(items, "Billing event access")).toMatchObject({
      detail: "Demo billing rows do not verify production billing-event access.",
      status: "missing"
    });
  });

  it("requires production catalog confirmation when products are demo fixtures", () => {
    const items = build({ isDemoPreview: true });

    expect(itemStatus(items, "Product Stripe price IDs")?.status).toBe("manual");
    expect(itemStatus(items, "Product delivery assets")?.status).toBe("manual");
  });

  it("does not accept an editor as the first production Admin", () => {
    const items = build({ canInspectBilling: false });

    expect(itemStatus(items, "First production Admin")?.status).toBe("missing");
    expect(itemStatus(items, "Billing event access")?.status).toBe("missing");
  });

  it("accepts a real Admin and complete production product configuration", () => {
    const items = build();

    expect(itemStatus(items, "First production Admin")?.status).toBe("ready");
    expect(itemStatus(items, "Billing event access")?.status).toBe("ready");
    expect(itemStatus(items, "Product Stripe price IDs")?.status).toBe("ready");
    expect(itemStatus(items, "Product delivery assets")?.status).toBe("ready");
    expect(itemStatus(items, "Flagship launch content")?.status).toBe("ready");
    expect(itemStatus(items, "Office Hours signup destination")?.status).toBe(
      "ready"
    );
    expect(itemStatus(items, "Office Hours replay destination")?.status).toBe(
      "ready"
    );
    expect(itemStatus(items, "Customer support destination")?.status).toBe(
      "ready"
    );
    expect(itemStatus(items, "Customer policies approved")?.status).toBe(
      "ready"
    );
    expect(itemStatus(items, "Stripe Terms acceptance")?.status).toBe("ready");
  });

  it("gives actionable owner-input and invalid launch states", () => {
    const items = build({
      operationalReadiness: {
        ...operational,
        officeHourReplayCount: 0,
        officeHourReplayState: "needs_owner_input",
        officeHourSignupCount: 0,
        officeHourSignupState: "invalid",
        officeHoursOperational: false,
        policiesApprovalState: "needs_owner_input",
        policiesApproved: false,
        stripeTermsAcceptanceReady: false,
        stripeTermsAcceptanceState: "invalid",
        supportContactConfigured: false,
        supportContactState: "invalid"
      }
    });

    expect(itemStatus(items, "Office Hours signup destination")).toMatchObject({
      detail: expect.stringContaining("Admin"),
      status: "invalid"
    });
    expect(itemStatus(items, "Office Hours replay destination")).toMatchObject({
      detail: expect.stringContaining("Admin"),
      status: "needs_owner_input"
    });
    expect(itemStatus(items, "Customer support destination")).toMatchObject({
      detail: expect.stringContaining("NEXT_PUBLIC_SUPPORT_URL"),
      status: "invalid"
    });
    expect(itemStatus(items, "Customer policies approved")?.status).toBe(
      "needs_owner_input"
    );
    expect(itemStatus(items, "Stripe Terms acceptance")?.status).toBe(
      "invalid"
    );
  });
});
