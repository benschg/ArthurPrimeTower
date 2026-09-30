/**
 * The Hardbrücke game: hop a frog across the six lanes of the bridge, footway to footway,
 * then back again. Every crossing brings more traffic. Rules only: the scene draws the
 * frog and the road, the store runs the game.
 */
import { road, type Flow } from "./road";

/** z of each row the frog can sit on, near footway first: footway, three lanes, median, three lanes, footway. */
export const ROWS = [12.6, 10.2, 6.6, 3, 0, -3, -6.6, -10.2, -12.6];
const FAR = ROWS.length - 1;
/** Sideways hops are this long (metres), and go this many either side of the middle. */
export const STEP = 3;
export const COLS = 6;
export const LIVES = 3;

const HOP = 0.12; // seconds per hop
const RADIUS = 0.45; // the frog, for being run over
const BEST_KEY = "prime-tower-crossing-best";

export type CrossPhase = "ready" | "play" | "hit" | "over";
export type CrossEvent = "hop" | "hit" | "late" | "cross" | "over";

export type CrossGame = {
  phase: CrossPhase;
  /** seconds left of the ready or hit phase */
  wait: number;
  row: number;
  col: number;
  fromRow: number;
  fromCol: number;
  /** progress of the current hop, 1 when standing */
  hop: number;
  /** a move asked for in mid-hop */
  queued: [number, number] | null;
  /** where the frog is drawn: position on the deck, height of the hop, and the way it faces */
  x: number;
  z: number;
  lift: number;
  heading: number;
  /** the row this crossing started from (the goal is the other footway) */
  home: number;
  crossings: number;
  lives: number;
  /** times run over or out of time: the HUD shakes on each */
  knocks: number;
  timeLeft: number;
  timeTotal: number;
  best: number;
  newBest: boolean;
  /** what happened since the last frame, for the sound */
  events: CrossEvent[];
};

export function readBest(): number {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeBest(v: number) {
  try {
    window.localStorage.setItem(BEST_KEY, String(v));
  } catch {
    /* storage unavailable */
  }
}

/** Traffic for a level (1 is the first crossing): denser, closer and a little faster each time. */
export function rushFlow(level: number): Flow {
  const l = Math.min(level, 7);
  return { counts: [14 + 2 * l, 16 + 2 * l, 1 + Math.ceil(l / 2)], headway: 0.7, pace: 1 + 0.03 * l };
}

/** Seconds allowed for one crossing. */
const timeFor = (level: number) => Math.max(10, 16 - level);

export const levelOf = (g: CrossGame) => g.crossings + 1;

export function newGame(best: number): CrossGame {
  road.flow = rushFlow(1);
  const time = timeFor(1);
  return {
    phase: "ready",
    wait: 1.6,
    row: 0,
    col: 0,
    fromRow: 0,
    fromCol: 0,
    hop: 1,
    queued: null,
    x: 0,
    z: ROWS[0],
    lift: 0,
    heading: Math.PI,
    home: 0,
    crossings: 0,
    lives: LIVES,
    knocks: 0,
    timeLeft: time,
    timeTotal: time,
    best,
    newBest: false,
    events: [],
  };
}

function begin(g: CrossGame, dx: number, dy: number): void {
  const row = Math.min(FAR, Math.max(0, g.row + dy));
  const col = Math.min(COLS, Math.max(-COLS, g.col + dx));
  if (row === g.row && col === g.col) return;
  g.fromRow = g.row;
  g.fromCol = g.col;
  g.row = row;
  g.col = col;
  g.hop = 0;
  // rows run toward -z, and the frog's model faces +z
  g.heading = Math.atan2(col - g.fromCol, g.fromRow - row);
  g.events.push("hop");
}

/** Hop one step: dx to the right along the bridge, dy across it away from the near footway. */
export function move(g: CrossGame, dx: number, dy: number): void {
  if (g.phase === "ready") g.phase = "play"; // no need to sit out the countdown
  if (g.phase !== "play") return;
  if (g.hop < 1) g.queued = [dx, dy];
  else begin(g, dx, dy);
}

function knock(g: CrossGame, event: "hit" | "late"): void {
  g.lives -= 1;
  g.knocks += 1;
  g.phase = "hit";
  g.wait = 1.1;
  g.queued = null;
  g.events.push(event);
}

function place(g: CrossGame): void {
  const t = g.hop * g.hop * (3 - 2 * g.hop);
  g.x = (g.fromCol + (g.col - g.fromCol) * t) * STEP;
  g.z = ROWS[g.fromRow] + (ROWS[g.row] - ROWS[g.fromRow]) * t;
  g.lift = Math.sin(Math.PI * g.hop) * 0.7;
}

export function step(g: CrossGame, dt: number): void {
  if (g.phase === "over") return;
  if (g.phase !== "play") {
    g.wait -= dt;
    if (g.wait > 0) return;
    if (g.phase === "hit") {
      if (g.lives <= 0) {
        g.phase = "over";
        g.events.push("over");
        if (g.crossings > g.best) {
          g.best = g.crossings;
          g.newBest = true;
          writeBest(g.best);
        }
        return;
      }
      // back to the footway this crossing started from
      g.row = g.fromRow = g.home;
      g.fromCol = g.col;
      g.hop = 1;
      g.heading = g.home === 0 ? Math.PI : 0;
      g.timeLeft = g.timeTotal;
      place(g);
    }
    g.phase = "play";
    return;
  }

  g.timeLeft -= dt;
  if (g.hop < 1) {
    g.hop = Math.min(1, g.hop + dt / HOP);
    if (g.hop >= 1 && g.row === FAR - g.home) {
      // across: the next crossing goes back the other way, in heavier traffic
      g.crossings += 1;
      g.home = g.row;
      g.queued = null;
      g.timeLeft = g.timeTotal = timeFor(levelOf(g));
      road.flow = rushFlow(levelOf(g));
      g.events.push("cross");
    }
  }
  if (g.hop >= 1 && g.queued) {
    const [dx, dy] = g.queued;
    g.queued = null;
    begin(g, dx, dy);
  }
  place(g);
  if (road.hit(g.x, g.z, RADIUS)) knock(g, "hit");
  else if (g.timeLeft <= 0) knock(g, "late");
}
