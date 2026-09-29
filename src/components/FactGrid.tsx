import type { Fact } from "@/data/types";

export function FactGrid({ facts }: { facts: Fact[] }) {
  return (
    <dl className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-px bg-line rounded-2xl overflow-hidden border border-line">
      {facts.map((f) => (
        <div key={f.label} className="bg-ink-2 p-5 flex flex-col gap-1">
          <dt className="font-mono text-[11px] uppercase tracking-widest text-muted">{f.label}</dt>
          <dd className="text-xl sm:text-2xl font-semibold tracking-tight text-paper">{f.value}</dd>
          {f.note && <dd className="text-sm text-muted leading-snug">{f.note}</dd>}
        </div>
      ))}
    </dl>
  );
}
