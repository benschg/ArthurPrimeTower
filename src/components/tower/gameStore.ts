"use client";

import { useEffect, useEffectEvent, useSyncExternalStore } from "react";
import { useGamepad, type PadHandlers } from "./gamepad";
import { sound } from "./sound";

/** What every game's HUD shows besides its own numbers. */
export type BaseHud = { active: boolean; muted: boolean };

/**
 * What the stores of the games on the tower and the bridge share. The scene steps a game once
 * per rendered frame and reads its actors straight from `game`; React only hears about the few
 * numbers the HUD shows, through a snapshot that is replaced (never mutated) when one of them
 * changes. Each store is also reachable in the browser console (window.primeTower).
 */
export abstract class GameStore<G, H extends BaseHud> {
  game: G | null = null;
  private hud: H;
  private readonly idle: H;
  private readonly listeners = new Set<() => void>();

  constructor(idle: H) {
    this.idle = idle;
    this.hud = idle;
  }

  /** The HUD's numbers for a running game. */
  protected abstract hudOf(game: G): H;

  toggleSound(): this {
    sound.setMuted(!sound.muted);
    sound.wake();
    this.publish();
    return this;
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  snapshot = (): H => this.hud;

  idleSnapshot = (): H => this.idle;

  /** Tell the HUD, if one of its numbers changed. */
  protected publish(): void {
    const next = this.game ? this.hudOf(this.game) : this.idle;
    const cur = this.hud;
    if ((Object.keys(next) as (keyof H)[]).every((k) => cur[k] === next[k])) return;
    this.hud = next;
    for (const fn of this.listeners) fn();
  }
}

/** A game's HUD numbers. */
export function useGameHud<H extends BaseHud>(store: GameStore<unknown, H>): H {
  return useSyncExternalStore(store.subscribe, store.snapshot, store.idleSnapshot);
}

/** Whether a game is on; changes only when one starts or stops. */
export function useGameActive(store: GameStore<unknown, BaseHud>): boolean {
  return useSyncExternalStore(
    store.subscribe,
    () => store.snapshot().active,
    () => false,
  );
}

/** Arrow keys and WASD as screen directions: x to the right, y up. */
export const ARROWS: Record<string, [number, number]> = {
  ArrowRight: [1, 0],
  ArrowLeft: [-1, 0],
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
  d: [1, 0],
  a: [-1, 0],
  w: [0, 1],
  s: [0, -1],
};

/** A key's name, letters in lower case. */
const keyName = (e: KeyboardEvent) => (e.key.length === 1 ? e.key.toLowerCase() : e.key);

export type GameKeys = {
  /** the game has ended: Enter (A or Start on a pad) plays again */
  over: () => boolean;
  restart: () => void;
  /** Esc, or Back/Select on a pad */
  quit: () => void;
  /** any other key, by name; true when the game took it (the page then does not, so the arrows do not scroll) */
  onKey: (key: string, e: KeyboardEvent) => boolean;
  onKeyUp?: (key: string) => void;
  /** the game's own use of a gamepad's d-pad, stick and trigger */
  pad: Pick<PadHandlers, "onDir" | "repeat" | "onDownHeld">;
};

/** The keyboard and gamepad while a game is on. Modified keys (Ctrl, Cmd, Alt) are left to the browser. */
export function useGameKeys(active: boolean, keys: GameKeys): void {
  useGamepad(active, { ...keys.pad, onConfirm: () => keys.over() && keys.restart(), onBack: keys.quit });
  const down = useEffectEvent((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = keyName(e);
    if (k === "Escape") {
      e.preventDefault();
      keys.quit();
    } else if (k === "Enter" && keys.over()) {
      e.preventDefault();
      keys.restart();
    } else if (keys.onKey(k, e)) e.preventDefault();
  });
  const up = useEffectEvent((e: KeyboardEvent) => keys.onKeyUp?.(keyName(e)));
  useEffect(() => {
    if (!active) return;
    const onDown = (e: KeyboardEvent) => down(e);
    const onUp = (e: KeyboardEvent) => up(e);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [active]);
}
