import type { Metadata } from "next";
import { PolicyLayout } from "@/components/policy-layout";

export const metadata: Metadata = {
  title: "Financial disclaimer",
  description:
    "The educational scope and financial-decision limits of Soji content and Office Hours.",
  alternates: { canonical: "/financial-disclaimer" }
};

export default function FinancialDisclaimerPage() {
  return (
    <PolicyLayout
      eyebrow="Editorial standards"
      title="Financial disclaimer"
      summary="Soji helps readers think more clearly about money decisions. It does not make those decisions for them."
      updatedAt="July 27, 2026"
      sections={[
        {
          id: "education",
          title: "General education only",
          content: (
            <p>
              Articles, templates, examples, products, and Office Hours are
              general educational publishing. They are not individualized
              investment, legal, tax, accounting, insurance, or credit advice
              and do not create a professional-client relationship.
            </p>
          )
        },
        {
          id: "decisions",
          title: "Your decisions remain your own",
          content: (
            <p>
              Financial rules, markets, products, and personal circumstances
              change. Verify important facts and consider an appropriately
              qualified professional who can evaluate your goals, risks,
              jurisdiction, and complete financial situation before acting.
            </p>
          )
        },
        {
          id: "outcomes",
          title: "No promised outcome",
          content: (
            <p>
              Examples and historical observations are illustrative. They do
              not predict future results. Every financial choice involves
              tradeoffs and may involve loss, tax consequences, fees, or other
              risks that a general publication cannot fully evaluate for you.
            </p>
          )
        },
        {
          id: "questions",
          title: "Questions and corrections",
          content: (
            <p>
              Use Support to report an accessibility issue, factual correction,
              account problem, or billing concern. Do not send confidential
              financial records or ask Support to choose an investment or legal
              strategy for you.
            </p>
          )
        }
      ]}
    />
  );
}
