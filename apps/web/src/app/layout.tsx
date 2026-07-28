import Link from "next/link";
import type { Metadata, Route } from "next";
import { PublicNavigation } from "@/components/public-navigation";
import { getSiteUrl } from "@/lib/env";
import { getSessionSnapshot } from "@/lib/session";
import "./globals.css";

const siteUrl = getSiteUrl() ?? "http://localhost:3000";
const exploreLinks: ReadonlyArray<readonly [string, Route]> = [
  ["Library", "/library"],
  ["Membership", "/pricing"],
  ["Shop", "/products"],
  ["Office Hours", "/office-hours"],
  ["Account", "/account"]
] as const;
const supportPolicyLinks: ReadonlyArray<readonly [string, Route]> = [
  ["Support", "/support" as Route],
  ["Privacy", "/privacy" as Route],
  ["Terms", "/terms" as Route],
  ["Refund policy", "/refund-policy" as Route],
  ["Financial disclaimer", "/financial-disclaimer" as Route]
] as const;

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
        <footer className="border-t border-dune bg-shell px-6 py-12 md:py-16">
          <div className="mx-auto grid max-w-6xl gap-6 text-sm text-cocoa/70 sm:grid-cols-2 md:grid-cols-[1.5fr_0.75fr_1fr] md:gap-10">
            <div className="sm:col-span-2 md:col-span-1">
              <Link
                href="/"
                className="inline-flex min-h-11 items-center text-xl font-black text-cocoa"
              >
                Soji
              </Link>
              <p className="mt-2 max-w-sm font-medium leading-6">
                Well Endowed is an editorial money membership for calmer,
                better-informed decisions.
              </p>
            </div>
            <nav aria-label="Explore">
              <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-cocoa/62">
                Explore
              </h2>
              <ul className="mt-2 grid font-semibold">
                {exploreLinks.map(([label, href]) => (
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
