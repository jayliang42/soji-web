import Link from "next/link";
import type { Metadata } from "next";
import { PublicNavigation } from "@/components/public-navigation";
import { getSiteUrl } from "@/lib/env";
import { getSessionSnapshot } from "@/lib/session";
import "./globals.css";

const siteUrl = getSiteUrl() ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Soji",
  title: {
    default: "Well Endowed by Soji",
    template: "%s | Soji"
  },
  description:
    "Practical guidance for strategic spending, family financial foundations, and wealth that lasts beyond one generation.",
  openGraph: {
    type: "website",
    siteName: "Soji",
    title: "Well Endowed by Soji",
    description:
      "Practical guidance for strategic spending, family financial foundations, and lasting wealth.",
    images: [
      {
        alt: "Well Endowed hardcover book in a bright reading room",
        height: 941,
        url: "/well-endowed-hero.png",
        width: 1672
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Well Endowed by Soji",
    description:
      "Practical guidance for strategic spending, family financial foundations, and lasting wealth.",
    images: ["/well-endowed-hero.png"]
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
        <header className="sticky top-0 z-20 border-b border-dune/70 bg-shell">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
            <Link href="/" className="text-2xl font-black text-darktext">
              Soji
            </Link>
            <PublicNavigation signedIn={Boolean(snapshot.user)} />
          </div>
        </header>
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
        <footer className="border-t border-dune bg-shell px-6 py-12">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-5 text-sm text-cocoa/70 md:flex-row md:items-center">
            <p className="font-semibold">
              Soji presents Well Endowed, an editorial money membership with public previews and paid depth.
            </p>
            <div className="flex gap-6 font-semibold">
              <Link
                href={
                  snapshot.user
                    ? "/account?view=subscriptions"
                    : "/pricing"
                }
                className="hover:text-cocoa transition-colors"
              >
                {snapshot.user ? "Subscriptions" : "Join"}
              </Link>
              <Link href="/products" className="hover:text-cocoa transition-colors">Shop</Link>
              <Link href="/office-hours" className="hover:text-cocoa transition-colors">Office hours</Link>
              <Link href="/library" className="hover:text-cocoa transition-colors">Preview</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
