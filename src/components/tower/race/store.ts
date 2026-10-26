"use client";

import { CALM, road } from "../crossing/road";
import { GameStore, useGameKeys } from "../gameStore";
import { sound, tune, type Note } from "../sound";
import { FINISH, newGame, readBest, START, steer, step, type RaceEvent, type RaceGame, type RacePhase } from "./game";

/** What the HUD shows. */
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
 * Runs the Hardbrücke sprint (see GameStore); the scene steps it after the road. Also reachable
 * in the browser console as primeTower.race.
 */
class Race extends GameStore<RaceGame, RaceHud> {
  constructor() {
    super(IDLE);
  }

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

  /** Advance by dt seconds. */
  frame(dt: number): void {
    const g = this.game;
    if (!g) return;
    step(g, Math.min(dt, 0.1));
    for (const e of g.events) sound.notes(SOUNDS[e]);
    g.events.length = 0;
    this.publish();
  }

  protected hudOf(g: RaceGame): RaceHud {
    const me = g.racers[0];
    return {
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
    };
  }
}

export type { Race };
export const race = new Race();

const LEFT = new Set(["ArrowLeft", "a"]);
const RIGHT = new Set(["ArrowRight", "d"]);
const BRAKE = new Set(["ArrowDown", "s"]);
const GAS = new Set(["ArrowUp", "w"]); // the car accelerates by itself; the keys just must not scroll the page

/**
 * Left and right change lane, down brakes while held, Enter races again once done, Esc quits.
 * A gamepad: d-pad or stick left and right, down or the left trigger to brake, A or Start, Back/Select.
 */
export function useRaceKeys(active: boolean, onQuit: () => void): void {
  useGameKeys(active, {
    over: () => race.game?.phase === "done",
    restart: () => race.start(),
    quit: onQuit,
    onKey: (k, e) => {
      if (LEFT.has(k) || RIGHT.has(k)) {
        if (!e.repeat) race.steer(LEFT.has(k) ? -1 : 1);
      } else if (BRAKE.has(k)) race.brake(true);
      else return GAS.has(k);
      return true;
    },
    onKeyUp: (k) => BRAKE.has(k) && race.brake(false),
    pad: { onDir: (dx) => dx && race.steer(dx), onDownHeld: (held) => race.brake(held) },
  });
}
