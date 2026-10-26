"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { tenantAssetBySlug } from "@/data/tenantAssets";
import { categoryLabel, isPast, profileBuildings, tenantProfiles, type ProfileBuilding, type ProfileCategory } from "@/data/tenantProfiles";
import { pick, type L } from "@/i18n";
import { LangToggle, useLang } from "@/i18n/LangContext";
import { useHash } from "@/lib/useHash";
import { Filters } from "./Filters";
import { FloorStack } from "./FloorStack";
import { TenantCard } from "./TenantCard";
import { TenantDetail } from "./TenantDetail";
import { txt } from "./text";

/** The /tenants page: every company on the site, filterable, with a floor stack and a detail drawer. The open company lives in the URL hash so it can be linked to. */
export function TenantExplorer() {
  const { lang } = useLang();
  const t = <K extends L>(x: K) => pick(x, lang);

  const [query, setQuery] = useState("");
  const [building, setBuilding] = useState<ProfileBuilding | null>(null);
  const [category, setCategory] = useState<ProfileCategory | null>(null);
  const [floor, setFloor] = useState<number | null>(null);
  const [showPast, setShowPast] = useState(true);

  const hash = decodeURIComponent(useHash());
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
      buildings: profileBuildings.length,
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
