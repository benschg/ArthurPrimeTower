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
import { windows, type Windows } from "./windows";
import { facadeLife, type FacadeLife } from "./facadeLife";
import { DayNightToggle } from "./DayNightToggle";
import { IconExploded, IconRotate, IconStacked, IconStill, Switch } from "./viewer/Switch";
import type { CleanState, ViewerState } from "./TowerScene";
import { Celebration } from "./viewer/Celebration";
import { FloorPlanLink } from "./viewer/FloorPlanLink";
import { confettiCannons } from "./typing/cannons";
import type { TypingState } from "./typing/game";
import { useTypingGame } from "./typing/useTypingGame";
import { TypingHud } from "./viewer/TypingHud";
import { PAC_FLOOR } from "./pacman/maze";
import { pacman, usePacmanActive, usePacmanKeys, type Pacman } from "./pacman/store";
import { PacmanHud } from "./viewer/PacmanHud";
import { crossing, useCrossingActive, useCrossingKeys, type Crossing } from "./crossing/store";
import { CrossingHud } from "./viewer/CrossingHud";
import { race, useRaceActive, useRaceKeys, type Race } from "./race/store";
import { RaceCountdown, RaceHud } from "./viewer/RaceHud";
import { FrogSign } from "./viewer/FrogSign";
import { AboutInfo } from "./viewer/AboutInfo";

const TowerScene = dynamic(() => import("./TowerScene"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 grid place-items-center text-muted font-mono text-xs tracking-widest uppercase">…</div>,
});

type ToggleKey = keyof Omit<ViewerState, "hovered" | "selected" | "cleaning">;


const idleClean: CleanState = { active: false, progress: 0, secondsLeft: 60 };

