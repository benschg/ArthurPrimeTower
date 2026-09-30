"use client";

import { useEffect, useSyncExternalStore } from "react";
import { newGame, readBest, steer, step, type PacGame, type Phase } from "./game";
import { getMaze, mazeText } from "./maze";

/** What the HUD shows; replaced (never mutated) when one of its values changes. */
export type PacHud = {
  active: boolean;
  phase: Phase;
  score: number;
  lives: number;
  level: number;
  left: number;
  dots: number;
  best: number;
  newBest: boolean;
};

const IDLE: PacHud = { active: false, phase: "ready", score: 0, lives: 0, level: 1, left: 0, dots: 0, best: 0, newBest: false };

/**
 * Runs the floor-13 game. The board steps it once per rendered frame and reads the actors
 * straight from `game`; React only hears about the few numbers the HUD shows.
 * Also reachable in the browser console as primeTower.pacman.
 */
class Pacman {
  game: PacGame | null = null;
  private hud: PacHud = IDLE;
  private listeners = new Set<() => void>();

  start(): this {
    this.game = newGame(getMaze(), readBest());
    this.publish();
    return this;
  }

  stop(): this {
    if (!this.game) return this;
    this.game = null;
    this.publish();
    return this;
  }

  /** Steer toward a direction on screen: x to the right, y up. */
  steer(sx: number, sy: number): this {
    if (this.game) steer(this.game, sx, sy);
    return this;
  }

  /** Advance by dt seconds, in slices short enough that nobody skips a cell centre. */
  frame(dt: number): void {
    const g = this.game;
    if (!g) return;
    let left = Math.min(dt, 0.12);
    while (left > 1e-5) {
      const s = Math.min(left, 1 / 60);
      step(g, s);
      left -= s;
    }
    this.publish();
  }

  /** The board as text: lanes, walls, cores, the start and the ghosts' exits. */
  text(): string {
    return mazeText();
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  snapshot = (): PacHud => this.hud;

  private publish(): void {
    const g = this.game;
    const next: PacHud = g
      ? { active: true, phase: g.phase, score: g.score, lives: g.lives, level: g.level, left: g.left, dots: g.maze.dots, best: Math.max(g.best, g.score), newBest: g.newBest }
      : IDLE;
    const cur = this.hud;
    const same = (Object.keys(next) as (keyof PacHud)[]).every((k) => cur[k] === next[k]);
    if (same) return;
    this.hud = next;
    for (const fn of this.listeners) fn();
  }
}

export type { Pacman };
export const pacman = new Pacman();

const idle = () => IDLE;
const isActive = () => pacman.snapshot().active;
const notActive = () => false;

/** The HUD's view of the game. */
export function usePacmanHud(): PacHud {
  return useSyncExternalStore(pacman.subscribe, pacman.snapshot, idle);
}

/** Whether a game is on; changes only when one starts or stops. */
export function usePacmanActive(): boolean {
  return useSyncExternalStore(pacman.subscribe, isActive, notActive);
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

/** Arrow keys or WASD steer, Enter plays again after a game over, Esc quits. */
export function usePacmanKeys(active: boolean, onQuit: () => void): void {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onQuit();
        return;
      }
      if (e.key === "Enter" && pacman.game?.phase === "over") {
        e.preventDefault();
        pacman.start();
        return;
      }
      const v = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
      if (!v) return;
      e.preventDefault(); // the arrows would scroll the page
      pacman.steer(v[0], v[1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onQuit]);
}
