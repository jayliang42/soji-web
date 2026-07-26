import Link from "next/link";
import type { Metadata } from "next";
import { MembershipPlanGrid } from "@/components/membership-plan-grid";
import { DataUnavailable } from "@/components/data-state";
import {
  getAccountSubscriptions,
  hasOpenStripeMembership
} from "@/lib/account-subscriptions";
import {
  getBillingDeliveryReadiness,
  isBillingDeliveryReady
} from "@/lib/billing-readiness";
import { hasStripeConfig } from "@/lib/env";
import { getSessionSnapshot } from "@/lib/session";

export const metadata: Metadata = {
  title: "Membership",
  description:
    "Compare Well Endowed membership levels for foundational essays, practical templates, monthly drops, and live support.",
  alternates: { canonical: "/pricing" }
};

export default async function PricingPage({
  searchParams
}: {
  searchParams: Promise<{ checkout?: string; purchase?: string }>;
}) {
  const [snapshot, params] = await Promise.all([
    getSessionSnapshot(),
    searchParams
  ]);
  const customerEmail = snapshot.user?.email ?? null;
  const subscriptions = snapshot.user
    ? await getAccountSubscriptions(snapshot.user.id, snapshot.source)
    : { items: [] };
  const subscriptionStateUnavailable = Boolean(snapshot.error || subscriptions.error);
  const hasExistingMembership = hasOpenStripeMembership(subscriptions.items);
  let checkoutEnabled = false;
  if (
    customerEmail &&
    !subscriptionStateUnavailable &&
    !hasExistingMembership &&
    hasStripeConfig()
  ) {
    checkoutEnabled = isBillingDeliveryReady(
      await getBillingDeliveryReadiness()
    );
  }
  const cancelled = params.checkout === "cancelled" || params.purchase === "cancelled";

  return (
    <main>
      <section className="mx-auto max-w-6xl px-6 pb-7 pt-8 md:pb-10 md:pt-10">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase text-cocoa/62">Membership</p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-[1] text-cocoa md:text-6xl">
              Choose your membership
            </h1>
          </div>
          <p className="max-w-2xl text-base font-medium leading-7 text-cocoa/72 md:text-lg md:leading-8">
            Start with foundational essays, move into the complete working library,
            or add live support when your decisions need closer guidance.
          </p>
        </div>
        {cancelled ? (
          <div className="mt-6 rounded-lg border border-clay/25 bg-accent-muted px-5 py-4 text-sm font-medium text-cocoa">
            Checkout was cancelled. Your account was not charged, and you can restart whenever you are ready.
          </div>
        ) : null}
        {subscriptionStateUnavailable ? (
          <div className="mt-6">
            <DataUnavailable
              title="Membership status unavailable"
              description="We could not verify your current membership, so checkout is paused to prevent a duplicate subscription. Try again shortly or manage billing from your account."
            />
          </div>
        ) : null}
      </section>
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-3 md:pt-6" aria-labelledby="membership-options">
        <div className="mb-7 max-w-3xl md:mb-9">
          <p className="text-xs font-bold uppercase text-cocoa/62">Three monthly options</p>
          <h2 id="membership-options" className="mt-3 font-display text-3xl font-bold leading-[1.02] text-cocoa md:mt-4 md:text-5xl">
            Compare access and support
          </h2>
          <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-cocoa/72 md:mt-4 md:text-lg md:leading-8">
            Choose what fits now. You can manage or cancel your subscription from your account.
          </p>
        </div>
        <MembershipPlanGrid
          checkoutEnabled={checkoutEnabled}
          customerEmail={customerEmail}
          hasExistingMembership={hasExistingMembership}
        />
      </section>
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-6">
        <div className="border-y border-dune py-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs uppercase text-cocoa/70">
                Need a softer entry point?
              </p>
              <h2 className="mt-4 font-display text-4xl leading-[1] text-cocoa">
                Browse the public library before choosing a membership.
              </h2>
            </div>
            <Link
              href="/library"
              className="rounded-md border border-cocoa px-7 py-4 text-sm font-semibold uppercase text-cocoa transition-colors hover:bg-cocoa hover:text-white"
            >
              Browse public previews
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
