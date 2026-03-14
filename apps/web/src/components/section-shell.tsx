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
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="rounded-3xl bg-white/10 backdrop-blur-sm border border-darktext/20 p-10 mb-14">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-widest text-darktext/80">{eyebrow}</p>
          <h2 className="mt-6 font-display text-5xl leading-[0.95] text-darktext font-bold">{title}</h2>
          <p className="mt-6 max-w-2xl text-xl leading-relaxed text-darktext font-semibold">{description}</p>
        </div>
      </div>
      <div>{children}</div>
    </section>
  );
}
