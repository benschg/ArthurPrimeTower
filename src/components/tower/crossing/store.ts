"use client";

import { ARROWS, GameStore, useGameKeys } from "../gameStore";
import { sound, tune, type Note } from "../sound";
import { levelOf, move, newGame, readBest, step, type CrossEvent, type CrossGame, type CrossPhase } from "./game";
import { CALM, road } from "./road";

/** What the HUD shows. */
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
 * Runs the Hardbrücke game (see GameStore); the scene steps it after the road. Also reachable
 * in the browser console as primeTower.crossing.
 */
class Crossing extends GameStore<CrossGame, CrossHud> {
  constructor() {
    super(IDLE);
  }

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

  /** Advance by dt seconds. */
  frame(dt: number): void {
    const g = this.game;
    if (!g) return;
    step(g, Math.min(dt, 0.1));
    for (const e of g.events) sound.notes(SOUNDS[e]);
    g.events.length = 0;
    this.publish();
  }

  protected hudOf(g: CrossGame): CrossHud {
    return {
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
    };
  }
}

export type { Crossing };
export const crossing = new Crossing();

/**
 * Arrow keys or WASD hop, Enter plays again after a game over, Esc quits. A gamepad does the
 * same with the d-pad or stick (held, it keeps hopping like a held key), A or Start, and Back/Select.
 */
export function useCrossingKeys(active: boolean, onQuit: () => void): void {
  useGameKeys(active, {
    over: () => crossing.game?.phase === "over",
    restart: () => crossing.start(),
    quit: onQuit,
    onKey: (k) => {
      const v = ARROWS[k];
      if (v) crossing.move(v[0], v[1]);
      return !!v;
    },
    pad: { onDir: (dx, dy) => crossing.move(dx, dy), repeat: true },
  });
}
