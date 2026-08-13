import Link from "next/link";
import type { Metadata, Route } from "next";
import {
  customerPolicyRoutes,
  getPublicSupportDestination
} from "@/lib/customer-policy";
import { SupportRequestComposer } from "@/components/support-request-composer";

export const metadata: Metadata = {
  title: "Support",
  description:
    "Get help with a GS学院 account, membership, purchase, download, or accessibility issue.",
  alternates: { canonical: "/support" }
};

const supportPaths: ReadonlyArray<{
  action: string;
  description: string;
  href: Route;
  label: string;
}> = [
  {
    action: "Open sign in & recovery",
    description:
      "Sign in, create an account, or request a new password link from one place.",
    href: "/login?next=/account",
    label: "I cannot access my account"
  },
  {
    action: "Open subscriptions",
    description:
      "Check the membership state recorded on your account and open billing management when available.",
    href: "/account?view=subscriptions",
    label: "I need membership or billing help"
  },
  {
    action: "Open purchases",
    description:
      "Find purchase history, delivery status, and available product downloads.",
    href: "/account?view=purchases",
    label: "I need a purchase or download"
  },
  {
    action: "Review refund steps",
    description:
      "See which membership and digital-product situations GS学院 can review before contacting us.",
    href: "/refund-policy#request",
    label: "I want to request a refund review"
  }
] as const;

const policyLinks: ReadonlyArray<readonly [string, Route]> = [
  ["Support", customerPolicyRoutes.support],
  ["Privacy", customerPolicyRoutes.privacy],
  ["Terms", customerPolicyRoutes.terms],
  ["Refund policy", customerPolicyRoutes.refund],
  ["Financial disclaimer", customerPolicyRoutes.disclaimer]
] as const;

const contactChecklist = [
  "What you were trying to do and what happened instead.",
  "The page name and approximate time of the issue.",
  "The email on your account and the membership or product name, when relevant."
] as const;

export default function SupportPage() {
  const destination = getPublicSupportDestination();

  return (
    <main className="px-6 pb-20 pt-10 md:pb-24 md:pt-16">
      <div className="mx-auto max-w-6xl">
        <header className="grid gap-6 border-b border-dune pb-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-cocoa/62">
              Customer care
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.02] text-cocoa md:text-6xl">
              Support
            </h1>
          </div>
          <div>
            <p className="max-w-2xl text-lg font-medium leading-8 text-cocoa/76">
              Start with the task closest to yours. If the account path does
              not resolve it, send Support the details needed to investigate.
            </p>
            <p className="mt-4 text-sm font-semibold text-cocoa/62">
              Updated <time dateTime="2026-07-30">July 30, 2026</time>
            </p>
          </div>
        </header>

        <section
          aria-labelledby="support-paths-heading"
          className="py-10 md:py-14"
        >
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-cocoa/62">
              Start here
            </p>
            <h2
              className="mt-3 font-display text-3xl font-bold leading-tight text-cocoa md:text-5xl"
              id="support-paths-heading"
            >
              Choose the closest help path.
            </h2>
            <p className="mt-4 text-base font-medium leading-7 text-cocoa/72">
              These links take you to the current source of truth for account,
              billing, delivery, or refund status.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {supportPaths.map((path, index) => (
              <Link
                className="group flex min-h-48 flex-col rounded-xl border border-dune bg-shell p-6 transition-all hover:-translate-y-0.5 hover:border-cocoa/40 hover:bg-white hover:shadow-lg motion-reduce:transform-none sm:p-7"
                href={path.href}
                key={path.href}
              >
                <span className="text-xs font-bold text-clay">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 font-display text-2xl font-semibold leading-tight text-cocoa">
                  {path.label}
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-6 text-cocoa/70">
                  {path.description}
                </p>
                <span className="mt-auto inline-flex min-h-11 items-end pt-5 text-sm font-bold text-clay underline decoration-clay/30 underline-offset-4 group-hover:decoration-clay">
                  {path.action}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="contact-support-heading"
          className="grid overflow-hidden rounded-xl border border-dune bg-cream lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)]"
        >
          <div className="bg-cocoa px-6 py-8 text-white sm:px-8 sm:py-10">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/58">
              Still need help?
            </p>
            <h2
              className="mt-3 font-display text-3xl font-semibold leading-tight md:text-4xl"
              id="contact-support-heading"
            >
              Send one clear support request.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/72">
              Use the published channel when the self-service path does not
              explain or resolve your issue.
            </p>
            {destination.ok ? (
              <p className="mt-7 inline-flex min-h-11 items-center rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-bold text-white/88">
                Support channel ready
              </p>
            ) : (
              <div
                className="mt-7 border-l-4 border-clay bg-white/10 px-5 py-4 text-sm leading-6 text-white/82"
                role="status"
              >
                The durable support channel is being configured. Please return
                before purchasing; Checkout remains unavailable until it is
                real.
              </div>
            )}
          </div>

          <div className="px-6 py-8 sm:px-8 sm:py-10">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-cocoa/62">
              Include these details
            </p>
            <ol className="mt-5 grid gap-4">
              {contactChecklist.map((item, index) => (
                <li className="flex gap-4" key={item}>
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-accent-muted text-xs font-bold text-clay">
                    {index + 1}
                  </span>
                  <span className="pt-0.5 text-sm font-medium leading-6 text-cocoa/76">
                    {item}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-6 border-t border-dune pt-5 text-sm leading-6 text-cocoa/68">
              Never include full card numbers, passwords, authentication codes,
              or sensitive financial documents.
            </p>
          </div>

          <div className="lg:col-span-2">
            <SupportRequestComposer
              destination={destination.ok ? destination.value : null}
            />
          </div>
        </section>

        <section
          aria-labelledby="more-help-heading"
          className="grid gap-6 border-b border-dune py-10 md:grid-cols-2 md:py-14"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-cocoa/62">
              Other questions
            </p>
            <h2
              className="mt-3 font-display text-3xl font-bold leading-tight text-cocoa"
              id="more-help-heading"
            >
              Reading and Office Hours
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-cocoa/72">
              Browse public guides if you are looking for content, or review
              Office Hours to understand session and replay access.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end md:justify-center">
            <Link
              className="inline-flex min-h-11 items-center text-sm font-bold text-clay underline decoration-clay/35 underline-offset-4 hover:decoration-clay"
              href="/library"
            >
              Browse public guides
            </Link>
            <Link
              className="inline-flex min-h-11 items-center text-sm font-bold text-clay underline decoration-clay/35 underline-offset-4 hover:decoration-clay"
              href="/office-hours"
            >
              Review Office Hours
            </Link>
          </div>
        </section>

        <nav
          aria-label="Support and policy pages"
          className="pt-8"
        >
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-cocoa/62">
            Support &amp; policies
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold text-cocoa/76">
            {policyLinks.map(([label, href]) => (
              <li key={href}>
                <Link
                  className="inline-flex min-h-11 items-center underline decoration-clay/45 underline-offset-4 hover:text-clay"
                  href={href}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  );
}
