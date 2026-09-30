"use client";

import { useEffect, useSyncExternalStore } from "react";
import { CALM, road } from "../crossing/road";
import { sound, type Note } from "../pacman/sound";
import { FINISH, newGame, readBest, START, steer, step, type RaceEvent, type RaceGame, type RacePhase } from "./game";

/** What the HUD shows; replaced (never mutated) when one of its values changes. */
export type RaceHud = {
  active: boolean;
  phase: RacePhase;
  /** whole seconds to the start, 0 once under way */
  count: number;
  /** the race has only just started: "GO!" is still up */
  go: boolean;
  place: number;
  /** race time in tenths of a second */
  tenths: number;
  kmh: number;
  /** share of the distance covered */
  progress: number;
  crashes: number;
  /** best time in seconds, 0 if none */
  best: number;
  newBest: boolean;
  muted: boolean;
};

const IDLE: RaceHud = { active: false, phase: "count", count: 3, go: false, place: 1, tenths: 0, kmh: 0, progress: 0, crashes: 0, best: 0, newBest: false, muted: false };

const tune = (freqs: number[], each: number, gain = 0.6): Note[] => freqs.map((f, i) => ({ f, at: i * each, dur: each, type: "triangle", gain }));

const SOUNDS: Record<RaceEvent, Note[]> = {
  beep: [{ f: 440, at: 0, dur: 0.16, type: "square", gain: 0.35 }],
  go: [{ f: 880, at: 0, dur: 0.45, type: "square", gain: 0.4 }],
  shift: [{ f: 300, to: 420, at: 0, dur: 0.05, type: "triangle", gain: 0.3 }],
  crash: [
    { f: 190, to: 50, at: 0, dur: 0.35, type: "sawtooth", gain: 0.5 },
    { f: 95, to: 70, at: 0.02, dur: 0.22, type: "square", gain: 0.3 },
  ],
  finish: tune([523, 659, 784, 1047, 784, 1047, 1319], 0.1, 0.7),
};

/**
 * Runs the Hardbrücke sprint. The scene steps it once per rendered frame, after the road,
 * and reads the cars straight from `game`; React only hears about what the HUD shows.
 * Also reachable in the browser console as primeTower.race.
 */
class Race {
  game: RaceGame | null = null;
  private hud: RaceHud = IDLE;
  private listeners = new Set<() => void>();

  start(): this {
    this.game = newGame(readBest());
    this.publish();
    return this;
  }

  stop(): this {
    if (!this.game) return this;
    this.game = null;
    road.flow = CALM;
    road.blockers = [];
    this.publish();
    return this;
  }

  /** Change lane: -1 to the left on screen, +1 to the right. */
  steer(d: number): this {
    if (this.game) steer(this.game, Math.sign(d));
    sound.wake(); // a key or a tap is what lets the browser start the audio
    return this;
  }

  /** Hold the brake, or let go of it. */
  brake(on: boolean): this {
    if (this.game && this.game.phase === "race") this.game.braking = on;
    return this;
  }

  toggleSound(): this {
    sound.setMuted(!sound.muted);
    sound.wake();
    this.publish();
    return this;
  }

  /** Advance by dt seconds. */
  frame(dt: number): void {
    const g = this.game;
    if (!g) return;
    step(g, Math.min(dt, 0.1));
    for (const e of g.events) sound.notes(SOUNDS[e]);
    g.events.length = 0;
    this.publish();
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  snapshot = (): RaceHud => this.hud;

  private publish(): void {
    const g = this.game;
    const me = g?.racers[0];
    const next: RaceHud =
      g && me
        ? {
            active: true,
            phase: g.phase,
            count: g.phase === "count" ? Math.ceil(g.count) : 0,
            go: g.phase === "race" && g.time < 0.9,
            place: g.place,
            tenths: Math.floor((me.finished || g.time) * 10),
            kmh: Math.round((me.v * 3.6) / 5) * 5,
            progress: Math.round(Math.min(1, Math.max(0, (me.p - START) / (FINISH - START))) * 50) / 50,
            crashes: g.crashes,
            best: g.best,
            newBest: g.newBest,
            muted: sound.muted,
          }
        : IDLE;
    const cur = this.hud;
    const same = (Object.keys(next) as (keyof RaceHud)[]).every((k) => cur[k] === next[k]);
    if (same) return;
    this.hud = next;
    for (const fn of this.listeners) fn();
  }
}

export type { Race };
export const race = new Race();

const idle = () => IDLE;
const isActive = () => race.snapshot().active;
const notActive = () => false;

/** The HUD's view of the race. */
export function useRaceHud(): RaceHud {
  return useSyncExternalStore(race.subscribe, race.snapshot, idle);
}

/** Whether a race is on; changes only when one starts or stops. */
export function useRaceActive(): boolean {
  return useSyncExternalStore(race.subscribe, isActive, notActive);
}

const LEFT = new Set(["ArrowLeft", "a"]);
const RIGHT = new Set(["ArrowRight", "d"]);
const BRAKE = new Set(["ArrowDown", "s"]);
const GAS = new Set(["ArrowUp", "w"]); // the car accelerates by itself; the keys just must not scroll the page

/** Left and right change lane, down brakes while held, Enter races again once done, Esc quits. */
export function useRaceKeys(active: boolean, onQuit: () => void): void {
  useEffect(() => {
    if (!active) return;
    const name = (e: KeyboardEvent) => (e.key.length === 1 ? e.key.toLowerCase() : e.key);
    const onDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = name(e);
      if (k === "Escape") {
        e.preventDefault();
        onQuit();
      } else if (k === "Enter" && race.game?.phase === "done") {
        e.preventDefault();
        race.start();
      } else if (LEFT.has(k) || RIGHT.has(k)) {
        e.preventDefault();
        if (!e.repeat) race.steer(LEFT.has(k) ? -1 : 1);
      } else if (BRAKE.has(k)) {
        e.preventDefault();
        race.brake(true);
      } else if (GAS.has(k)) e.preventDefault();
    };
    const onUp = (e: KeyboardEvent) => {
      if (BRAKE.has(name(e))) race.brake(false);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [active, onQuit]);
}
