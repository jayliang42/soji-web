import type { Metadata } from "next";
import { PolicyLayout } from "@/components/policy-layout";
import { getPublicSupportDestination } from "@/lib/customer-policy";

export const metadata: Metadata = {
  title: "Support",
  description:
    "Get help with a Soji account, membership, purchase, download, or accessibility issue.",
  alternates: { canonical: "/support" }
};

export default function SupportPage() {
  const destination = getPublicSupportDestination();

  return (
    <PolicyLayout
      eyebrow="Customer care"
      title="Support"
      summary="Use this page for help with your Soji account, membership, billing record, or digital purchase."
      updatedAt="July 27, 2026"
      sections={[
        {
          id: "contact",
          title: "Contact Support",
          content: destination.ok ? (
            <>
              <p>
                Tell us what you were trying to do and what happened. Include
                the page name and the approximate time of the issue.
              </p>
              <p>
                <a href={destination.value}>Open the Soji support channel</a>.
              </p>
            </>
          ) : (
            <p>
              The durable support channel is being configured. Please return
              before purchasing; Checkout remains unavailable until it is real.
            </p>
          )
        },
        {
          id: "help-topics",
          title: "What we can help with",
          content: (
            <ul>
              <li>Account access, email confirmation, and password recovery.</li>
              <li>Membership status, cancellation, and billing records.</li>
              <li>Digital product access, download failures, and refund review.</li>
              <li>Accessibility barriers or a request for an alternative format.</li>
            </ul>
          )
        },
        {
          id: "send-safely",
          title: "Send information safely",
          content: (
            <>
              <p>
                Share the email address on your account and a short description
                of the issue when needed.
              </p>
              <p>
                Do not send card numbers, bank credentials, passwords,
                authentication codes, government identifiers, or copies of
                sensitive financial documents. Stripe handles payment details;
                Soji Support does not need them.
              </p>
            </>
          )
        },
        {
          id: "billing",
          title: "Billing and cancellations",
          content: (
            <p>
              Manage an active subscription from Account through the Stripe
              Customer Portal. For a duplicate charge, first-charge mistake, or
              access failure, contact Support with the date and a non-sensitive
              description so the record can be reviewed.
            </p>
          )
        }
      ]}
    />
  );
}
