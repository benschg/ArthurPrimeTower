/**
 * The Hardbrücke sprint: one dash along the bridge against three rivals, weaving through the
 * traffic of the carriageway that heads along the bridge's bearing. The car accelerates by
 * itself; the player picks the lane and may brake. Running into a vehicle costs speed, not
 * the race: the car then sits behind it until the player moves over. Rules only: the scene draws the cars, the store runs the game.
 * Distances as on the road (crossing/road.ts): p is metres along the lane, z across the deck.
 */
import { KINDS, LANE_Z, LOOP, road, type Flow } from "../crossing/road";

/** Where the racers line up, and the finish line (they brake on the stretch after it). */
export const START = 40;
export const FINISH = LOOP - 45;
export const CAR_LEN = 4.3;
export const CAR_WIDTH = 1.8;

const SHIFT = 0.22; // seconds for a lane change
const BRAKE = 20; // m/s²
const BEST_KEY = "prime-tower-race-best";

/** Traffic for a race: enough to be in the way in every lane, buses included. */
const RACE_FLOW: Flow = { counts: [11, 13, 4], headway: 0.9, pace: 1 };

export type RacePhase = "count" | "race" | "done";
export type RaceEvent = "beep" | "go" | "shift" | "crash" | "finish";

export type Racer = {
  /** the lane it is in or moving to (0 is next to the median), the one it comes from, and how far the change has got (1 = there) */
  lane: number;
  from: number;
  shift: number;
  p: number;
  z: number;
  v: number;
  /** sideways speed: the car points the way it moves */
  vz: number;
  top: number;
  accel: number;
  /** race time at the finish line, 0 until then */
  finished: number;
  /** seconds left of the wobble after a crash, and of passing through things after a swipe */
  shaken: number;
  ghost: number;
  /** ran into the back of something: held to its speed until the lane is changed or clear */
  held: boolean;
};

export type RaceGame = {
  phase: RacePhase;
  /** seconds to the start */
  count: number;
  time: number;
  /** [0] is the player */
  racers: Racer[];
  braking: boolean;
  /** a lane change asked for during another */
  queued: number;
  crashes: number;
  /** the player's place: running during the race, final once done */
  place: number;
  /** best time so far in seconds, 0 if none */
  best: number;
  newBest: boolean;
  /** what happened since the last frame, for the sound */
  events: RaceEvent[];
};

/** Anything a racer can run into or has to get around. */
type Obstacle = { p: number; z: number; len: number; width: number; v: number };

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

const racer = (lane: number, p: number, top: number, accel: number): Racer => ({
  lane,
  from: lane,
  shift: 1,
  p,
  z: LANE_Z[lane],
  v: 0,
  vz: 0,
  top,
  accel,
  finished: 0,
  shaken: 0,
  ghost: 0,
  held: false,
});

const blockers = (g: RaceGame) => g.racers.map((r) => ({ dir: 1 as const, z: r.z, p: r.p, len: CAR_LEN }));

export function newGame(best: number): RaceGame {
  road.flow = RACE_FLOW;
  // clear the grid: vehicles where the racers line up shrink away
  for (const lane of road.lanes) {
    if (lane.dir !== 1) continue;
    for (const c of lane.list) if (c.p > START - 24 && c.p < START + 10) c.leaving = true;
  }
  const g: RaceGame = {
    phase: "count",
    count: 3,
    time: 0,
    // the player is quickest, so a clean run wins; each crash gives the rivals a second or so
    racers: [racer(1, START, 31, 8.5), racer(0, START, 27.5, 7.5), racer(2, START, 26.5, 7), racer(1, START - 9, 28.5, 7)],
    braking: false,
    queued: 0,
    crashes: 0,
    place: 1,
    best,
    newBest: false,
    events: ["beep"],
  };
  road.blockers = blockers(g);
  return g;
}

function change(g: RaceGame, r: Racer, d: number): void {
  const lane = Math.min(LANE_Z.length - 1, Math.max(0, r.lane + d));
  if (lane === r.lane) return;
  r.from = r.lane;
  r.lane = lane;
  r.shift = 0;
  r.held = false;
  if (r === g.racers[0]) g.events.push("shift");
}

/** Change lane: d = -1 toward the median (left on screen), +1 toward the bus lane. */
export function steer(g: RaceGame, d: number): void {
  if (g.phase !== "race" || g.racers[0].finished) return;
  if (g.racers[0].shift < 1) g.queued = d;
  else change(g, g.racers[0], d);
}

/** The nearest obstacle ahead in the lane at z, and the room up to it. */
function ahead(list: Obstacle[], z: number, p: number): { o: Obstacle; gap: number } | null {
  let best: { o: Obstacle; gap: number } | null = null;
  for (const o of list) {
    if (o.p <= p || Math.abs(o.z - z) > 1.7) continue;
    const gap = o.p - o.len / 2 - (p + CAR_LEN / 2);
    if (!best || gap < best.gap) best = { o, gap };
  }
  return best;
}

/** The speed that keeps a racer off the obstacle ahead. */
const follow = (near: { o: Obstacle; gap: number }, margin: number) => Math.max(0, near.o.v + (near.gap - margin) * 1.5);

