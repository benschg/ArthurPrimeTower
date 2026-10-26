"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { useLang } from "@/i18n/LangContext";
import { ui } from "@/i18n/ui";
import { TOWER_HEIGHT } from "./geometry";
import { blinds, type Blinds } from "./blinds";
import { windows, type Windows } from "./windows";
import { facadeLife, type FacadeLife } from "./facadeLife";
import { useGameActive } from "./gameStore";
import { CLEAN_SECONDS, IDLE_CLEAN, type ViewerState } from "./scene/types";
import { confettiCannons } from "./typing/cannons";
import type { TypingState } from "./typing/game";
import { useTypingGame } from "./typing/useTypingGame";
import { PAC_FLOOR } from "./pacman/maze";
import { pacman, usePacmanKeys, type Pacman } from "./pacman/store";
import { crossing, useCrossingKeys, type Crossing } from "./crossing/store";
import { race, useRaceKeys, type Race } from "./race/store";
import { Celebration } from "./viewer/Celebration";
import { CleaningHud } from "./viewer/CleaningHud";
import { CrossingHud } from "./viewer/CrossingHud";
import { FloorInfo } from "./viewer/FloorInfo";
import { FrogSign } from "./viewer/FrogSign";
import { PacmanHud } from "./viewer/PacmanHud";
import { RaceCountdown, RaceHud } from "./viewer/RaceHud";
import { TitleBlock } from "./viewer/TitleBlock";
import { TypingHud } from "./viewer/TypingHud";
import { ViewerControls } from "./viewer/ViewerControls";

const TowerScene = dynamic(() => import("./TowerScene"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 grid place-items-center text-muted font-mono text-xs tracking-widest uppercase">…</div>,
});

type ToggleKey = keyof Omit<ViewerState, "hovered" | "selected" | "cleaning">;

declare global {
  interface Window {
    /** Scripting hooks, e.g. primeTower.blinds.setFloor(21, 1) or primeTower.windows.setAll(1) in the console. */
    primeTower?: { blinds: Blinds; windows: Windows; life: FacadeLife; cannons: typeof confettiCannons; pacman: Pacman; crossing: Crossing; race: Race; typingChars: () => string; typingState: () => TypingState };
  }
}

/** The 3D viewer at the top of the page: the scene, its controls and the card for the hovered floor or the game on. */
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
    cleaning: IDLE_CLEAN,
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
      cleaning: { active: true, progress: 0, secondsLeft: CLEAN_SECONDS },
    }));
  }, []);
  const onCleanProgress = useCallback(
    (progress: number, secondsLeft: number) =>
      setState((s) => (s.cleaning.active && s.cleaning.progress < 0.99 ? { ...s, cleaning: { active: true, progress, secondsLeft } } : s)),
    [],
  );

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
  const pacActive = useGameActive(pacman);
  const pacFloorOut = state.selected === PAC_FLOOR && !state.cleaning.active && !state.typing;
  useEffect(() => {
    if (pacFloorOut) pacman.start();
    else pacman.stop();
  }, [pacFloorOut]);
  const quitPacman = useCallback(() => onSelect(null), [onSelect]);
  usePacmanKeys(pacActive, quitPacman);

  // The games on the Hardbrücke: a click on the bridge starts one (the scene only passes clicks
  // on while no other game is on), usually the frog's crossing, one time in three the race.
  // Either ends when it is quit or another game takes over.
  const crossActive = useGameActive(crossing);
  const raceActive = useGameActive(race);
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

  // Deep links: /#clean, /#pacman, /#crossing and /#race start that game once the scene is up
  // (/#entrance is the camera's, see scene/camera.tsx).
  useEffect(() => {
    const links: Record<string, () => void> = { "#clean": onStartCleaning, "#pacman": () => onSelect(PAC_FLOOR), "#crossing": startCrossing, "#race": startRace };
    const start = links[window.location.hash];
    if (!start) return;
    const id = window.setTimeout(start, 1500);
    return () => window.clearTimeout(id);
  }, [onStartCleaning, onSelect, startCrossing, startRace]);

  const clean = state.cleaning;
  /** a game has the view: the title block's extras step aside */
  const gameView = state.typing || pacActive || crossActive || raceActive;
  /** a game has the camera and the facade */
  const locked = clean.active || state.typing || crossActive || raceActive;
  const startTyping = () => {
    if (state.typing || clean.active) return;
    quitBridge();
    setState((s) => ({ ...s, typing: true, hovered: null, selected: null, explode: false, showGarage: false, cleaning: IDLE_CLEAN }));
    typingGame.start();
  };

  const stopCleaning = () => setState((s) => ({ ...s, cleaning: IDLE_CLEAN }));
  const restartCleaning = () => {
    setState((s) => ({ ...s, cleaning: IDLE_CLEAN }));
    // start again on the next tick so the scene sees a fresh activation
    setTimeout(onStartCleaning, 50);
  };

  const toggle = (key: ToggleKey) => {
    // the window-cleaning and typing games are played by day as by night: keep what they started with
    if (key === "night" && (clean.active || state.typing)) return;
    setState((s) => {
      const next = { ...s, [key]: !s[key] };
      if (key === "showGarage" && next.showGarage) next.explode = false;
      if (key === "explode" && next.explode) next.showGarage = false;
      return next;
    });
  };

  const focus = clean.active ? null : (state.selected ?? state.hovered);
  const success = clean.active && clean.progress >= 0.99;

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
      {success && <Celebration title={g.success} text={g.timeUsed(Math.round(CLEAN_SECONDS - clean.secondsLeft))} />}
      {/* Legibility gradients over the HDRI sky */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-linear-to-b from-ink/80 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[46vw] max-w-md bg-linear-to-r from-ink/70 to-transparent" />

      {crossActive && <FrogSign title={ui[lang].crossing.warning} text={ui[lang].crossing.warningText} />}
      {raceActive && <FrogSign compact title={ui[lang].race.warning} text={ui[lang].race.warningText} />}
      {raceActive && <RaceCountdown lang={lang} />}

      <TitleBlock lang={lang} gameView={gameView} onStartTyping={startTyping} />
      <ViewerControls lang={lang} setLang={setLang} autoRotate={state.autoRotate} night={state.night} explode={state.explode} locked={locked} onToggle={toggle} />

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
          <CleaningHud clean={clean} lang={lang} onAgain={restartCleaning} onStop={stopCleaning} />
        ) : (
          <FloorInfo
            floor={focus}
            pulled={state.selected !== null}
            lang={lang}
            note={unitHover ? g.start : bridgeHover ? ui[lang].bridgeTease : t.modelNote}
            onRelease={() => onSelect(null)}
          />
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
