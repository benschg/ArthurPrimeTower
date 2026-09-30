"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { tenantAssetBySlug } from "@/data/tenantAssets";
import { categoryLabel, profilesOnFloor } from "@/data/tenantProfiles";
import { presentationPath } from "@/data/presentation";
import { floorBands } from "@/data/tower";
import { pick } from "@/i18n";
import { FlagCH, FlagUK, useLang } from "@/i18n/LangContext";
import { ui } from "@/i18n/ui";
import { floorElevation, FLOORS, polygonArea, stageForFloor, TOWER_HEIGHT } from "./geometry";
import { blinds, type Blinds } from "./blinds";
import { DayNightToggle } from "./DayNightToggle";
import { IconExploded, IconRotate, IconStacked, IconStill, Switch } from "./viewer/Switch";
import type { CleanState, ViewerState } from "./TowerScene";
import { Celebration } from "./viewer/Celebration";
import { FloorPlanLink } from "./viewer/FloorPlanLink";

const TowerScene = dynamic(() => import("./TowerScene"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 grid place-items-center text-muted font-mono text-xs tracking-widest uppercase">…</div>,
});

type ToggleKey = keyof Omit<ViewerState, "hovered" | "selected" | "cleaning">;


const idleClean: CleanState = { active: false, progress: 0, secondsLeft: 60 };

declare global {
  interface Window {
    /** Scripting hooks, e.g. primeTower.blinds.setFloor(21, 1) in the console. */
    primeTower?: { blinds: Blinds };
  }
}

