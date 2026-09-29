"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { tenantAssetBySlug } from "@/data/tenantAssets";
import { categoryLabel, profilesOnFloor } from "@/data/tenantProfiles";
import { floorBands } from "@/data/tower";
import { pick } from "@/i18n";
import { LangToggle, useLang } from "@/i18n/LangContext";
import { ui } from "@/i18n/ui";
import { floorElevation, FLOORS, stageForFloor, TOWER_HEIGHT } from "./geometry";
import { DayNightToggle } from "./DayNightToggle";
import { FloorPlanSvg } from "./FloorPlanSvg";
import { planForFloor } from "./floorPlans";
import type { CleanState, ViewerState } from "./TowerScene";

const TowerScene = dynamic(() => import("./TowerScene"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 grid place-items-center text-muted font-mono text-xs tracking-widest uppercase">…</div>,
});

type ToggleKey = keyof Omit<ViewerState, "hovered" | "selected" | "cleaning">;
const toggleKeys: ToggleKey[] = ["showTenants", "explode", "showGarage", "autoRotate"];

const idleClean: CleanState = { active: false, progress: 0, secondsLeft: 60 };

export function TowerViewer() {
  const { lang } = useLang();
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
      </div>

      {/* Controls */}
      <div className="z-20 absolute right-4 top-4 sm:right-8 sm:top-8 flex flex-col gap-1.5 items-end">
        <div className="mb-1 flex items-center gap-1.5">
          <LangToggle className="glass h-9" />
          <DayNightToggle
            night={state.night}
            onToggle={() => !clean.active && toggle("night")}
            label={t.toggles.night[0]}
            hint={t.toggles.night[1]}
          />
        </div>
        {toggleKeys.map((key) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            title={t.toggles[key][1]}
            disabled={clean.active}
            className={
              "glass rounded-full px-3.5 py-1.5 font-mono text-xs tracking-wider uppercase transition-colors disabled:opacity-40 " +
              (state[key] ? "text-ink !bg-accent border-accent" : "text-paper hover:text-accent")
            }
          >
            {t.toggles[key][0]}
          </button>
        ))}
      </div>

      {/* Floor plan panel */}
      {focus !== null && (
        <aside className="z-20 absolute right-4 top-72 sm:right-8 sm:top-74 glass rounded-xl p-3 sm:p-4 w-[min(300px,calc(100%-2rem))] pointer-events-auto">
          <p className="font-mono text-[11px] uppercase tracking-widest text-accent">
            {t.floor} {focus === 0 ? t.ground : focus} · {t.plan}
          </p>
          <div className="mt-2 overflow-hidden rounded-md bg-ink/60 p-2 flex justify-center">
            <FloorPlanSvg floor={focus} size={230} lang={lang} />
          </div>
          <FloorPlanLinks floor={focus} />
          <p className="mt-2 text-[10px] text-muted leading-snug">
            {t.schematic} {state.selected === null ? t.clickToPin : t.pinned}
          </p>
        </aside>
      )}

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
            <p className="mt-1 text-[11px] text-muted">{pick(stageForFloor(focus).label, lang)}</p>
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

function FloorPlanLinks({ floor }: { floor: number }) {
  const { lang } = useLang();
  const t = ui[lang];
  const ref = planForFloor(floor);
  return (
    <div className="mt-2 space-y-1.5">
      {ref.image && (
        <a href={ref.image.url} target="_blank" rel="noreferrer" className="group block rounded-md overflow-hidden border border-line bg-ink/60">
          {/* Linked from gigon-guyer.ch; the drawing is theirs and is not stored here. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ref.image.url} alt={pick(ref.image.title, lang)} loading="lazy" className="w-full h-24 object-cover object-center opacity-90 group-hover:opacity-100" />
          <p className="px-2 py-1 text-[10px] text-muted">
            <span className="text-paper">{pick(ref.image.title, lang)}</span> · {t.sections.plans.ggSource} ↗{!ref.image.exact && ` · ${t.viewer.nearestPlan}`}
          </p>
        </a>
      )}
      {ref.pdf && (
        <a href={ref.pdf.url} target="_blank" rel="noreferrer" className="block rounded-md border border-line px-2 py-1 text-[10px] text-muted hover:text-accent">
          {pick(ref.pdf.title, lang)} · primetower.ch ↗
        </a>
      )}
    </div>
  );
}

const CONFETTI_COLORS = ["#7dd3c0", "#4f8fd6", "#f2c14e", "#e25c4a", "#a78bfa", "#ffffff"];

/** Full-viewer confetti burst with a success card. Deterministic layout, CSS-driven motion. */
function Celebration({ title, text }: { title: string; text: string }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => {
        const r = (k: number) => {
          const n = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
          return n - Math.floor(n);
        };
        return {
          left: r(1) * 100,
          delay: r(2) * 1.8,
          duration: 2.6 + r(3) * 2,
          size: 6 + r(4) * 8,
          color: CONFETTI_COLORS[Math.floor(r(5) * CONFETTI_COLORS.length)],
          sway: 20 + r(6) * 60,
          round: r(7) > 0.6,
        };
      }),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className={"confetti absolute -top-4 " + (p.round ? "rounded-full" : "rounded-sm")}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 1.6,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ["--sway" as string]: `${p.sway}px`,
          }}
        />
      ))}
      <div className="celebrate-card absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 glass rounded-2xl px-8 py-6 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-accent">{title}</p>
        <p className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">100%</p>
        <p className="mt-1 text-sm text-muted">{text}</p>
      </div>
    </div>
  );
}
