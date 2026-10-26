import Image from "next/image";
import { useCallback } from "react";
import type { TenantAsset } from "@/data/tenantAssets";
import { categoryLabel, statusClass, statusLabel, type TenantProfile } from "@/data/tenantProfiles";
import { pick, type Lang } from "@/i18n";
import { useDialogKeys } from "@/lib/useDialogKeys";
import { Fact, TenantIcon } from "./parts";
import { host, txt } from "./text";

/** The drawer with everything about one company; the arrows step through the filtered list. */
export function TenantDetail({ profile: p, asset, list, lang, onOpen }: { profile: TenantProfile; asset?: TenantAsset; list: TenantProfile[]; lang: Lang; onOpen: (slug: string | null) => void }) {
  const idx = list.findIndex((x) => x.slug === p.slug);
  const step = useCallback(
    (d: number) => {
      if (idx < 0) return;
      onOpen(list[(idx + d + list.length) % list.length].slug);
    },
    [idx, list, onOpen],
  );

  const close = useCallback(() => onOpen(null), [onOpen]);
  useDialogKeys(close, step);

  const logo = asset?.logoSvg ?? asset?.logo;
  const imageCredit = asset?.featureCredit ?? (asset?.featureSource ? host(asset.featurePage && asset.featurePage !== "override" ? asset.featurePage : asset.featureSource) : undefined);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={p.name}>
      <button type="button" aria-label={pick(txt.close, lang)} onClick={() => onOpen(null)} className="absolute inset-0 bg-ink/70 backdrop-blur-sm" />
      <article className="relative h-full w-full max-w-xl overflow-y-auto bg-ink-2 border-l border-line shadow-2xl">
        <div className="relative aspect-[16/9] bg-ink-3">
          {asset?.feature && <Image src={`/tenants/${asset.feature}`} alt="" fill sizes="(min-width: 640px) 576px, 100vw" className="object-cover" priority />}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-2 to-transparent" />
          <button
            type="button"
            onClick={() => onOpen(null)}
            className="absolute right-3 top-3 rounded-full glass h-9 w-9 grid place-items-center text-paper hover:text-accent"
            aria-label={pick(txt.close, lang)}
          >
            ✕
          </button>
          <TenantIcon asset={asset} name={p.name} size={64} className="absolute left-6 -bottom-6" />
        </div>

        <div className="px-6 pt-10 pb-10">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {pick(categoryLabel[p.category], lang)} · {p.building}
          </p>
          <div className="flex items-start gap-3 mt-1">
            <h2 className="text-2xl font-semibold tracking-tight flex-1">{p.name}</h2>
            <span className={"mt-1.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-mono " + statusClass[p.status]}>{pick(statusLabel[p.status], lang)}</span>
          </div>

          <dl className="mt-5 grid grid-cols-3 gap-2 text-sm">
            <Fact label={pick(txt.building, lang)} value={p.building} />
            <Fact label={pick(txt.floors, lang)} value={p.floorsLabel ? pick(p.floorsLabel, lang) : "—"} />
            <Fact label={pick(txt.since, lang)} value={p.since ?? "—"} />
          </dl>

          <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent mt-7 mb-2">{pick(txt.about, lang)}</h3>
          <p className="text-sm leading-relaxed text-paper/90">{pick(p.summary, lang)}</p>

          <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent mt-6 mb-2">{pick(txt.here, lang)}</h3>
          <p className="text-sm leading-relaxed text-paper/90">{pick(p.atTower, lang)}</p>

          {p.notes && p.notes.length > 0 && (
            <>
              <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent mt-6 mb-2">{pick(txt.notes, lang)}</h3>
              <ul className="space-y-1.5 text-sm text-paper/90 list-disc pl-5 marker:text-accent">
                {p.notes.map((n) => (
                  <li key={n.en}>{pick(n, lang)}</li>
                ))}
              </ul>
            </>
          )}

          {logo && (
            <div className="mt-7 rounded-xl bg-white p-5 grid place-items-center">
              <Image src={`/tenants/${logo}`} alt={`${p.name} logo`} width={240} height={80} className="max-h-16 w-auto object-contain" unoptimized={logo.endsWith(".svg")} />
            </div>
          )}
          {asset?.placeholder && <p className="mt-3 text-xs text-muted">{pick(txt.placeholderLogo, lang)}</p>}

          {p.website && (
            <a
              href={p.website}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-accent/60 px-4 py-1.5 text-sm text-accent hover:bg-accent/10"
            >
              {pick(txt.website, lang)}: {host(p.website)} ↗
            </a>
          )}

          <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent mt-7 mb-2">{pick(txt.sources, lang)}</h3>
          <ul className="space-y-1 text-sm">
            {p.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer" className="text-muted hover:text-accent underline decoration-line underline-offset-4">
                  {s.title} ↗
                </a>
              </li>
            ))}
          </ul>
          {imageCredit && (
            <p className="mt-6 text-[11px] text-muted">
              {pick(txt.imageFrom, lang)}: {imageCredit}
            </p>
          )}

          {list.length > 1 && idx >= 0 && (
            <div className="mt-8 flex justify-between font-mono text-[11px] uppercase tracking-widest">
              <button onClick={() => step(-1)} className="text-muted hover:text-accent">
                ← {pick(txt.prev, lang)}
              </button>
              <button onClick={() => step(1)} className="text-muted hover:text-accent">
                {pick(txt.next, lang)} →
              </button>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