export function TowerViewer() {
  const { lang, setLang } = useLang();
  const t = ui[lang].viewer;
  const g = ui[lang].game;

  const [state, setState] = useState<ViewerState>({
    showTenants: false,
    showGarage: false,
    explode: false,
    autoRotate: true,
    night: false,
    hovered: null,
    selected: null,
    cleaning: idleClean,
  });
  const [unitHover, setUnitHover] = useState(false);

  const onHover = useCallback((f: number | null) => setState((s) => (s.hovered === f ? s : { ...s, hovered: f })), []);
  const onSelect = useCallback((f: number | null) => setState((s) => (s.cleaning.active ? s : { ...s, selected: f })), []);
  const onStartCleaning = useCallback(
    () =>
      setState((s) => ({
        ...s,
        hovered: null,
        selected: null,
        showTenants: false,
        explode: false,
        showGarage: false,
        cleaning: { active: true, progress: 0, secondsLeft: 60 },
      })),
    [],
  );
  const onCleanProgress = useCallback(
    (progress: number, secondsLeft: number) =>
      setState((s) => (s.cleaning.active && s.cleaning.progress < 0.99 ? { ...s, cleaning: { active: true, progress, secondsLeft } } : s)),
    [],
  );
  // Deep link: /#clean starts the window-cleaning game once the scene is up.
  useEffect(() => {
    if (typeof window === "undefined" || window.location.hash !== "#clean") return;
    const id = window.setTimeout(onStartCleaning, 1500);
    return () => window.clearTimeout(id);
  }, [onStartCleaning]);

  // Hidden shortcut: Shift+F while cleaning finishes the job instantly.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.shiftKey && (e.key === "F" || e.key === "f"))) return;
      setState((s) => (s.cleaning.active && s.cleaning.progress < 0.99 ? { ...s, cleaning: { ...s.cleaning, progress: 1 } } : s));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    window.primeTower = { blinds };
    return () => {
      delete window.primeTower;
    };
  }, []);

  const stopCleaning = () => setState((s) => ({ ...s, cleaning: idleClean }));
  const restartCleaning = () => {
    setState((s) => ({ ...s, cleaning: idleClean }));
    // start again on the next tick so the scene sees a fresh activation
    setTimeout(onStartCleaning, 50);
  };

  const toggle = (key: ToggleKey) =>
    setState((s) => {
      const next = { ...s, [key]: !s[key] };
      if (key === "showGarage" && next.showGarage) next.explode = false;
      if (key === "explode" && next.explode) next.showGarage = false;
      return next;
    });

  const focus = state.cleaning.active ? null : (state.selected ?? state.hovered);
  const band = focus === null ? null : floorBands.find((b) => focus >= b.from && focus <= b.to);
  const tenantsOnFloor = useMemo(() => (focus === null ? [] : profilesOnFloor(focus)), [focus]);

  const clean = state.cleaning;
  const success = clean.active && clean.progress >= 0.99;
  const pct = success ? 100 : Math.round(clean.progress * 100);
  const finished = success || (clean.active && clean.secondsLeft <= 0);

  return (
    <div className={"relative w-full h-[100svh] min-h-[560px] overflow-hidden bg-ink " + (unitHover && !clean.active ? "cursor-pointer" : "")}>
      <TowerScene
        {...state}
        lang={lang}
        onHover={onHover}
        onSelect={onSelect}
        onStartCleaning={onStartCleaning}
        onCleanProgress={onCleanProgress}
        onHoverUnit={setUnitHover}
      />
      {success && <Celebration title={g.success} text={g.timeUsed(Math.round(60 - clean.secondsLeft))} />}
      {/* Legibility gradients over the HDRI sky */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-linear-to-b from-ink/80 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[46vw] max-w-md bg-linear-to-r from-ink/70 to-transparent" />

      {/* Title */}
      <div className="absolute left-4 top-4 sm:left-8 sm:top-8 pointer-events-none max-w-[60vw]">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-accent">{t.eyebrow}</p>
        <h1 className="mt-2 text-4xl sm:text-6xl font-semibold tracking-tight leading-[0.95]">
          Prime
          <br />
          Tower
        </h1>
        <p className="mt-3 text-sm text-muted max-w-xs hidden sm:block">{t.tagline}</p>
        <Link
          href={presentationPath}
          className="pointer-events-auto mt-4 inline-flex items-center gap-2 rounded-full border border-accent/50 bg-ink/60 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-accent hover:bg-accent/15 hover:border-accent transition-colors"
        >
          {ui[lang].sections.talk.cta} →
        </Link>
      </div>

      {/* Controls: one column of slider switches */}
      <div className="z-20 absolute right-4 top-4 sm:right-8 sm:top-8 flex flex-col gap-1.5 items-end">
        <Switch
          on={lang === "de"}
          onToggle={() => setLang(lang === "de" ? "en" : "de")}
          label={lang === "de" ? "Sprache: Deutsch" : "Language: English"}
          left={<FlagUK className="h-3.5 w-5 rounded-[2px] shadow-sm" />}
          right={<FlagCH className="h-3.5 w-3.5 rounded-[2px] shadow-sm" />}
        />
        <Switch
          on={state.autoRotate}
          onToggle={() => toggle("autoRotate")}
          label={t.toggles.autoRotate[0]}
          hint={t.toggles.autoRotate[1]}
          disabled={clean.active}
          left={<IconStill />}
          right={<IconRotate spinning={state.autoRotate} />}
        />
        <DayNightToggle
          night={state.night}
          onToggle={() => !clean.active && toggle("night")}
          label={t.toggles.night[0]}
          hint={t.toggles.night[1]}
        />
        <Switch
          on={state.explode}
          onToggle={() => toggle("explode")}
          label={t.toggles.explode[0]}
          hint={t.toggles.explode[1]}
          disabled={clean.active}
          left={<IconStacked />}
          right={<IconExploded />}
        />
      </div>

      {/* Bottom-left card: floor info, or the cleaning HUD */}
      <div className="z-20 absolute left-4 bottom-4 sm:left-8 sm:bottom-8 glass rounded-xl p-4 w-[calc(100%-2rem)] sm:w-80 pointer-events-none">
        {clean.active ? (
          <div className="pointer-events-auto">
            <p className="font-mono text-[11px] uppercase tracking-widest text-accent">{g.title}</p>
            <div className="mt-2 flex items-baseline justify-between font-mono text-sm">
              <span>
                <span className="text-2xl font-semibold text-paper">{pct}%</span> <span className="text-muted">{g.cleaned}</span>
              </span>
              <span className={clean.secondsLeft < 10 ? "text-red-400" : "text-muted"}>
                {g.time} {Math.ceil(clean.secondsLeft)}s
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-ink-3 overflow-hidden">
              <div className="h-full bg-accent transition-[width] duration-200" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted leading-snug">{finished ? (success ? g.done : g.timeUp) : g.hint}</p>
            <div className="mt-3 flex gap-2 font-mono text-xs">
              <button onClick={restartCleaning} className="glass px-3 py-1.5 rounded-md hover:text-accent">
                {g.again}
              </button>
              <button onClick={stopCleaning} className="glass px-3 py-1.5 rounded-md hover:text-accent">
                {g.stop}
              </button>
            </div>
          </div>
        ) : focus === null ? (
          <>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted">{t.floorPlate}</p>
            <p className="mt-1 text-sm leading-snug">
              {t.hint} <span className="text-accent">{t.hintTenants}</span> {t.hintRest}
            </p>
            <p className="mt-2 text-[11px] text-muted">{unitHover ? g.start : t.modelNote}</p>
          </>
        ) : (
          <>
            <p className="font-mono text-[11px] uppercase tracking-widest text-accent">
              {t.floor} {focus === 0 ? t.ground : focus} {t.of} {FLOORS - 1} · {floorElevation(focus).toFixed(1)} m
            </p>
            <p className="mt-1 text-base font-medium leading-snug">{band ? pick(band.label, lang) : t.offices}</p>
            <p className="mt-1 text-[11px] text-muted">
              {pick(stageForFloor(focus).label, lang)} · {polygonArea(stageForFloor(focus).polygon).toFixed(0)} m²
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 pointer-events-auto font-mono text-[10px]">
              {state.selected !== null ? (
                <>
                  <span className="text-accent">{t.pulled}</span>
                  <button onClick={() => onSelect(null)} className="glass rounded-md px-2 py-1 hover:text-accent">
                    {t.release} ✕
                  </button>
                </>
              ) : (
                <span className="text-muted">{t.pullOut}</span>
              )}
              <FloorPlanLink floor={focus} />
            </div>
            {tenantsOnFloor.length > 0 && (
              <ul className="mt-3 space-y-2 pointer-events-auto">
                {tenantsOnFloor.map((p) => {
                  const icon = tenantAssetBySlug[p.slug]?.icon;
                  return (
                    <li key={p.slug}>
                      <Link href={`/tenants#${p.slug}`} className="group flex items-center gap-2.5 rounded-lg -mx-1 px-1 py-1 hover:bg-paper/5">
                        {icon && (
                          <Image src={`/tenants/${icon}`} alt="" width={32} height={32} className="shrink-0 rounded-md bg-white object-contain" style={{ width: 32, height: 32 }} />
                        )}
                        <span className="min-w-0">
                          <span className="block text-sm text-paper leading-tight group-hover:text-accent truncate">{p.name}</span>
                          <span className="block text-[11px] text-muted leading-tight truncate">
                            {pick(categoryLabel[p.category], lang)}
                            {p.floorsLabel ? ` · ${pick(p.floorsLabel, lang)}` : ""}
                          </span>
                        </span>
                        <span className="ml-auto text-muted group-hover:text-accent">→</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>

      {/* Height scale */}
      <div
        className={
          "absolute right-4 bottom-4 sm:right-8 sm:bottom-8 hidden lg:flex flex-col items-end gap-1 font-mono text-[10px] text-muted pointer-events-none " +
          (focus !== null || clean.active ? "opacity-0" : "")
        }
      >
        <span>▲ {TOWER_HEIGHT.toFixed(0)} m</span>
        {t.scale.slice(1).map((x) => (
          <span key={x}>{x}</span>
        ))}
      </div>

      <a href="#facts" className="absolute left-1/2 -translate-x-1/2 bottom-4 sm:bottom-8 font-mono text-[10px] uppercase tracking-[0.3em] text-muted hover:text-accent hidden sm:block">
        {t.scroll}
      </a>
    </div>
  );
}
