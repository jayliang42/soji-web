import type { PropsWithChildren } from "react";

export function SectionShell({
  children,
  eyebrow,
  title,
  description
}: PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
}>) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="max-w-3xl">
        <p className="text-[0.72rem] uppercase tracking-[0.32em] text-cocoa/55">{eyebrow}</p>
        <h2 className="mt-4 font-display text-5xl leading-[0.95] text-cocoa">{title}</h2>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-cocoa/72">{description}</p>
      </div>
      <div className="mt-10">{children}</div>
    </section>
  );
}