/** A rival's driving: keep off whatever is ahead, and move over when the lane beside is clearer. */
function rival(g: RaceGame, r: Racer, others: Obstacle[]): number {
  const near = ahead(others, r.z, r.p);
  if (!near || near.gap > r.v * 0.9 + 6) return r.top;
  if (r.shift >= 1) {
    let pickLane = -1;
    let room = near.gap + 5;
    for (const c of [r.lane - 1, r.lane + 1]) {
      if (c < 0 || c >= LANE_Z.length) continue;
      const z = LANE_Z[c];
      // nothing alongside, nor closing in from behind
      if (others.some((o) => Math.abs(o.z - z) < 1.7 && o.p > r.p - 5 - Math.max(0, o.v - r.v) - o.len / 2 && o.p < r.p + 5 + o.len / 2)) continue;
      const free = ahead(others, z, r.p)?.gap ?? Infinity;
      if (free > room) {
        room = free;
        pickLane = c;
      }
    }
    if (pickLane >= 0) change(g, r, pickLane - r.lane);
  }
  return Math.min(r.top, follow(near, 3));
}

/** The player's car: flat out unless braking, or held behind what it ran into. */
function player(g: RaceGame, r: Racer, others: Obstacle[]): number {
  const want = g.braking ? 4 : r.top;
  if (!r.held) return want;
  const near = ahead(others, r.z, r.p);
  if (near && near.gap < 12) return Math.min(want, follow(near, 1.5));
  r.held = false;
  return want;
}

function drive(g: RaceGame, r: Racer, traffic: Obstacle[], dt: number): void {
  const me = r === g.racers[0];
  const others = traffic.concat(g.racers.filter((o) => o !== r).map((o) => ({ p: o.p, z: o.z, len: CAR_LEN, width: CAR_WIDTH, v: o.v })));

  if (r.finished) r.v = Math.max(0, r.v - 13 * dt);
  else if (g.phase !== "count") {
    const want = me ? player(g, r, others) : rival(g, r, others);
    r.v = want > r.v ? Math.min(want, r.v + r.accel * dt) : Math.max(want, r.v - BRAKE * dt);
  }

  if (me && r.shift >= 1 && g.queued) {
    change(g, r, g.queued);
    g.queued = 0;
  }
  const z0 = r.z;
  if (r.shift < 1) r.shift = Math.min(1, r.shift + dt / SHIFT);
  const t = r.shift * r.shift * (3 - 2 * r.shift);
  r.z = LANE_Z[r.from] + (LANE_Z[r.lane] - LANE_Z[r.from]) * t;
  r.vz = dt > 0 ? (r.z - z0) / dt : 0;
  r.p = Math.min(LOOP - 6, r.p + r.v * dt);
  if (r.p >= LOOP - 6) r.v = 0;
  r.shaken = Math.max(0, r.shaken - dt);

  if (me && g.phase === "race" && !r.finished) {
    if (r.ghost > 0) r.ghost -= dt;
    else {
      const o = others.find((o) => Math.abs(o.z - r.z) < (o.width + CAR_WIDTH) / 2 - 0.15 && Math.abs(o.p - r.p) < (o.len + CAR_LEN) / 2);
      if (o) {
        g.crashes += 1;
        g.queued = 0;
        r.shaken = 0.6;
        g.events.push("crash");
        const reach = (o.len + CAR_LEN) / 2;
        if (r.shift < 1 && o.p - r.p < reach - 1.2) {
          // swiped something alongside while changing lane: back to the lane it came from
          [r.from, r.lane] = [r.lane, r.from];
          r.shift = 1 - r.shift;
          r.v *= 0.75;
          r.ghost = 0.6;
        } else if (o.p > r.p) {
          // ran into the back of it: stay behind it until the player moves over
          r.v = Math.min(r.v, o.v * 0.8);
          r.p = o.p - reach - 0.4;
          r.held = true;
        } else r.ghost = 0.6;
      }
    }
  }
  if (!r.finished && r.p >= FINISH) r.finished = Math.max(g.time, 0.01);
}

export function step(g: RaceGame, dt: number): void {
  if (g.phase === "count") {
    const before = Math.ceil(g.count);
    g.count -= dt;
    if (g.count <= 0) {
      g.phase = "race";
      g.events.push("go");
    } else if (Math.ceil(g.count) < before) g.events.push("beep");
  } else if (g.phase === "race") g.time += dt;

  const traffic: Obstacle[] = [];
  for (const lane of road.lanes) {
    if (lane.dir !== 1) continue;
    for (const c of lane.list) if (c.shown > 0.6) traffic.push({ p: c.p, z: lane.z, len: c.len, width: KINDS[c.kind].width, v: c.v });
  }
  for (const r of g.racers) drive(g, r, traffic, dt);
  road.blockers = blockers(g);

  if (g.phase !== "race") return;
  const me = g.racers[0];
  g.place = 1 + g.racers.filter((o) => o !== me && o.p > me.p).length;
  if (me.finished) {
    g.phase = "done";
    g.braking = false;
    g.events.push("finish");
    if (!g.best || me.finished < g.best) {
      g.best = me.finished;
      g.newBest = true;
      writeBest(g.best);
    }
  }
}