declare global {
  interface Window {
    /** Scripting hooks, e.g. primeTower.blinds.setFloor(21, 1) or primeTower.windows.setAll(1) in the console. */
    primeTower?: { blinds: Blinds; windows: Windows; life: FacadeLife; cannons: typeof confettiCannons; pacman: Pacman; crossing: Crossing; race: Race; typingChars: () => string; typingState: () => TypingState };
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
    typing: false,
  });
  const [unitHover, setUnitHover] = useState(false);
  const [bridgeHover, setBridgeHover] = useState(false);

  const onHover = useCallback((f: number | null) => setState((s) => (s.hovered === f ? s : { ...s, hovered: f })), []);
  // Floor 13 is the game floor: its plate becomes the board, so the stack closes up behind it.
  const onSelect = useCallback(
    (f: number | null) => setState((s) => (s.cleaning.active ? s : { ...s, selected: f, explode: f === PAC_FLOOR ? false : s.explode })),
    [],
  );
  const onStartCleaning = useCallback(() => {
    crossing.stop();
    race.stop();
    setState((s) => ({
      ...s,
      hovered: null,
      selected: null,
      showTenants: false,
      explode: false,
      showGarage: false,
      cleaning: { active: true, progress: 0, secondsLeft: 60 },
    }));
  }, []);
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


  // Typing game on the facade: started from the "P" in the title.
  const quitTyping = useCallback(() => setState((s) => ({ ...s, typing: false })), []);
  const typingGame = useTypingGame(quitTyping);
  const typingState = typingGame.game;
  useEffect(() => {
    window.primeTower = { blinds, windows, life: facadeLife, cannons: confettiCannons, pacman, crossing, race, typingChars: () => typingState.chars, typingState: () => typingState };
    return () => {
      delete window.primeTower;
    };
  }, [typingState]);

  // The floor-13 game lives on its pulled-out floor: it starts when the floor comes out and
  // ends when the floor goes back or another game takes over.
  const pacActive = usePacmanActive();
  const pacFloorOut = state.selected === PAC_FLOOR && !state.cleaning.active && !state.typing;
  useEffect(() => {
    if (pacFloorOut) pacman.start();
    else pacman.stop();
  }, [pacFloorOut]);
  const quitPacman = useCallback(() => onSelect(null), [onSelect]);
  usePacmanKeys(pacActive, quitPacman);
  // Deep link: /#pacman pulls floor 13 out once the scene is up.
  useEffect(() => {
    if (typeof window === "undefined" || window.location.hash !== "#pacman") return;
    const id = window.setTimeout(() => onSelect(PAC_FLOOR), 1500);
    return () => window.clearTimeout(id);
  }, [onSelect]);
  // The games on the Hardbrücke: a click on the bridge starts one (the scene only passes clicks
  // on while no other game is on), usually the frog's crossing, one time in three the race.
  // Either ends when it is quit or another game takes over.
  const crossActive = useCrossingActive();
  const raceActive = useRaceActive();
  const startCrossing = useCallback(() => {
    setState((s) => ({ ...s, hovered: null, selected: null, explode: false, showGarage: false }));
    race.stop();
    crossing.start();
  }, []);
  const startRace = useCallback(() => {
    setState((s) => ({ ...s, hovered: null, selected: null, explode: false, showGarage: false }));
    crossing.stop();
    race.start();
  }, []);
  const playBridge = useCallback(() => (Math.random() < 1 / 3 ? startRace() : startCrossing()), [startRace, startCrossing]);
  const quitBridge = useCallback(() => {
    crossing.stop();
    race.stop();
  }, []);
  useCrossingKeys(crossActive, quitBridge);
  useRaceKeys(raceActive, quitBridge);
  useEffect(() => quitBridge, [quitBridge]);
  // Deep links: /#crossing and /#race start the one or the other once the scene is up.
  useEffect(() => {
    const hash = typeof window === "undefined" ? "" : window.location.hash;
    if (hash !== "#crossing" && hash !== "#race") return;
    const id = window.setTimeout(hash === "#race" ? startRace : startCrossing, 1500);
    return () => window.clearTimeout(id);
  }, [startCrossing, startRace]);
  /** a game has the view: the title block's extras step aside */
  const gameView = state.typing || pacActive || crossActive || raceActive;
  const startTyping = () => {
    quitBridge();
    setState((s) => ({ ...s, typing: true, hovered: null, selected: null, explode: false, showGarage: false, cleaning: idleClean }));
    typingGame.start();
  };

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
    <div data-game={pacActive ? "pacman" : crossActive ? "crossing" : raceActive ? "race" : undefined} className={"relative w-full h-[100svh] min-h-[560px] overflow-hidden bg-ink " + ((unitHover || (bridgeHover && !gameView)) && !clean.active ? "cursor-pointer" : "")}>
      <TowerScene
        {...state}
        pacman={pacActive}
        crossing={crossActive}
        race={raceActive}
        lang={lang}
        onHover={onHover}
        onSelect={onSelect}
        onStartCleaning={onStartCleaning}
        onCleanProgress={onCleanProgress}
        onHoverUnit={setUnitHover}
        onPlayBridge={playBridge}
        onHoverBridge={setBridgeHover}
      />
      {success && <Celebration title={g.success} text={g.timeUsed(Math.round(60 - clean.secondsLeft))} />}
      {/* Legibility gradients over the HDRI sky */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-linear-to-b from-ink/80 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[46vw] max-w-md bg-linear-to-r from-ink/70 to-transparent" />

      {crossActive && <FrogSign title={ui[lang].crossing.warning} text={ui[lang].crossing.warningText} />}
      {raceActive && <FrogSign compact title={ui[lang].race.warning} text={ui[lang].race.warningText} />}
      {raceActive && <RaceCountdown lang={lang} />}

      {/* Title */}
      <div className="absolute left-4 top-4 sm:left-8 sm:top-8 pointer-events-none max-w-[60vw]">
        {/* data-board-avoid: the floor-13 game board is fitted clear of these (scene/boardFit.ts) */}
        <p data-board-avoid className="font-mono text-[11px] uppercase tracking-[0.3em] text-accent">{t.eyebrow}</p>
        <h1 data-board-avoid className="mt-2 w-fit text-4xl sm:text-6xl font-semibold tracking-tight leading-[0.95]">
          <button
            type="button"
            onClick={(e) => {
              // drop focus first: a focused button that then gets disabled would swallow the game's keys
              e.currentTarget.blur();
              if (!state.typing && !clean.active) startTyping();
            }}
            aria-label={ui[lang].typing.startLabel}
            title={ui[lang].typing.startLabel}
            className="pointer-events-auto cursor-pointer rounded-sm transition-colors hover:text-accent focus-visible:text-accent focus-visible:outline-none"
          >
            P
          </button>
          rime
          <br />
          Tower
          <AboutInfo lang={lang} />
        </h1>
        {/* the tagline and link step aside while a game owns the view */}
        <p className={"mt-3 text-sm text-muted max-w-xs hidden sm:block transition-opacity duration-500 " + (gameView ? "opacity-0" : "")}>{t.tagline}</p>
        <Link
          href={presentationPath}
          tabIndex={gameView ? -1 : undefined}
          className={
            "mt-4 inline-flex items-center gap-2 rounded-full border border-accent/50 bg-ink/60 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-accent hover:bg-accent/15 hover:border-accent transition-all duration-500 " +
            (gameView ? "pointer-events-none opacity-0" : "pointer-events-auto")
          }
        >
          {ui[lang].sections.talk.cta} →
        </Link>
      </div>

      {/* Controls: one column of slider switches */}
      <div data-board-avoid className="z-20 absolute right-4 top-4 sm:right-8 sm:top-8 flex flex-col gap-1.5 items-end">
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
          disabled={clean.active || state.typing || crossActive || raceActive}
          left={<IconStill />}
          right={<IconRotate spinning={state.autoRotate} />}
        />
        <DayNightToggle
          night={state.night}
          onToggle={() => !clean.active && !state.typing && toggle("night")}
          label={t.toggles.night[0]}
          hint={t.toggles.night[1]}
        />
        <Switch
          on={state.explode}
          onToggle={() => toggle("explode")}
          label={t.toggles.explode[0]}
          hint={t.toggles.explode[1]}
          disabled={clean.active || state.typing || crossActive || raceActive}
          left={<IconStacked />}
          right={<IconExploded />}
        />
      </div>

      {/* Bottom-left card: floor info, or a game's HUD */}
      <div data-board-avoid className="z-20 absolute left-4 bottom-4 sm:left-8 sm:bottom-8 glass rounded-xl p-4 w-[calc(100%-2rem)] sm:w-80 pointer-events-none">
        {pacActive ? (
          <PacmanHud lang={lang} onQuit={quitPacman} />
        ) : crossActive ? (
          <CrossingHud lang={lang} onQuit={quitBridge} />
        ) : raceActive ? (
          <RaceHud lang={lang} onQuit={quitBridge} />
        ) : state.typing ? (
          <TypingHud game={typingGame.game} lang={lang} onAgain={typingGame.start} onQuit={typingGame.stop} onKey={typingGame.pressKey} />
        ) : clean.active ? (
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
            <p className="mt-2 text-[11px] text-muted">{unitHover ? g.start : bridgeHover ? ui[lang].bridgeTease : t.modelNote}</p>
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
                <span className="text-muted">{focus === PAC_FLOOR ? ui[lang].pacman.tease : t.pullOut}</span>
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
          (focus !== null || clean.active || gameView ? "opacity-0" : "")
        }
      >
        <span>▲ {TOWER_HEIGHT.toFixed(0)} m</span>
        {t.scale.slice(1).map((x) => (
          <span key={x}>{x}</span>
        ))}
      </div>

      <a href="#facts" data-board-avoid className="absolute left-1/2 -translate-x-1/2 bottom-4 sm:bottom-8 font-mono text-[10px] uppercase tracking-[0.3em] text-muted hover:text-accent hidden sm:block">
        {t.scroll}
      </a>
    </div>
  );
}
