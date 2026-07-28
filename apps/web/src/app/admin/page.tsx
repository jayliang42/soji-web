import Link from "next/link";
import type { Metadata } from "next";
import type { AdminMetric } from "@soji/types";
import { AdminMetrics } from "@/components/admin-metrics";
import { AdminBillingEvents } from "@/components/admin-billing-events";
import { AdminContentForm } from "@/components/admin-content-form";
import { AdminContentEditor } from "@/components/admin-content-editor";
import { AdminLaunchChecklist } from "@/components/admin-launch-checklist";
import { AdminOfficeHoursEditor } from "@/components/admin-office-hours-editor";
import { AdminProductsEditor } from "@/components/admin-products-editor";
import { AdminProductAssetCleanup } from "@/components/admin-product-asset-cleanup";
import { AdminUsers } from "@/components/admin-users";
import { SectionShell } from "@/components/section-shell";
import { getAdminMetricsSnapshot } from "@/lib/admin-metrics";
import { buildLaunchChecklist } from "@/lib/admin-launch-checklist";
import { getManagedUserSnapshot } from "@/lib/admin-users";
import { getBillingEventSnapshot } from "@/lib/billing";
import { getEditorialContentSnapshot } from "@/lib/content";
import {
  hasCronSecretConfig,
  getOpsAlertConfigState,
  hasProductionSiteUrlConfig,
  hasStripeConfig,
  hasStripeWebhookConfig,
  hasSupabaseAdminConfig,
  hasSupabaseConfig,
  isExplicitDemoModeEnabled
} from "@/lib/env";
import { getOfficeHourSnapshot } from "@/lib/office-hours";
import { getProductAssetCleanupSnapshot } from "@/lib/product-asset-cleanup";
import { getProductSnapshot } from "@/lib/products";
import { getOperationalReadiness } from "@/lib/readiness";
import { hasAdminAccess, hasPublisherAccess } from "@/lib/roles";
import { getSessionSnapshot } from "@/lib/session";

export const metadata: Metadata = {
  title: "Admin",
  robots: { follow: false, index: false }
};

const adminViews = [
  ["overview", "Overview"],
  ["content", "Content"],
  ["products", "Products"],
  ["office-hours", "Office hours"],
  ["users", "Users"],
  ["billing", "Billing"]
] as const;

type AdminView = (typeof adminViews)[number][0];

function getAdminView(value: string | undefined): AdminView {
  return adminViews.some(([id]) => id === value)
    ? (value as AdminView)
    : "overview";
}

