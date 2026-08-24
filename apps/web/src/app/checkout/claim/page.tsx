import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PurchaseClaimStatus } from "@/components/purchase-claim-status";
import { SectionShell } from "@/components/section-shell";
import { purchaseClaimLoginHref } from "@/lib/purchase-claim";
import { getSessionSnapshot } from "@/lib/session";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "领取购买"
};

export default async function CheckoutClaimPage() {
  const snapshot = await getSessionSnapshot();
  if (!snapshot.user || snapshot.source !== "supabase") {
    redirect(purchaseClaimLoginHref);
  }

  return (
    <main>
      <SectionShell
        eyebrow="Purchase access"
        headingLevel={1}
        title="领取你的购买"
        description="我们会通过当前登录账号的邮箱查找待领取购买，不需要输入订单号。"
      >
        <PurchaseClaimStatus />
      </SectionShell>
    </main>
  );
}
