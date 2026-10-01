"use client";

import { useEffect, useSyncExternalStore } from "react";
import { sound, type Note } from "../pacman/sound";
import { levelOf, move, newGame, readBest, step, type CrossEvent, type CrossGame, type CrossPhase } from "./game";
import { CALM, road } from "./road";
import { useGamepad } from "../gamepad";

/** What the HUD shows; replaced (never mutated) when one of its values changes. */
export type CrossHud = {
  active: boolean;
  phase: CrossPhase;
  crossings: number;
  lives: number;
  level: number;
  /** share of the crossing's time still left, in steps coarse enough not to redraw every frame */
  time: number;
  knocks: number;
  best: number;
  newBest: boolean;
  muted: boolean;
};

const IDLE: CrossHud = { active: false, phase: "ready", crossings: 0, lives: 0, level: 1, time: 1, knocks: 0, best: 0, newBest: false, muted: false };

const tune = (freqs: number[], each: number, gain = 0.6): Note[] => freqs.map((f, i) => ({ f, at: i * each, dur: each, type: "triangle", gain }));

const SOUNDS: Record<CrossEvent, Note[]> = {
  hop: [{ f: 520, to: 760, at: 0, dur: 0.05, type: "triangle", gain: 0.4 }],
  hit: [
    { f: 620, to: 560, at: 0, dur: 0.14, type: "square", gain: 0.3 }, // a horn, too late
    { f: 300, to: 60, at: 0.12, dur: 0.4, type: "sawtooth", gain: 0.4 },
  ],
  late: [{ f: 330, to: 160, at: 0, dur: 0.4, type: "sawtooth", gain: 0.35 }],
  cross: tune([659, 784, 1047, 1319], 0.09, 0.7),
  over: tune([392, 330, 262, 196], 0.26),
};

/**
 * Runs the Hardbrücke game. The scene steps it once per rendered frame, after the road, and
 * reads the frog straight from `game`; React only hears about the few numbers the HUD shows.
 * Also reachable in the browser console as primeTower.crossing.
 */
class Crossing {
  game: CrossGame | null = null;
  private hud: CrossHud = IDLE;
  private listeners = new Set<() => void>();

  start(): this {
    this.game = newGame(readBest());
    sound.start();
    this.publish();
    return this;
  }

  stop(): this {
    if (!this.game) return this;
    this.game = null;
    road.flow = CALM;
    this.publish();
    return this;
  }

  /** Hop toward a direction on screen: x to the right, y up (across the bridge). */
  move(sx: number, sy: number): this {
    if (this.game) move(this.game, Math.sign(sx), Math.sign(sy));
    sound.wake(); // a key or a tap is what lets the browser start the audio
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

  snapshot = (): CrossHud => this.hud;

  private publish(): void {
    const g = this.game;
    const next: CrossHud = g
      ? {
          active: true,
          phase: g.phase,
          crossings: g.crossings,
          lives: g.lives,
          level: levelOf(g),
          time: Math.ceil(Math.max(0, g.timeLeft / g.timeTotal) * 40) / 40,
          knocks: g.knocks,
          best: Math.max(g.best, g.crossings),
          newBest: g.newBest,
          muted: sound.muted,
        }
      : IDLE;
    const cur = this.hud;
    const same = (Object.keys(next) as (keyof CrossHud)[]).every((k) => cur[k] === next[k]);
    if (same) return;
    this.hud = next;
    for (const fn of this.listeners) fn();
  }
}

export type { Crossing };
export const crossing = new Crossing();

const idle = () => IDLE;
const isActive = () => crossing.snapshot().active;
const notActive = () => false;

/** The HUD's view of the game. */
export function useCrossingHud(): CrossHud {
  return useSyncExternalStore(crossing.subscribe, crossing.snapshot, idle);
}

/** Whether a game is on; changes only when one starts or stops. */
export function useCrossingActive(): boolean {
  return useSyncExternalStore(crossing.subscribe, isActive, notActive);
}

const KEYS: Record<string, [number, number]> = {
  ArrowRight: [1, 0],
  ArrowLeft: [-1, 0],
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
  d: [1, 0],
  a: [-1, 0],
  w: [0, 1],
  s: [0, -1],
};

/**
 * Arrow keys or WASD hop, Enter plays again after a game over, Esc quits. A gamepad does the
 * same with the d-pad or stick (held, it keeps hopping like a held key), A or Start, and Back/Select.
 */
export function useCrossingKeys(active: boolean, onQuit: () => void): void {
  useGamepad(active, {
    onDir: (dx, dy) => crossing.move(dx, dy),
    repeat: true,
    onConfirm: () => crossing.game?.phase === "over" && crossing.start(),
    onBack: onQuit,
  });
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onQuit();
        return;
      }
      if (e.key === "Enter" && crossing.game?.phase === "over") {
        e.preventDefault();
        crossing.start();
        return;
      }
      const v = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
      if (!v) return;
      e.preventDefault(); // the arrows would scroll the page
      crossing.move(v[0], v[1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onQuit]);
}