export default async function AdminPage({
  searchParams
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const view = getAdminView((await searchParams).view);
  const session = await getSessionSnapshot();
  const canPublish = Boolean(
    session.user && hasPublisherAccess(session.user.roles)
  );
  const canInspectBilling = Boolean(
    session.user && hasAdminAccess(session.user.roles)
  );
  const isDemoPreview = session.source === "demo";
  const canAccessAdmin = canPublish || isDemoPreview;

  if (session.error) {
    return (
      <main>
        <SectionShell
          eyebrow="Admin"
          headingLevel={1}
          title="Admin services are unavailable."
          description="Authentication or role data could not be verified, so operational tools remain locked."
        >
          <div className="rounded-lg border border-clay/30 bg-accent-muted p-5 text-sm text-cocoa/80">
            Check the deployment configuration and service health before trying again.
          </div>
        </SectionShell>
      </main>
    );
  }

  if (!session.user && session.source === "supabase") {
    return (
      <main>
        <SectionShell
          eyebrow="Admin"
          headingLevel={1}
          title="Sign in to manage Soji."
          description="Admin tools are available only to accounts with editor or admin roles."
        >
          <div className="rounded-lg border border-dune bg-shell p-6">
            <p className="text-cocoa/75">
              Use the main account. If no Admin exists yet, run
              `supabase/publisher-setup.sql` once to bootstrap it.
            </p>
            <Link
              href="/login?next=/admin"
              className="mt-5 inline-flex rounded-md bg-cocoa px-5 py-3 text-sm font-semibold text-white"
            >
              Sign in
            </Link>
          </div>
        </SectionShell>
      </main>
    );
  }

  if (!canAccessAdmin) {
    return (
      <main>
        <SectionShell
          eyebrow="Admin"
          headingLevel={1}
          title="Admin access required."
          description="This account is signed in, but it does not have an editor or admin role."
        >
          <div className="rounded-lg border border-dune bg-shell p-6 text-cocoa/75">
            Ask an existing Admin to grant access in the Users workspace. Run
            `supabase/publisher-setup.sql` only when establishing the first Admin.
          </div>
        </SectionShell>
      </main>
    );
  }

  const [
    contentSnapshot,
    billingSnapshot,
    officeHourSnapshot,
    productSnapshot,
    metricsSnapshot,
    userSnapshot,
    productAssetCleanupSnapshot,
    operationalReadiness
  ] = await Promise.all([
      canPublish && (view === "overview" || view === "content")
        ? getEditorialContentSnapshot()
        : Promise.resolve({ items: [], source: "demo" as const }),
      canInspectBilling && view === "billing"
        ? getBillingEventSnapshot()
        : Promise.resolve({
            items: [],
            page: 1,
            pageSize: 25,
            source: "demo" as const,
            totalItems: 0,
            totalPages: 1
          }),
      canPublish && (view === "overview" || view === "office-hours")
        ? getOfficeHourSnapshot()
        : Promise.resolve({ items: [], source: "demo" as const }),
      canPublish && (view === "overview" || view === "products")
        ? getProductSnapshot({ includeInactive: true })
        : Promise.resolve({ items: [], source: "demo" as const }),
      canInspectBilling && view === "overview"
        ? getAdminMetricsSnapshot()
        : Promise.resolve({
            error: undefined,
            metrics: [],
            source: "unavailable" as const
          }),
      canInspectBilling && view === "users"
        ? getManagedUserSnapshot()
        : Promise.resolve({
            items: [],
            page: 1,
            pageSize: 25,
            query: "",
            source: "demo" as const,
            totalItems: 0,
            totalPages: 0
          }),
      canInspectBilling && view === "products"
        ? getProductAssetCleanupSnapshot()
        : Promise.resolve({ items: [], source: "unavailable" as const }),
      view === "overview"
        ? getOperationalReadiness()
        : Promise.resolve({
            launchContentCount: 0,
            launchContentOperational: false,
            officeHourReplayCount: 0,
            officeHourReplayState: "needs_owner_input" as const,
            officeHourSignupCount: 0,
            officeHourSignupState: "needs_owner_input" as const,
            officeHoursOperational: false,
            policiesApprovalState: "needs_owner_input" as const,
            policiesApproved: false,
            stripeMembershipPrices: false,
            stripeTermsAcceptanceReady: false,
            stripeTermsAcceptanceState: "needs_owner_input" as const,
            supportContactConfigured: false,
            supportContactState: "needs_owner_input" as const,
            supabasePublicOperational: false,
            supabaseServiceRoleOperational: false
          })
    ]);
  const launchChecklist = buildLaunchChecklist({
    canInspectBilling,
    config: {
      cronSecret: hasCronSecretConfig(),
      demoModeDisabled: !isExplicitDemoModeEnabled(),
      operationsAlerts: getOpsAlertConfigState(undefined, "production"),
      productionSiteUrl: hasProductionSiteUrlConfig(),
      stripeCheckout: hasStripeConfig(),
      stripeWebhook: hasStripeWebhookConfig(),
      supabasePublic: hasSupabaseConfig(),
      supabaseServiceRole: hasSupabaseAdminConfig()
    },
    isDemoPreview,
    operationalReadiness,
    products: productSnapshot.items
  });
  const operationalMetrics: AdminMetric[] =
    metricsSnapshot.metrics.length > 0
      ? metricsSnapshot.metrics
      : [
          {
            detail: "Items available in the editorial workspace",
            label: "Content items",
            value: String(contentSnapshot.items.length)
          },
          {
            detail: "Products available in the product workspace",
            label: "Products",
            value: String(productSnapshot.items.length)
          },
          {
            detail: "Sessions available in the office-hours workspace",
            label: "Office hours",
            value: String(officeHourSnapshot.items.length)
          }
        ];

  return (
    <main>
      <SectionShell
        eyebrow="Admin"
        headingLevel={1}
        title="Editorial, membership, and revenue operations"
        description="Publish previews, manage paid content, monitor launch readiness, and keep live member sessions current."
      >
        <div className="mb-3 border-l-4 border-clay bg-white px-5 py-4 text-sm text-cocoa/80">
          Bootstrap the first production Admin once with
          `supabase/publisher-setup.sql`. After that, manage editor and Admin access
          in Users; every role change is audited.
        </div>
        <div className="mb-6 border-l-4 border-dune bg-white px-5 py-4 text-sm text-cocoa/80">
          Current publisher state:{" "}
          {isDemoPreview
            ? "demo preview. Configure Supabase and sign in as editor/admin for production."
            : canPublish
              ? `enabled for ${session.user?.email}`
              : "read-only. Sign in with an editor/admin account to publish."}
        </div>
        <nav
          aria-label="Admin sections"
          className="sticky top-[105px] z-20 -mx-2 mb-8 grid grid-cols-3 gap-1 border-y border-dune bg-cream/95 px-2 py-2 backdrop-blur md:top-[71px] md:flex"
        >
          {adminViews.map(([id, label]) => {
            const isActive = id === view;
            return (
              <Link
                key={id}
                href={id === "overview" ? "/admin" : `/admin?view=${id}`}
                aria-current={isActive ? "page" : undefined}
                className={`whitespace-nowrap rounded-md px-2 py-2 text-center text-sm font-semibold transition-colors md:px-4 ${
                  isActive
                    ? "bg-cocoa text-white"
                    : "text-cocoa/72 hover:bg-white hover:text-cocoa"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {view === "overview" ? (
          <section aria-labelledby="admin-overview-heading" className="space-y-6">
            <h2 id="admin-overview-heading" className="sr-only">
              Overview
            </h2>
            <AdminMetrics metrics={operationalMetrics} />
            {metricsSnapshot.error ? (
              <p className="rounded-lg border border-clay/25 bg-accent-muted px-4 py-3 text-sm text-cocoa">
                Revenue metrics could not be loaded. Content operations remain available.
              </p>
            ) : null}
            <AdminLaunchChecklist items={launchChecklist} />
          </section>
        ) : null}

        {view === "content" ? (
          <section
            aria-labelledby="admin-content-heading"
            className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]"
          >
            <h2 id="admin-content-heading" className="sr-only">
              Content
            </h2>
            <AdminContentForm enabled={canPublish} />
            <AdminContentEditor
              enabled={canPublish}
              items={contentSnapshot.items}
              source={contentSnapshot.source}
            />
          </section>
        ) : null}

        {view === "products" ? (
          <section aria-labelledby="admin-products-heading" className="space-y-6">
            <h2 id="admin-products-heading" className="sr-only">
              Products
            </h2>
            <AdminProductsEditor
              enabled={canPublish}
              items={productSnapshot.items}
              source={productSnapshot.source}
            />
            <AdminProductAssetCleanup
              canInspect={canInspectBilling}
              snapshot={productAssetCleanupSnapshot}
            />
          </section>
        ) : null}

        {view === "office-hours" ? (
          <section aria-labelledby="admin-office-hours-heading">
            <h2 id="admin-office-hours-heading" className="sr-only">
              Office hours
            </h2>
            <AdminOfficeHoursEditor
              enabled={canPublish}
              items={officeHourSnapshot.items}
              source={officeHourSnapshot.source}
            />
          </section>
        ) : null}

        {view === "users" ? (
          <section aria-labelledby="admin-users-heading">
            <h2 id="admin-users-heading" className="sr-only">
              Users
            </h2>
            <AdminUsers
              currentUserId={session.user?.id}
              enabled={canInspectBilling}
              snapshot={userSnapshot}
            />
          </section>
        ) : null}

        {view === "billing" ? (
          <section aria-labelledby="admin-billing-heading">
            <h2 id="admin-billing-heading" className="sr-only">
              Billing
            </h2>
            <AdminBillingEvents
              canInspect={canInspectBilling}
              snapshot={billingSnapshot}
            />
          </section>
        ) : null}
      </SectionShell>
    </main>
  );
}
