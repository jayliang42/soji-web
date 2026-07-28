import Link from "next/link";
import type { ReactNode } from "react";
import { customerPolicyRoutes } from "@/lib/customer-policy";

export type PolicySection = {
  content: ReactNode;
  id: string;
  title: string;
};

const policyLinks = [
  ["Support", customerPolicyRoutes.support],
  ["Privacy", customerPolicyRoutes.privacy],
  ["Terms", customerPolicyRoutes.terms],
  ["Refund policy", customerPolicyRoutes.refund],
  ["Financial disclaimer", customerPolicyRoutes.disclaimer]
] as const;

export function PolicyLayout({
  eyebrow,
  sections,
  summary,
  title,
  updatedAt
}: {
  eyebrow: string;
  sections: PolicySection[];
  summary: string;
  title: string;
  updatedAt: string;
}) {
  return (
    <main className="px-6 py-12 md:py-20">
      <article className="mx-auto max-w-[70ch]">
        <header className="border-b border-dune pb-10">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-cocoa/62">
            {eyebrow}
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-[1.02] text-cocoa md:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-[65ch] text-lg font-medium leading-8 text-cocoa/76">
            {summary}
          </p>
          <p className="mt-5 text-sm font-semibold text-cocoa/62">
            Updated <time dateTime={updatedAt}>{updatedAt}</time>
          </p>
        </header>

        {sections.length > 2 ? (
          <nav
            aria-label={`${title} contents`}
            className="my-8 rounded-md border border-dune bg-shell p-5"
          >
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-cocoa/62">
              On this page
            </p>
            <ol className="mt-3 grid gap-1.5 text-sm font-semibold text-cocoa/76">
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a
                    className="inline-flex min-h-11 items-center underline decoration-clay/45 underline-offset-4 hover:text-clay"
                    href={`#${section.id}`}
                  >
                    {index + 1}. {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        <div className="text-[1.05rem] leading-[1.75] text-cocoa/84 [&_a]:font-semibold [&_a]:text-clay [&_a]:underline [&_a]:decoration-clay/45 [&_a]:underline-offset-4 [&_li+li]:mt-2 [&_ol]:my-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_p+p]:mt-5 [&_ul]:my-5 [&_ul]:list-disc [&_ul]:pl-6">
          {sections.map((section) => (
            <section
              id={section.id}
              key={section.id}
              className="scroll-mt-28 border-t border-dune py-9 first:border-t-0"
            >
              <h2 className="font-display text-3xl font-bold leading-tight text-cocoa">
                {section.title}
              </h2>
              <div className="mt-4">{section.content}</div>
            </section>
          ))}
        </div>

        <nav
          aria-label="Support and policy pages"
          className="mt-8 border-t border-dune pt-8"
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
      </article>
    </main>
  );
}
