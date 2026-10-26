import Image from "next/image";
import type { TenantAsset } from "@/data/tenantAssets";
import { categoryLabel, isPast, statusClass, statusLabel, type TenantProfile } from "@/data/tenantProfiles";
import { pick, type Lang } from "@/i18n";
import { TenantIcon } from "./parts";
import { txt } from "./text";

/** A company in the grid: its picture, icon, status, category, summary and floors; opens the detail drawer. */
export function TenantCard({ profile: p, asset, lang, onOpen }: { profile: TenantProfile; asset?: TenantAsset; lang: Lang; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={
        "group w-full h-full text-left rounded-2xl border border-line bg-ink-2 overflow-hidden hover:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent transition-colors flex flex-col " +
        (isPast(p) ? "opacity-70 hover:opacity-100" : "")
      }
    >
      <div className="relative aspect-[16/9] bg-ink-3 overflow-hidden">
        {asset?.feature && (
          <Image
            src={`/tenants/${asset.feature}`}
            alt=""
            fill
            sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-2 via-ink-2/10 to-transparent" />
        <TenantIcon asset={asset} name={p.name} size={44} className="absolute left-4 bottom-3" />
        <span className={"absolute right-3 top-3 rounded-full bg-ink/80 backdrop-blur px-2 py-0.5 text-[10px] font-mono"}><span className={"rounded-full px-1.5 " + statusClass[p.status]}>{pick(statusLabel[p.status], lang)}</span></span>
      </div>
      <div className="p-4 pt-3 flex-1 flex flex-col">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {pick(categoryLabel[p.category], lang)} · {p.building}
        </p>
        <h3 className="mt-1 font-semibold leading-snug group-hover:text-accent">{p.name}</h3>
        <p className="mt-2 text-sm text-muted leading-relaxed line-clamp-3">{pick(p.summary, lang)}</p>
        {(p.floorsLabel || p.since) && (
          <p className="mt-auto pt-3 font-mono text-[11px] text-paper/80">
            {p.floorsLabel && pick(p.floorsLabel, lang)}
            {p.floorsLabel && p.since && " · "}
            {p.since && (
              <>
                {pick(txt.since, lang)} {p.since}
              </>
            )}
          </p>
        )}
      </div>
    </button>
  );
}
