import type { Fact } from "@/data/types";
import { pick, type Lang } from "@/i18n";

export function FactGrid({ facts, lang }: { facts: Fact[]; lang: Lang }) {
  return (
    <dl className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-px bg-line rounded-2xl overflow-hidden border border-line">
      {facts.map((f) => (
        <div key={f.label.en} className="bg-ink-2 p-5 flex flex-col gap-1">
          <dt className="font-mono text-[11px] uppercase tracking-widest text-muted">{pick(f.label, lang)}</dt>
          <dd className="text-xl sm:text-2xl font-semibold tracking-tight text-paper">{f.value}</dd>
          {f.note && <dd className="text-sm text-muted leading-snug">{pick(f.note, lang)}</dd>}
        </div>
      ))}
    </dl>
  );
}
