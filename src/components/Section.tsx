import type { ReactNode } from "react";

export function Section({
  id,
  eyebrow,
  title,
  intro,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 px-4 sm:px-8 py-16 sm:py-24 max-w-6xl mx-auto w-full">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent mb-3">{eyebrow}</p>
      <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">{title}</h2>
      {intro && <p className="text-muted max-w-2xl mb-10 leading-relaxed">{intro}</p>}
      {children}
    </section>
  );
}
