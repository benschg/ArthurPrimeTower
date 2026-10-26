"use client";

import { ARROWS, GameStore, useGameKeys } from "../gameStore";
import { sound, tune, type Note } from "../sound";
import { newGame, readBest, steer, step, type PacEvent, type PacGame, type Phase } from "./game";
import { getMaze, mazeText } from "./maze";

/** What the HUD shows. */
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
  muted: boolean;
};

const IDLE: PacHud = { active: false, phase: "ready", score: 0, lives: 0, level: 1, left: 0, dots: 0, best: 0, newBest: false, muted: false };

const SOUNDS: Record<Exclude<PacEvent, "dot">, Note[]> = {
  power: [220, 330, 440, 660].map((f, i) => ({ f, to: f * 1.5, at: i * 0.06, dur: 0.09, gain: 0.35 })),
  ghost: [{ f: 300, to: 1400, at: 0, dur: 0.28, gain: 0.35 }],
  caught: Array.from({ length: 9 }, (_, i) => ({ f: 640 * 0.82 ** i, to: 520 * 0.82 ** i, at: i * 0.12, dur: 0.12, type: "sawtooth" as const, gain: 0.3 })),
  clear: tune([523, 659, 784, 1047, 784, 1047, 1319], 0.11, 0.7),
  over: tune([392, 330, 262, 196], 0.26),
};

/** Runs the floor-13 game (see GameStore). Also reachable in the browser console as primeTower.pacman. */
class Pacman extends GameStore<PacGame, PacHud> {
  /** waka, waka: every other dot chirps up, the next one down */
  private waka = false;

  constructor() {
    super(IDLE);
  }

  start(): this {
    this.game = newGame(getMaze(), readBest());
    sound.start();
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
    sound.wake(); // a key or a tap is what lets the browser start the audio
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
    for (const e of g.events) this.play(e);
    g.events.length = 0;
    this.publish();
  }

  /** The board as text: lanes, walls, cores, the start and the ghosts' exits. */
  text(): string {
    return mazeText();
  }

  protected hudOf(g: PacGame): PacHud {
    return { active: true, phase: g.phase, score: g.score, lives: g.lives, level: g.level, left: g.left, dots: g.maze.dots, best: Math.max(g.best, g.score), newBest: g.newBest, muted: sound.muted };
  }

  private play(event: PacEvent): void {
    if (event !== "dot") {
      sound.notes(SOUNDS[event]);
      return;
    }
    this.waka = !this.waka;
    sound.notes([this.waka ? { f: 330, to: 620, at: 0, dur: 0.07, type: "triangle", gain: 0.6 } : { f: 620, to: 330, at: 0, dur: 0.07, type: "triangle", gain: 0.6 }]);
  }
}

export type { Pacman };
export const pacman = new Pacman();

/**
 * Arrow keys or WASD steer, Enter plays again after a game over, Esc quits. A gamepad does the
 * same with the d-pad or stick, A or Start, and Back/Select.
 */
export function usePacmanKeys(active: boolean, onQuit: () => void): void {
  useGameKeys(active, {
    over: () => pacman.game?.phase === "over",
    restart: () => pacman.start(),
    quit: onQuit,
    onKey: (k) => {
      const v = ARROWS[k];
      if (v) pacman.steer(v[0], v[1]);
      return !!v;
    },
    pad: { onDir: (dx, dy) => pacman.steer(dx, dy) },
  });
}
