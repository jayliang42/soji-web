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
    <section className="mx-auto max-w-6xl px-6 py-10">
      <div className="max-w-2xl">
        <p className="text-sm uppercase tracking-[0.35em] text-clay">{eyebrow}</p>
        <h2 className="mt-4 font-display text-4xl text-cocoa">{title}</h2>
        <p className="mt-4 text-lg text-cocoa/75">{description}</p>
      </div>
      <div className="mt-8">{children}</div>
    </section>
  );
}
