import Link from "next/link";
import type { Metadata, Route } from "next";
import { Suspense } from "react";
import { CheckoutReturnCleanup } from "@/components/checkout-return-cleanup";
import { PublicNavigation } from "@/components/public-navigation";
import { getSiteUrl } from "@/lib/env";
import { getSessionSnapshot } from "@/lib/session";
import "./globals.css";

const siteUrl = getSiteUrl() ?? "http://localhost:3000";
const supportPolicyLinks: ReadonlyArray<readonly [string, Route]> = [
  ["支持中心", "/support" as Route],
  ["隐私政策", "/privacy" as Route],
  ["使用条款", "/terms" as Route],
  ["退款政策", "/refund-policy" as Route],
  ["财务信息免责声明", "/financial-disclaimer" as Route]
] as const;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "GS学院",
  title: {
    default: "GS学院 · BayArea珊瑚海",
    template: "%s | GS学院"
  },
  description:
    "通过真实案例、申请定位和文书思路，帮助你把复杂经历讲清楚。",
  openGraph: {
    type: "website",
    siteName: "GS学院",
    title: "GS学院 · BayArea珊瑚海",
    description:
      "通过真实案例、申请定位和文书思路，帮助你把复杂经历讲清楚。",
    images: [
      {
        alt: "蓝色海湾上方的雪山、渔船与岩石海岸",
        height: 2240,
        url: "/bayarea-coral-sea-hero.jpg",
        width: 3360
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "GS学院 · BayArea珊瑚海",
    description:
      "通过真实案例、申请定位和文书思路，帮助你把复杂经历讲清楚。",
    images: ["/bayarea-coral-sea-hero.jpg"]
  }
};

export default async function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const snapshot = await getSessionSnapshot();

  return (
    <html lang="zh-CN">
      <body>
        <CheckoutReturnCleanup />
        <a href="#main-content" className="skip-link">
          跳到主要内容
        </a>
        <header className="sticky top-0 z-20 border-b border-dune/70 bg-shell shadow-[0_1px_12px_rgba(32,31,28,0.035)]">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5 md:py-4">
            <Link
              href="/"
              className="group inline-flex min-h-11 items-center gap-3 text-darktext"
            >
              <span className="text-2xl font-black">GS学院</span>
              <span
                aria-hidden="true"
                className="hidden border-l border-dune pl-3 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-cocoa/68 transition-colors group-hover:text-clay lg:block"
              >
                BayArea珊瑚海
              </span>
            </Link>
            <Suspense
              fallback={
                <div
                  aria-hidden="true"
                  className="h-11 w-20 rounded-full border border-dune bg-white"
                />
              }
            >
              <PublicNavigation signedIn={Boolean(snapshot.user)} />
            </Suspense>
          </div>
        </header>
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
        <footer className="border-t border-dune bg-shell px-6 py-12 md:py-16">
          <div className="mx-auto grid max-w-6xl gap-10 text-sm text-cocoa/70 md:grid-cols-[0.75fr_1.25fr] md:gap-16">
            <nav aria-label="线上答疑">
              <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-cocoa/62">
                线上答疑
              </h2>
              <Link
                href="/office-hours"
                className="mt-2 inline-flex min-h-11 items-center font-semibold transition-colors hover:text-clay"
              >
                查看线上答疑
              </Link>
            </nav>
            <nav aria-label="支持与政策">
              <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-cocoa/62">
                支持与政策
              </h2>
              <ul className="mt-2 grid font-semibold">
                {supportPolicyLinks.map(([label, href]) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="inline-flex min-h-11 items-center transition-colors hover:text-clay"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
