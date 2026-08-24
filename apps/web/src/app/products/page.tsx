import Link from "next/link";
import type { Metadata } from "next";
import { DataEmpty, DataUnavailable } from "@/components/data-state";
import { ProductCatalog } from "@/components/product-catalog";
import { SectionShell } from "@/components/section-shell";
import { getAccountPurchases } from "@/lib/account-purchases";
import {
  getBillingDeliveryReadiness,
  isBillingDeliveryReady
} from "@/lib/billing-readiness";
import { hasStripeConfig } from "@/lib/env";
import { getProductSnapshot } from "@/lib/products";
import {
  isDeliveredPurchaseStatus,
  isPurchaseDisputeBlockingAccess
} from "@/lib/purchase-status";
import { getSessionSnapshot } from "@/lib/session";

export const metadata: Metadata = {
  title: "产品",
  description:
    "按需购买 GS学院模板和实用工具，无需订阅。",
  alternates: { canonical: "/products" }
};

export default async function ProductsPage({
  searchParams
}: {
  searchParams: Promise<{
    focus?: string;
    product?: string;
    purchase?: string;
    q?: string;
    sort?: string;
  }>;
}) {
  const [snapshot, productSnapshot, params] = await Promise.all([
    getSessionSnapshot(),
    getProductSnapshot(),
    searchParams
  ]);
  const customerEmail = snapshot.user?.email ?? null;
  const membershipEntitled = snapshot.entitlements.includes("product.digital");
  const purchases = await getAccountPurchases(snapshot.user?.id, snapshot.source);
  const purchaseStateAvailable = !snapshot.error && !purchases.error;
  const purchasedProductIds = new Set(
    purchases.items
      .filter((purchase) => isDeliveredPurchaseStatus(purchase.status))
      .map((purchase) => purchase.productId)
  );
  const pausedProductIds = new Set(
    purchases.items
      .filter((purchase) =>
        isPurchaseDisputeBlockingAccess(purchase.disputeStatus)
      )
      .map((purchase) => purchase.productId)
  );
  let checkoutEnabled = false;
  if (customerEmail && purchaseStateAvailable && hasStripeConfig()) {
    checkoutEnabled = isBillingDeliveryReady(
      await getBillingDeliveryReadiness()
    );
  }
  const cancelled = params.purchase === "cancelled";

  return (
    <main>
      <SectionShell
        eyebrow="数字产品"
        headingLevel={1}
        title="按需购买一个实用工具，无需订阅"
        description="单独购买模板或工具包，付款一次即可长期保存在账号中。"
      >
        <div className="mb-8 grid gap-6 border-y border-dune py-6 text-sm leading-6 text-cocoa/72 md:grid-cols-3 md:gap-0">
          <div className="border-t border-dune pt-4 first:border-t-0 first:pt-0 md:border-l md:border-t-0 md:px-6 md:pt-0 md:first:border-l-0 md:first:pl-0">
            <p className="font-bold uppercase tracking-[0.12em] text-cocoa/70">
              适合你，如果
            </p>
            <p className="mt-2 font-medium">
              你现在只需要一个实用工具，或想先了解 Full Access 包含什么。
            </p>
          </div>
          <div className="border-t border-dune pt-4 md:border-l md:border-t-0 md:px-6 md:pt-0">
            <p className="font-bold uppercase tracking-[0.12em] text-cocoa/70">
              使用方式
            </p>
            <p className="mt-2 font-medium">
              已购内容会保存在 GS学院账号中，方便以后下载。
            </p>
          </div>
          <div className="border-t border-dune pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
            <p className="font-bold uppercase tracking-[0.12em] text-cocoa/70">
              付款流程
            </p>
            <p className="mt-2 font-medium">
              登录账号后，可选择 Full Access 或通过 Stripe 单独购买。
            </p>
          </div>
        </div>

        {cancelled ? (
          <div className="mb-6 rounded-lg border border-clay/30 bg-accent-muted px-5 py-4 text-sm text-cocoa">
            产品付款已取消，你的账号没有被扣款。
          </div>
        ) : null}

        {productSnapshot.error ? (
          <div className="mb-6">
            <DataUnavailable
              alternativeHref="/library"
              alternativeLabel="阅读公开指南"
              title="暂时无法加载产品"
              description="产品目录恢复连接前，暂时无法购买。"
              note="目录恢复前不会开始任何付款。"
              retryHref="/products"
              variant="panel"
            />
          </div>
        ) : null}

        {customerEmail && !purchaseStateAvailable && !productSnapshot.error ? (
          <div className="mb-6">
            <DataUnavailable
              title="暂时无法确认购买状态"
              description="在确认账号购买记录前，付款功能已暂停，以免发生重复购买。"
              retryHref="/products"
            />
          </div>
        ) : null}

        {!productSnapshot.error && productSnapshot.items.length === 0 ? (
          <div className="mb-6">
            <DataEmpty
              actionHref="/pricing"
              actionLabel="查看 Full Access"
              title="暂时没有可购买的产品"
              description="单独购买的工具准备好后会显示在这里。"
              variant="panel"
            />
          </div>
        ) : null}

        {!productSnapshot.error && productSnapshot.items.length > 0 ? (
          <ProductCatalog
            checkoutEnabled={checkoutEnabled}
            customerEmail={customerEmail}
            entries={productSnapshot.items.map((product) => ({
              accessPaused: pausedProductIds.has(product.id),
              alreadyPurchased: purchasedProductIds.has(product.id),
              membershipEntitled,
              product
            }))}
            initialFocus={params.focus}
            initialQuery={params.q}
            initialSort={params.sort}
            purchaseStateAvailable={purchaseStateAvailable}
          />
        ) : null}

        <div className="mt-8 border-l-4 border-clay bg-white px-6 py-5 text-sm text-cocoa/75">
          想持续访问全部内容？{" "}
          <Link href="/pricing" className="font-semibold text-clay">
            使用 Full Access 解锁全部产品
          </Link>
          .
        </div>
      </SectionShell>
    </main>
  );
}
