import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentSourceBadge } from "@/components/content-source-badge";
import { DataUnavailable } from "@/components/data-state";
import { ProductArtwork } from "@/components/product-artwork";
import { ProductCheckoutButton } from "@/components/product-checkout-button";
import { PurchaseDisclosure } from "@/components/purchase-disclosure";
import { ShareButton } from "@/components/share-button";
import { getAccountPurchases } from "@/lib/account-purchases";
import {
  getBillingDeliveryReadiness,
  isBillingDeliveryReady
} from "@/lib/billing-readiness";
import { hasStripeConfig } from "@/lib/env";
import { hasProductAccess } from "@/lib/product-access";
import { getProductBySlug } from "@/lib/products";
import {
  isDeliveredPurchaseStatus,
  isPurchaseDisputeBlockingAccess
} from "@/lib/purchase-status";
import { getSessionSnapshot } from "@/lib/session";

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { item } = await getProductBySlug(slug);

  if (!item) {
    return { title: "产品" };
  }

  return {
    alternates: { canonical: `/products/${item.slug}` },
    description: item.summary,
    openGraph: {
      description: item.summary,
      title: item.title
    },
    title: item.title
  };
}

export default async function ProductDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [productResult, session] = await Promise.all([
    getProductBySlug(slug),
    getSessionSnapshot()
  ]);

  if (productResult.error) {
    return (
      <main>
        <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Link
            className="inline-flex min-h-11 items-center text-sm font-bold text-clay underline decoration-clay/35 underline-offset-4 hover:decoration-clay"
            href="/products"
          >
            返回产品列表
          </Link>
          <div className="mt-8 max-w-2xl">
            <DataUnavailable
              description="产品目录恢复连接前，暂不显示产品详情或购买操作。"
              retryHref={`/products/${slug}`}
              title="暂时无法加载此产品"
            />
          </div>
        </section>
      </main>
    );
  }

  const product = productResult.item;
  if (!product) {
    notFound();
  }

  const purchases = await getAccountPurchases(
    session.user?.id,
    session.source
  );
  const purchaseStateAvailable = !session.error && !purchases.error;
  const matchingPurchases = purchases.items.filter(
    (purchase) => purchase.productId === product.id
  );
  const alreadyPurchased = matchingPurchases.some((purchase) =>
    isDeliveredPurchaseStatus(purchase.status)
  );
  const accessPaused = matchingPurchases.some((purchase) =>
    isPurchaseDisputeBlockingAccess(purchase.disputeStatus)
  );
  const customerEmail = session.user?.email ?? null;
  const membershipEntitled = hasProductAccess(
    session.entitlements,
    product.entitlement
  );
  let checkoutEnabled = false;

  if (
    customerEmail &&
    purchaseStateAvailable &&
    !alreadyPurchased &&
    !membershipEntitled &&
    hasStripeConfig()
  ) {
    checkoutEnabled = isBillingDeliveryReady(
      await getBillingDeliveryReadiness()
    );
  }

  return (
    <main>
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-8 md:pb-24 md:pt-10">
        <Link
          className="inline-flex min-h-11 items-center text-sm font-bold text-clay underline decoration-clay/35 underline-offset-4 hover:decoration-clay"
          href="/products"
        >
          返回产品列表
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.02fr)_minmax(22rem,0.98fr)] lg:items-stretch">
          <header className="flex flex-col justify-center py-2 lg:py-8">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-clay">
              单次购买数字工具
            </p>
            <h1 className="mt-5 max-w-4xl font-display text-5xl font-bold leading-[0.98] text-cocoa md:text-7xl">
              {product.title}
            </h1>
            <p className="mt-6 max-w-3xl text-xl font-semibold leading-8 text-cocoa/72">
              {product.summary}
            </p>
            <div className="mt-7 flex flex-wrap gap-2 text-sm font-bold text-cocoa/70">
              <span className="rounded-full bg-accent-muted px-4 py-2 text-clay">
                一次支付 {product.priceLabel}
              </span>
              <span className="rounded-full bg-cream px-4 py-2">
                数字下载
              </span>
              <span className="rounded-full bg-cream px-4 py-2">
                无需订阅
              </span>
            </div>
            {productResult.source === "demo" ? (
              <div className="mt-5">
                <ContentSourceBadge source={productResult.source} />
              </div>
            ) : null}
          </header>

          <ProductArtwork
            className="min-h-[28rem] rounded-xl border border-dune lg:h-full"
            product={product}
            titleAs="text"
          />
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)] lg:items-start">
          <div className="space-y-10">
            <section
              aria-labelledby="product-includes-heading"
              className="rounded-xl border border-dune bg-shell p-6 sm:p-8"
            >
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-clay">
                工具内容
              </p>
              <h2
                className="mt-3 font-display text-3xl font-semibold leading-tight text-cocoa md:text-4xl"
                id="product-includes-heading"
              >
                帮你把这些方法真正用起来
              </h2>
              <ul className="mt-7 grid gap-4 sm:grid-cols-2">
                {product.bullets.map((bullet, index) => (
                  <li
                    className="flex min-h-28 gap-4 rounded-lg border border-dune bg-white p-5"
                    key={bullet}
                  >
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-accent-muted text-xs font-bold text-clay">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="pt-1 text-sm font-semibold leading-6 text-cocoa/78">
                      {bullet}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="product-delivery-heading">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-clay">
                交付流程
              </p>
              <h2
                className="mt-3 font-display text-3xl font-semibold leading-tight text-cocoa"
                id="product-delivery-heading"
              >
                三步完成购买并下载
              </h2>
              <ol className="mt-6 grid gap-px overflow-hidden rounded-xl border border-dune bg-dune md:grid-cols-3">
                {[
                  {
                    description:
                      "使用 GS学院账号，让购买记录和下载权限长期保留。",
                    label: "登录账号"
                  },
                  {
                    description:
                      "通过安全的 Stripe Checkout 完成一次性付款。",
                    label: "一次付款"
                  },
                  {
                    description:
                      "以后需要时可随时回到账号中心下载。",
                    label: "持续访问"
                  }
                ].map((step, index) => (
                  <li className="bg-cream p-5 sm:p-6" key={step.label}>
                    <span className="text-xs font-bold text-clay">
                      0{index + 1}
                    </span>
                    <h3 className="mt-3 font-display text-xl font-semibold text-cocoa">
                      {step.label}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-cocoa/70">
                      {step.description}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <aside
            aria-labelledby="product-purchase-heading"
            className="rounded-xl border border-dune bg-white p-6 shadow-[0_18px_50px_rgba(32,31,28,0.07)] sm:p-8 lg:sticky lg:top-28"
          >
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-cocoa/70">
              {membershipEntitled ? "Full Access 已包含" : "单次购买"}
            </p>
            <h2
              className="mt-3 font-display text-4xl font-semibold text-cocoa"
              id="product-purchase-heading"
            >
              {membershipEntitled ? "已包含" : product.priceLabel}
            </h2>
            <p className="mt-3 text-sm font-medium leading-6 text-cocoa/70">
              {membershipEntitled
                ? "Full Access 会员已包含此内容，可随时下载。"
                : "没有自动续费，购买后可在 GS学院账号中访问下载。"}
            </p>
            <div className="mt-6">
              <ProductCheckoutButton
                accessPaused={accessPaused}
                alreadyPurchased={alreadyPurchased}
                checkoutEnabled={checkoutEnabled}
                customerEmail={customerEmail}
                membershipEntitled={membershipEntitled}
                nextPath={`/products/${product.slug}`}
                productId={product.id}
                productSlug={product.slug}
                purchaseStateAvailable={purchaseStateAvailable}
              />
            </div>
            {!membershipEntitled ? <PurchaseDisclosure variant="product" /> : null}
            <div className="mt-5 border-t border-dune pt-5">
              <ShareButton label="分享工具" title={product.title} />
            </div>
          </aside>
        </div>

        <aside className="mt-12 flex flex-col gap-5 border-y border-dune py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-2xl font-semibold text-cocoa">
              想获得持续更新和支持？
            </p>
            <p className="mt-2 text-sm leading-6 text-cocoa/70">
              如果完整内容库和持续支持更适合你，可以查看 Full Access 方案。
            </p>
          </div>
          <Link
            className="inline-flex min-h-11 flex-none items-center text-sm font-bold text-clay underline decoration-clay/35 underline-offset-4 hover:decoration-clay"
            href="/pricing"
          >
            查看 Full Access
          </Link>
        </aside>
      </section>
    </main>
  );
}
