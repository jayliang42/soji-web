import Link from "next/link";
import type { Metadata } from "next";
import { PolicyLayout } from "@/components/policy-layout";

export const metadata: Metadata = {
  title: "Refund policy",
  description:
    "How Soji reviews membership and digital-product refund requests and how refunds affect access.",
  alternates: { canonical: "/refund-policy" }
};

export default function RefundPolicyPage() {
  return (
    <PolicyLayout
      eyebrow="Customer policy"
      title="Refund policy"
      summary="This review draft explains the baseline used by Soji's current billing and access system. Rights required by applicable law still apply."
      updatedAt="July 27, 2026"
      sections={[
        {
          id: "memberships",
          title: "Membership charges",
          content: (
            <p>
              Membership charges are generally non-refundable after billing.
              Contact <Link href="/support">Support</Link> promptly if you see a
              duplicate charge, a technical failure that prevented access, or a
              mistake involving a first charge. The facts can be reviewed, and
              any refund required by applicable law will be honored.
            </p>
          )
        },
        {
          id: "products",
          title: "Digital products",
          content: (
            <p>
              Digital products are generally final after account access or
              download becomes available. A duplicate purchase, inaccessible
              delivery, materially defective file, or refund required by
              applicable law may be reviewed through Support.
            </p>
          )
        },
        {
          id: "access",
          title: "How a refund changes access",
          content: (
            <>
              <p>
                A full refund revokes the access associated with that membership
                charge or product purchase. A partial refund does not, by
                itself, restore or revoke access; the underlying paid period or
                purchase state remains authoritative.
              </p>
              <p>
                An open payment dispute pauses the affected delivery while it is
                reviewed. A lost dispute keeps access ended. A resolved dispute
                restores access only when the underlying subscription or
                purchase is otherwise eligible and has not been fully refunded.
              </p>
            </>
          )
        },
        {
          id: "request",
          title: "Request a review",
          content: (
            <p>
              Use <Link href="/support">Support</Link> and include the account
              email, transaction date, item or membership name, and a short
              description. Never send a full card number, password, or
              authentication code.
            </p>
          )
        }
      ]}
    />
  );
}
