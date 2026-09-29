"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { tenantAssetBySlug, type TenantAsset } from "@/data/tenantAssets";
import { categoryLabel, isPast, statusClass, statusLabel, tenantProfiles, type ProfileBuilding, type ProfileCategory, type TenantProfile } from "@/data/tenantProfiles";
import { l, pick, type L, type Lang } from "@/i18n";
import { LangToggle, useLang } from "@/i18n/LangContext";

const buildings: ProfileBuilding[] = ["Prime Tower", "Platform", "Cubus", "Diagonal", "MAAG Halle"];
const categories: ProfileCategory[] = ["finance", "law", "consulting", "tech", "realestate", "energy", "media", "food", "retail", "health", "culture"];
const TOP_FLOOR = 35;

const txt = {
  back: l("Prime Tower", "Prime Tower"),
  eyebrow: l("Tenant directory", "Mieterverzeichnis"),
  title: l("Who works in and around the Prime Tower", "Wer im und um den Prime Tower arbeitet"),
  intro: l(
    "Every company on the Maag site, researched from press reports, the commercial register and company websites (September 2026). Floor numbers are only shown where a source names them.",
    "Alle Firmen auf dem Maag-Areal, recherchiert aus Presseberichten, dem Handelsregister und Firmenwebsites (September 2026). Geschosse werden nur gezeigt, wo eine Quelle sie nennt.",
  ),
  stats: { companies: l("companies", "Firmen"), tower: l("in the tower", "im Turm"), floors: l("floors identified", "Geschosse zugeordnet"), buildings: l("buildings", "Gebäude") },
  search: l("Search companies…", "Firmen suchen…"),
  all: l("All", "Alle"),
  showPast: l("Include former and moved", "Ehemalige und Weggezogene zeigen"),
  none: l("No company matches these filters.", "Keine Firma passt zu diesen Filtern."),
  reset: l("Reset filters", "Filter zurücksetzen"),
  stack: l("Floor stack", "Geschossübersicht"),
  stackHint: l("Floors with a sourced tenant. Click one to filter.", "Geschosse mit belegter Mieterschaft. Klicken zum Filtern."),
  floor: l("Floor", "Geschoss"),
  ground: l("G", "EG"),
  clearFloor: l("All floors", "Alle Geschosse"),
  close: l("Close", "Schliessen"),
  about: l("About", "Über die Firma"),
  here: l("On the site", "Auf dem Areal"),
  notes: l("Worth knowing", "Wissenswert"),
  sources: l("Sources", "Quellen"),
  website: l("Website", "Website"),
  since: l("Since", "Seit"),
  floors: l("Floors", "Geschosse"),
  building: l("Building", "Gebäude"),
  imageFrom: l("Image", "Bild"),
  placeholderLogo: l("No logo available; monogram shown.", "Kein Logo verfügbar; Monogramm gezeigt."),
  prev: l("Previous", "Vorherige"),
  next: l("Next", "Nächste"),
  count: l("shown", "angezeigt"),
};

const host = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];

/* The selected tenant lives in the URL hash so a profile can be linked to directly. */
function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}
const readHash = () => decodeURIComponent(window.location.hash.slice(1));
const serverHash = () => "";

