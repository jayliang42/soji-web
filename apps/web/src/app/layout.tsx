import Link from "next/link";
import type { Metadata, Route } from "next";
import { Suspense } from "react";
import { PublicNavigation } from "@/components/public-navigation";
import { getSiteUrl } from "@/lib/env";
import { getSessionSnapshot } from "@/lib/session";
import "./globals.css";

const siteUrl = getSiteUrl() ?? "http://localhost:3000";
const supportPolicyLinks: ReadonlyArray<readonly [string, Route]> = [
  ["Support", "/support" as Route],
  ["Privacy", "/privacy" as Route],
  ["Terms", "/terms" as Route],
  ["Refund policy", "/refund-policy" as Route],
  ["Financial disclaimer", "/financial-disclaimer" as Route]
] as const;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "GS学院",
  title: {
    default: "BayArea珊瑚海 by GS学院",
    template: "%s | GS学院"
  },
  description:
    "Practical guidance for strategic spending, family financial foundations, and wealth that lasts beyond one generation.",
  openGraph: {
    type: "website",
    siteName: "GS学院",
    title: "BayArea珊瑚海 by GS学院",
    description:
      "Practical guidance for strategic spending, family financial foundations, and lasting wealth.",
    images: [
      {
        alt: "Snowy mountains above a blue bay with a fishing boat and rocky shoreline",
        height: 2240,
        url: "/bayarea-coral-sea-hero.jpg",
        width: 3360
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "BayArea珊瑚海 by GS学院",
    description:
      "Practical guidance for strategic spending, family financial foundations, and lasting wealth.",
    images: ["/bayarea-coral-sea-hero.jpg"]
  }
};

export default async function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const snapshot = await getSessionSnapshot();

  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
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
            <nav aria-label="Office Hours">
              <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-cocoa/62">
                Office Hours
              </h2>
              <Link
                href="/office-hours"
                className="mt-2 inline-flex min-h-11 items-center font-semibold transition-colors hover:text-clay"
              >
                Office Hours
              </Link>
            </nav>
            <nav aria-label="Support and policies">
              <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-cocoa/62">
                Support &amp; policies
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
