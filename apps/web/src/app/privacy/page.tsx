import type { Metadata } from "next";
import { PolicyLayout } from "@/components/policy-layout";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How GS学院 currently collects, uses, and shares account, billing, support, and operational data.",
  alternates: { canonical: "/privacy" }
};

export default function PrivacyPage() {
  return (
    <PolicyLayout
      eyebrow="Customer policy"
      title="Privacy"
      summary="This draft describes the data used by the current GS学院 web service. It does not describe features that have not been launched."
      updatedAt="July 27, 2026"
      sections={[
        {
          id: "data-we-use",
          title: "Information the service uses",
          content: (
            <>
              <p>
                Supabase stores account identifiers, profile details you
                provide, roles, entitlements, content access records, and
                product or subscription records needed to operate your account.
              </p>
              <p>
                Stripe processes payment details and returns billing
                identifiers, status, amounts, and limited transaction facts
                needed for Checkout, access, refunds, disputes, and account
                support. GS学院 does not store full card numbers.
              </p>
            </>
          )
        },
        {
          id: "how-we-use-data",
          title: "How information is used",
          content: (
            <ul>
              <li>Authenticate accounts and protect sessions.</li>
              <li>Deliver eligible articles, Office Hours access, and purchases.</li>
              <li>Synchronize billing status and respond to support requests.</li>
              <li>Keep bounded operational and security logs for reliability.</li>
            </ul>
          )
        },
        {
          id: "storage-and-sharing",
          title: "Storage and service providers",
          content: (
            <p>
              GS学院 uses Supabase for application data and authentication and
              Stripe for payment and billing operations. Essential
              session/security storage keeps you signed in and helps prevent
              abuse. Support communications are retained by the channel used to
              contact us. Data may also be disclosed when required to comply
              with applicable law or protect the service and its users.
            </p>
          )
        },
        {
          id: "current-limits",
          title: "What GS学院 does not currently do",
          content: (
            <p>
              We do not sell personal information. The current web service does
              not run an advertising network or unimplemented marketing
              analytics. If the product changes, this page should be updated
              before the new processing begins.
            </p>
          )
        },
        {
          id: "choices",
          title: "Your choices",
          content: (
            <p>
              You may use Support to ask about account information, corrections,
              or deletion. Some billing, security, dispute, and operational
              records may need to be retained for legitimate service, fraud
              prevention, or legal obligations. A request does not alter a
              provider record that must remain with Stripe.
            </p>
          )
        }
      ]}
    />
  );
}
