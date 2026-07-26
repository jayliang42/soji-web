import type { PropsWithChildren } from "react";

export function SectionShell({
  children,
  eyebrow,
  headingLevel = 2,
  title,
  description
}: PropsWithChildren<{
  eyebrow: string;
  headingLevel?: 1 | 2;
  title: string;
  description: string;
}>) {
  const Heading = headingLevel === 1 ? "h1" : "h2";

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="mb-12 max-w-3xl">
        <p className="text-xs font-bold uppercase text-cocoa/62">{eyebrow}</p>
        <Heading className="mt-5 font-display text-4xl font-bold leading-[1.02] text-cocoa md:text-5xl">{title}</Heading>
        <p className="mt-5 max-w-2xl text-xl font-semibold leading-relaxed text-cocoa/72">{description}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}
