import type { Metadata } from "next";
import { GuestCheckoutCancellation } from "@/components/guest-checkout-cancellation";
import { SectionShell } from "@/components/section-shell";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "取消付款"
};

export default async function GuestCheckoutCancelPage({
  searchParams
}: {
  searchParams: Promise<{ request_id?: string }>;
}) {
  const requestId = (await searchParams).request_id ?? null;
  return (
    <main>
      <SectionShell
        eyebrow="支付已取消"
        headingLevel={1}
        title="正在关闭未完成付款"
        description="我们会让这次 Stripe Checkout 失效，并清除待付款记录。"
      >
        <GuestCheckoutCancellation requestId={requestId} />
      </SectionShell>
    </main>
  );
}
