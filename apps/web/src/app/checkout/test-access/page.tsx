import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckoutTestAccessForm } from "@/components/checkout-test-access-form";
import { isRestrictedCheckoutTestRuntime } from "@/lib/checkout-test-access";
import { env } from "@/lib/env";
import { SectionShell } from "@/components/section-shell";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Checkout test access"
};

export default function CheckoutTestAccessPage() {
  if (
    !isRestrictedCheckoutTestRuntime({
      nodeEnv: process.env.NODE_ENV,
      stripeSecretKey: env.STRIPE_SECRET_KEY
    })
  ) {
    notFound();
  }

  return (
    <main>
      <SectionShell
        description="登记获准的测试浏览器。此页面只在 Production Stripe Test mode 期间可用。"
        eyebrow="Stripe test mode"
        headingLevel={1}
        title="Checkout 测试访问"
      >
        <CheckoutTestAccessForm />
      </SectionShell>
    </main>
  );
}
