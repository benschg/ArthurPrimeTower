import Image from "next/image";
import { useMemo } from "react";
import { tenantAssetBySlug } from "@/data/tenantAssets";
import { isPast, tenantProfiles, type TenantProfile } from "@/data/tenantProfiles";
import { pick, type Lang } from "@/i18n";
import { txt } from "./text";

const TOP_FLOOR = 35;

/** The tower's floors as a stack with the icons of their companies; a floor filters the list. */
export function FloorStack({ lang, floor, setFloor, onOpen }: { lang: Lang; floor: number | null; setFloor: (f: number | null) => void; onOpen: (slug: string) => void }) {
  const byFloor = useMemo(() => {
    const m = new Map<number, TenantProfile[]>();
    for (const p of tenantProfiles) {
      if (p.building !== "Prime Tower" || isPast(p)) continue;
      for (const f of p.floors ?? []) m.set(f, [...(m.get(f) ?? []), p]);
    }
    return m;
  }, []);
  const floors = Array.from({ length: TOP_FLOOR + 1 }, (_, i) => TOP_FLOOR - i);

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-16">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent mb-1">{pick(txt.stack, lang)}</p>
        <p className="text-[11px] text-muted mb-3 leading-snug">{pick(txt.stackHint, lang)}</p>
        <ol className="space-y-[2px]" aria-label={pick(txt.stack, lang)}>
          {floors.map((f) => {
            const here = byFloor.get(f) ?? [];
            const active = floor === f;
            return (
              <li key={f}>
                <div
                  className={
                    "flex items-center gap-1.5 h-[15px] rounded-[3px] pl-1.5 pr-1 text-[9px] font-mono transition-colors " +
                    (active ? "bg-accent/30 ring-1 ring-accent" : here.length ? "bg-accent-2/25 hover:bg-accent-2/40" : "bg-ink-3/70")
                  }
                >
                  <button
                    type="button"
                    disabled={!here.length}
                    onClick={() => setFloor(active ? null : f)}
                    className="w-6 text-left text-muted enabled:hover:text-paper disabled:cursor-default"
                    aria-label={`${pick(txt.floor, lang)} ${f}`}
                  >
                    {f === 0 ? pick(txt.ground, lang) : f}
                  </button>
                  <span className="flex gap-1 overflow-hidden">
                    {here.map((p) => {
                      const a = tenantAssetBySlug[p.slug];
                      return (
                        <button key={p.slug} type="button" onClick={() => onOpen(p.slug)} title={p.name} className="shrink-0">
                          {a && <Image src={`/tenants/${a.icon}`} alt={p.name} width={12} height={12} className="rounded-[2px] bg-white" style={{ width: 12, height: 12 }} />}
                        </button>
                      );
                    })}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
        {floor !== null && (
          <button onClick={() => setFloor(null)} className="mt-3 font-mono text-[11px] uppercase tracking-widest text-accent hover:text-paper">
            {pick(txt.clearFloor, lang)}
          </button>
        )}
      </div>
    </aside>
  );
}
