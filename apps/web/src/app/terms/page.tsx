import Link from "next/link";
import type { Metadata } from "next";
import { PolicyLayout } from "@/components/policy-layout";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "Terms for using GS学院 educational content, memberships, Office Hours, and digital products.",
  alternates: { canonical: "/terms" }
};

export default function TermsPage() {
  return (
    <PolicyLayout
      eyebrow="Customer policy"
      title="Terms"
      summary="These review-draft terms describe the current GS学院 educational publishing service and the responsibilities that come with an account."
      updatedAt="July 27, 2026"
      sections={[
        {
          id: "service",
          title: "The service",
          content: (
            <p>
              GS学院 publishes general educational material about money
              decisions. An account may provide public reading, personal
              non-transferable membership access, Office Hours eligibility, or
              delivery of a purchased digital product. Features and publishing
              schedules may evolve.
            </p>
          )
        },
        {
          id: "account",
          title: "Your account",
          content: (
            <p>
              Keep account credentials secure and provide accurate information.
              Access belongs to the account holder and may not be shared,
              resold, scraped, or used to bypass an access boundary. You are
              responsible for activity performed through your account unless
              you promptly report unauthorized access.
            </p>
          )
        },
        {
          id: "billing",
          title: "Membership billing and cancellation",
          content: (
            <>
              <p>
                Full Access is a one-time $99 purchase. It does not renew
                automatically, and access remains attached to the account that
                completed the purchase, subject to the published refund policy.
              </p>
              <p>
                A failed payment, full refund, or unresolved payment dispute may
                pause or end access. See the{" "}
                <Link href="/refund-policy">Refund policy</Link> for the current
                review rules.
              </p>
            </>
          )
        },
        {
          id: "acceptable-use",
          title: "Acceptable use and intellectual property",
          content: (
            <p>
              GS学院 content, design, downloads, and original materials remain
              protected by applicable intellectual-property rights. You may use
              purchased or member material personally, but may not republish,
              sell, distribute, automate extraction from, interfere with, or
              misuse the service.
            </p>
          )
        },
        {
          id: "education",
          title: "Education, not individualized advice",
          content: (
            <p>
              GS学院 provides general education and is not individualized
              investment, legal, tax, or accounting advice. Content and Office
              Hours do not account for every person&apos;s circumstances and do
              not promise a financial outcome. Consider qualified professionals
              when a decision requires advice specific to you.
            </p>
          )
        },
        {
          id: "availability",
          title: "Availability and changes",
          content: (
            <p>
              The service may be updated, corrected, suspended for security or
              maintenance, or changed as the publication develops. Material
              changes to these terms should be posted with a new updated date.
              Use of the service remains subject to rights that cannot lawfully
              be excluded.
            </p>
          )
        }
      ]}
    />
  );
}