export function TenantExplorer() {
  const { lang } = useLang();
  const t = <K extends L>(x: K) => pick(x, lang);

  const [query, setQuery] = useState("");
  const [building, setBuilding] = useState<ProfileBuilding | null>(null);
  const [category, setCategory] = useState<ProfileCategory | null>(null);
  const [floor, setFloor] = useState<number | null>(null);
  const [showPast, setShowPast] = useState(true);

  const hash = useSyncExternalStore(subscribeHash, readHash, serverHash);
  const selected = tenantProfiles.find((p) => p.slug === hash) ?? null;
  const open = useCallback((slug: string | null) => {
    if (slug) window.location.hash = slug;
    else history.replaceState(null, "", window.location.pathname + window.location.search);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tenantProfiles.filter((p) => {
      if (building && p.building !== building) return false;
      if (category && p.category !== category) return false;
      if (floor !== null && !p.floors?.includes(floor)) return false;
      if (!showPast && isPast(p)) return false;
      if (!q) return true;
      const hay = [p.name, p.building, pick(p.summary, lang), pick(p.atTower, lang), pick(categoryLabel[p.category], lang)].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [query, building, category, floor, showPast, lang]);

  const filtersActive = query !== "" || building !== null || category !== null || floor !== null || !showPast;
  const reset = () => {
    setQuery("");
    setBuilding(null);
    setCategory(null);
    setFloor(null);
    setShowPast(true);
  };

  const stats = useMemo(() => {
    const floorSet = new Set(tenantProfiles.flatMap((p) => (p.status === "current" ? (p.floors ?? []) : [])));
    return {
      companies: tenantProfiles.length,
      tower: tenantProfiles.filter((p) => p.building === "Prime Tower" && !isPast(p)).length,
      floors: floorSet.size,
      buildings: buildings.length,
    };
  }, []);

  return (
    <main className="flex-1">
      <nav className="sticky top-0 z-40 glass border-x-0 border-t-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-12 flex items-center gap-5 font-mono text-[11px] uppercase tracking-[0.2em]">
          <Link href="/#tenants" className="shrink-0 text-accent hover:text-paper">
            ← {t(txt.back)}
          </Link>
          <span className="text-muted truncate">{t(txt.eyebrow)}</span>
          <LangToggle className="ml-auto shrink-0" />
        </div>
      </nav>

      <header className="px-4 sm:px-8 pt-14 pb-8 max-w-7xl mx-auto w-full">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent mb-3">{t(txt.eyebrow)}</p>
        <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight mb-4 max-w-3xl">{t(txt.title)}</h1>
        <p className="text-muted max-w-2xl leading-relaxed">{t(txt.intro)}</p>
        <dl className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl">
          {(Object.keys(stats) as (keyof typeof stats)[]).map((k) => (
            <div key={k} className="rounded-xl border border-line bg-ink-2 px-4 py-3">
              <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">{t(txt.stats[k])}</dt>
              <dd className="text-2xl font-semibold mt-1">{stats[k]}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="px-4 sm:px-8 pb-24 max-w-7xl mx-auto w-full grid gap-8 lg:grid-cols-[220px_1fr]">
        <FloorStack lang={lang} floor={floor} setFloor={setFloor} onOpen={open} />

        <div className="min-w-0">
          <Filters
            lang={lang}
            query={query}
            setQuery={setQuery}
            building={building}
            setBuilding={setBuilding}
            category={category}
            setCategory={setCategory}
            showPast={showPast}
            setShowPast={setShowPast}
          />

          <div className="flex items-center gap-3 mt-5 mb-4 font-mono text-[11px] uppercase tracking-widest text-muted">
            <span>
              {filtered.length} / {tenantProfiles.length} {t(txt.count)}
            </span>
            {floor !== null && (
              <button onClick={() => setFloor(null)} className="rounded-full border border-accent/60 text-accent px-2 py-0.5 hover:bg-accent/10">
                {t(txt.floor)} {floor === 0 ? t(txt.ground) : floor} ✕
              </button>
            )}
            {filtersActive && (
              <button onClick={reset} className="ml-auto hover:text-paper underline underline-offset-4 decoration-line">
                {t(txt.reset)}
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <p className="rounded-2xl border border-line bg-ink-2 p-8 text-muted text-center">{t(txt.none)}</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p) => (
                <li key={p.slug}>
                  <TenantCard profile={p} asset={tenantAssetBySlug[p.slug]} lang={lang} onOpen={() => open(p.slug)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {selected && <TenantDetail profile={selected} asset={tenantAssetBySlug[selected.slug]} list={filtered.length ? filtered : tenantProfiles} lang={lang} onOpen={open} />}
    </main>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "shrink-0 rounded-full border px-3 py-1 text-xs transition-colors " +
        (active ? "border-accent bg-accent/15 text-accent" : "border-line text-muted hover:text-paper hover:border-paper/40")
      }
    >
      {children}
    </button>
  );
}

function Filters(props: {
  lang: Lang;
  query: string;
  setQuery: (v: string) => void;
  building: ProfileBuilding | null;
  setBuilding: (v: ProfileBuilding | null) => void;
  category: ProfileCategory | null;
  setCategory: (v: ProfileCategory | null) => void;
  showPast: boolean;
  setShowPast: (v: boolean) => void;
}) {
  const { lang } = props;
  const count = (fn: (p: TenantProfile) => boolean) => tenantProfiles.filter(fn).length;
  return (
    <div className="space-y-3">
      <input
        type="search"
        value={props.query}
        onChange={(e) => props.setQuery(e.target.value)}
        placeholder={pick(txt.search, lang)}
        className="w-full rounded-xl border border-line bg-ink-2 px-4 py-2.5 text-sm placeholder:text-muted focus:outline-none focus:border-accent"
      />
      <div className="flex flex-wrap gap-2">
        <Chip active={props.building === null} onClick={() => props.setBuilding(null)}>
          {pick(txt.all, lang)}
        </Chip>
        {buildings.map((b) => (
          <Chip key={b} active={props.building === b} onClick={() => props.setBuilding(props.building === b ? null : b)}>
            {b} <span className="opacity-60">{count((p) => p.building === b)}</span>
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <Chip key={c} active={props.category === c} onClick={() => props.setCategory(props.category === c ? null : c)}>
            {pick(categoryLabel[c], lang)}
          </Chip>
        ))}
      </div>
      <label className="inline-flex items-center gap-2 text-xs text-muted cursor-pointer select-none">
        <input type="checkbox" checked={props.showPast} onChange={(e) => props.setShowPast(e.target.checked)} className="accent-[var(--accent)]" />
        {pick(txt.showPast, lang)}
      </label>
    </div>
  );
}

function Icon({ asset, name, size = 40, className = "" }: { asset?: TenantAsset; name: string; size?: number; className?: string }) {
  if (!asset) return null;
  return (
    <Image
      src={`/tenants/${asset.icon}`}
      alt={`${name} logo`}
      width={size}
      height={size}
      className={"rounded-lg bg-white object-contain shadow-md ring-1 ring-black/10 " + className}
      style={{ width: size, height: size }}
    />
  );
}

function TenantCard({ profile: p, asset, lang, onOpen }: { profile: TenantProfile; asset?: TenantAsset; lang: Lang; onOpen: () => void }) {
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
        <Icon asset={asset} name={p.name} size={44} className="absolute left-4 bottom-3" />
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

function FloorStack({ lang, floor, setFloor, onOpen }: { lang: Lang; floor: number | null; setFloor: (f: number | null) => void; onOpen: (slug: string) => void }) {
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

function TenantDetail({ profile: p, asset, list, lang, onOpen }: { profile: TenantProfile; asset?: TenantAsset; list: TenantProfile[]; lang: Lang; onOpen: (slug: string | null) => void }) {
  const idx = list.findIndex((x) => x.slug === p.slug);
  const step = useCallback(
    (d: number) => {
      if (idx < 0) return;
      onOpen(list[(idx + d + list.length) % list.length].slug);
    },
    [idx, list, onOpen],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpen(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onOpen, step]);

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
          <Icon asset={asset} name={p.name} size={64} className="absolute left-6 -bottom-6" />
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

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-ink-3/50 px-3 py-2">
      <dt className="font-mono text-[9px] uppercase tracking-widest text-muted">{label}</dt>
      <dd className="mt-0.5 text-xs leading-snug">{value}</dd>
    </div>
  );
}
