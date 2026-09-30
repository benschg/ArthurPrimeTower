/**
 * The floor-13 game: eat every dot on the floor while four ghosts come up the lifts and
 * hunt you through the lanes. A power pellet turns the tables for a few seconds.
 *
 * Pure simulation on the maze grid (positions in cells); the board in scene/pacman.tsx
 * draws it and the store in store.ts runs it.
 */
import { idx, isLane, laneDistances, type Cell, type Maze } from "./maze";

export type Dir = { x: number; y: number };
export const DIRS: Dir[] = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
];
const STILL: Dir = { x: 0, y: 0 };

/**
 * wait: down in the shaft. rise: coming up through the lift door. leave: floating from the
 * lift to the lanes. hunt / fright: in the maze. eyes: eaten, flying home. sink: going back down.
 */
export type GhostMode = "wait" | "rise" | "leave" | "hunt" | "fright" | "eyes" | "sink";

export type Ghost = {
  id: number;
  x: number;
  y: number;
  dir: Dir;
  mode: GhostMode;
  /** seconds left in a timed mode (wait, rise, sink) */
  t: number;
};

export type Phase = "ready" | "play" | "caught" | "clear" | "over";

export type PacGame = {
  maze: Maze;
  pellets: Uint8Array;
  left: number;
  pac: { x: number; y: number; dir: Dir; want: Dir; facing: Dir };
  ghosts: Ghost[];
  score: number;
  lives: number;
  level: number;
  best: number;
  newBest: boolean;
  phase: Phase;
  /** seconds left in a timed phase (ready, caught, clear) */
  phaseT: number;
  /** seconds of fright left */
  fright: number;
  /** ghosts eaten on the current power pellet */
  combo: number;
  /** clock of the scatter/chase rhythm */
  wave: number;
  /** seconds played, for animation */
  clock: number;
  /** where the grid's x and y axes point on screen, so an arrow key means what it looks like */
  basis: { x: [number, number]; y: [number, number] };
};

export const LIVES = 3;
export const RISE_TIME = 0.7;
const SINK_TIME = 0.5;
const READY_TIME = 2.2;
const CAUGHT_TIME = 1.6;
const CLEAR_TIME = 2.4;
const PAC_SPEED = 6.4; // cells per second
const FRIGHT_SPEED = 3.7;
const LEAVE_SPEED = 4.5;
const EYES_SPEED = 15;
const SCATTER_TIME = 6;
const CHASE_TIME = 20;
const TOUCH = 0.62;

const ghostSpeed = (level: number) => Math.min(6.5, 5.5 + 0.25 * (level - 1));
export const frightTime = (level: number) => Math.max(2.5, 7 - 0.8 * (level - 1));
/** Seconds before ghost i leaves its lift; they come one after another, sooner on later levels. */
const releaseDelay = (i: number, level: number) => 0.6 + i * Math.max(1.6, 3.6 - 0.4 * (level - 1));

const BEST_KEY = "prime-tower-pacman-best";

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

function placeActors(g: PacGame): void {
  const m = g.maze;
  g.pac.x = m.start.x;
  g.pac.y = m.start.y;
  g.pac.dir = STILL;
  g.pac.want = STILL;
  g.ghosts = m.ghosts.map((h, i) => ({ id: i, x: h.lift.x, y: h.lift.y, dir: STILL, mode: "wait", t: releaseDelay(i, g.level) }));
  g.fright = 0;
  g.combo = 0;
  g.wave = 0;
}

export function newGame(maze: Maze, best: number): PacGame {
  const g: PacGame = {
    maze,
    pellets: maze.pellets.slice(),
    left: maze.dots,
    pac: { x: 0, y: 0, dir: STILL, want: STILL, facing: DIRS[2] },
    ghosts: [],
    score: 0,
    lives: LIVES,
    level: 1,
    best,
    newBest: false,
    phase: "ready",
    phaseT: READY_TIME,
    fright: 0,
    combo: 0,
    wave: 0,
    clock: 0,
    basis: { x: [1, 0], y: [0, -1] },
  };
  placeActors(g);
  return g;
}

/** Steer toward a direction on screen (x right, y up): the lane direction that looks most like it. */
export function steer(g: PacGame, sx: number, sy: number): void {
  let pick = DIRS[0];
  let score = -Infinity;
  for (const d of DIRS) {
    const px = d.x * g.basis.x[0] + d.y * g.basis.y[0];
    const py = d.x * g.basis.x[1] + d.y * g.basis.y[1];
    const s = px * sx + py * sy;
    if (s > score) {
      score = s;
      pick = d;
    }
  }
  g.pac.want = pick;
}

/** Distance from v to the next cell centre in direction d (a full cell when v is on a centre). */
function toNextCentre(v: number, d: number): number {
  return d > 0 ? Math.floor(v + 1e-6) + 1 - v : v - (Math.ceil(v - 1e-6) - 1);
}

/**
 * Move along the lanes. Directions change at cell centres only, where `turn` picks the way
 * on; returning STILL (or a walled direction) stops the mover on the centre.
 */
function travel(m: Maze, e: { x: number; y: number; dir: Dir }, dist: number, turn: (cx: number, cy: number) => Dir): void {
  let left = dist;
  for (let guard = 0; guard < 12 && left > 1e-6; guard++) {
    const cx = Math.round(e.x);
    const cy = Math.round(e.y);
    if (Math.abs(e.x - cx) < 1e-6 && Math.abs(e.y - cy) < 1e-6) {
      e.x = cx;
      e.y = cy;
      const d = turn(cx, cy);
      if ((d.x === 0 && d.y === 0) || !isLane(m, cx + d.x, cy + d.y)) {
        e.dir = STILL;
        return;
      }
      e.dir = d;
    }
    const gap = e.dir.x !== 0 ? toNextCentre(e.x, e.dir.x) : toNextCentre(e.y, e.dir.y);
    const s = Math.min(left, gap);
    e.x += e.dir.x * s;
    e.y += e.dir.y * s;
    left -= s;
    if (s >= gap - 1e-9) {
      e.x = Math.round(e.x);
      e.y = Math.round(e.y);
    }
  }
}

/** Fly in a straight line (through walls); true once the target is reached. */
function fly(e: { x: number; y: number }, to: Cell, dist: number): boolean {
  const dx = to.x - e.x;
  const dy = to.y - e.y;
  const d = Math.hypot(dx, dy);
  if (d <= dist) {
    e.x = to.x;
    e.y = to.y;
    return true;
  }
  e.x += (dx / d) * dist;
  e.y += (dy / d) * dist;
  return false;
}

const scattering = (g: PacGame) => g.wave % (SCATTER_TIME + CHASE_TIME) < SCATTER_TIME;

/** Where a hunting ghost wants to go. Each has its own idea, as in the arcade. */
function target(g: PacGame, gh: Ghost): Cell {
  const home = g.maze.ghosts[gh.id];
  if (scattering(g)) return home.corner;
  const p = g.pac;
  const px = Math.round(p.x);
  const py = Math.round(p.y);
  switch (gh.id) {
    case 1: // ambusher: four cells ahead of the player
      return { x: px + 4 * p.facing.x, y: py + 4 * p.facing.y };
    case 2: {
      // flanker: the point two ahead of the player, mirrored through the first ghost
      const lead = g.ghosts[0];
      const ax = px + 2 * p.facing.x;
      const ay = py + 2 * p.facing.y;
      return { x: 2 * ax - Math.round(lead.x), y: 2 * ay - Math.round(lead.y) };
    }
    case 3: // shy one: chases from afar, loses its nerve up close
      return Math.hypot(gh.x - p.x, gh.y - p.y) > 7 ? { x: px, y: py } : home.corner;
    default:
      return { x: px, y: py };
  }
}

// Lane distances to the player's cell, for the first ghost: it takes the true shortest way.
let trail: { maze: Maze; cell: number; dist: Int32Array } | null = null;
function trailTo(m: Maze, x: number, y: number): Int32Array {
  const cell = idx(m, x, y);
  if (!trail || trail.maze !== m || trail.cell !== cell) trail = { maze: m, cell, dist: laneDistances(m, [{ x, y }]) };
  return trail.dist;
}

function ghostTurn(g: PacGame, gh: Ghost, cx: number, cy: number): Dir {
  const m = g.maze;
  let options = DIRS.filter((d) => isLane(m, cx + d.x, cy + d.y) && !(d.x === -gh.dir.x && d.y === -gh.dir.y && (gh.dir.x !== 0 || gh.dir.y !== 0)));
  if (!options.length) options = DIRS.filter((d) => isLane(m, cx + d.x, cy + d.y));
  if (!options.length) return STILL;
  if (gh.mode === "fright") return options[Math.floor(Math.random() * options.length)];
  if (gh.id === 0 && !scattering(g)) {
    const dist = trailTo(m, Math.round(g.pac.x), Math.round(g.pac.y));
    return options.reduce((a, b) => (dist[idx(m, cx + b.x, cy + b.y)] < dist[idx(m, cx + a.x, cy + a.y)] ? b : a));
  }
  const t = target(g, gh);
  const far = (d: Dir) => (cx + d.x - t.x) ** 2 + (cy + d.y - t.y) ** 2;
  return options.reduce((a, b) => (far(b) < far(a) ? b : a));
}

function reverse(gh: Ghost): void {
  gh.dir = { x: -gh.dir.x, y: -gh.dir.y };
}

function addScore(g: PacGame, points: number): void {
  g.score += points;
}

function eat(g: PacGame): void {
  const m = g.maze;
  const cx = Math.round(g.pac.x);
  const cy = Math.round(g.pac.y);
  if (cx < 0 || cy < 0 || cx >= m.w || cy >= m.h) return;
  if (Math.abs(g.pac.x - cx) + Math.abs(g.pac.y - cy) > 0.45) return;
  const kind = g.pellets[idx(m, cx, cy)];
  if (!kind) return;
  g.pellets[idx(m, cx, cy)] = 0;
  g.left--;
  if (kind === 2) {
    addScore(g, 50);
    g.fright = frightTime(g.level);
    g.combo = 0;
    for (const gh of g.ghosts) {
      if (gh.mode === "hunt") {
        gh.mode = "fright";
        reverse(gh);
      }
    }
  } else {
    addScore(g, 10);
  }
  if (g.left <= 0) {
    addScore(g, 500 + 100 * g.level);
    g.phase = "clear";
    g.phaseT = CLEAR_TIME;
  }
}

function moveGhost(g: PacGame, gh: Ghost, dt: number): void {
  const home = g.maze.ghosts[gh.id];
  switch (gh.mode) {
    case "wait":
      gh.t -= dt;
      if (gh.t <= 0) {
        gh.mode = "rise";
        gh.t = RISE_TIME;
      }
      return;
    case "rise":
      gh.t -= dt;
      if (gh.t <= 0) gh.mode = "leave";
      return;
    case "leave":
      if (fly(gh, home.exit, LEAVE_SPEED * dt)) {
        gh.mode = "hunt";
        gh.dir = STILL;
      }
      return;
    case "eyes":
      if (fly(gh, home.lift, EYES_SPEED * dt)) {
        gh.mode = "sink";
        gh.t = SINK_TIME;
      }
      return;
    case "sink":
      gh.t -= dt;
      if (gh.t <= 0) {
        gh.mode = "wait";
        gh.t = 1.2;
      }
      return;
    default:
      travel(g.maze, gh, (gh.mode === "fright" ? FRIGHT_SPEED : ghostSpeed(g.level)) * dt, (cx, cy) => ghostTurn(g, gh, cx, cy));
  }
}

function meet(g: PacGame): void {
  for (const gh of g.ghosts) {
    if (gh.mode !== "hunt" && gh.mode !== "fright") continue;
    if (Math.abs(gh.x - g.pac.x) + Math.abs(gh.y - g.pac.y) > TOUCH) continue;
    if (gh.mode === "fright") {
      addScore(g, 200 * 2 ** g.combo);
      g.combo = Math.min(3, g.combo + 1);
      gh.mode = "eyes";
      continue;
    }
    g.phase = "caught";
    g.phaseT = CAUGHT_TIME;
    return;
  }
}

function play(g: PacGame, dt: number): void {
  const m = g.maze;
  const p = g.pac;
  // a reversal takes effect at once, anywhere in a lane
  if ((p.dir.x !== 0 || p.dir.y !== 0) && p.want.x === -p.dir.x && p.want.y === -p.dir.y) p.dir = p.want;
  travel(m, p, PAC_SPEED * dt, (cx, cy) => {
    if ((p.want.x !== 0 || p.want.y !== 0) && isLane(m, cx + p.want.x, cy + p.want.y)) return p.want;
    return p.dir;
  });
  if (p.dir.x !== 0 || p.dir.y !== 0) p.facing = p.dir;
  eat(g);
  if (g.phase !== "play") return;

  const wasScatter = scattering(g);
  if (g.fright > 0) {
    g.fright -= dt;
    if (g.fright <= 0) {
      g.fright = 0;
      for (const gh of g.ghosts) if (gh.mode === "fright") gh.mode = "hunt";
    }
  } else {
    // the scatter/chase rhythm pauses while the ghosts are frightened
    g.wave += dt;
    if (scattering(g) !== wasScatter) for (const gh of g.ghosts) if (gh.mode === "hunt") reverse(gh);
  }
  meet(g);
  if (g.phase !== "play") return;
  for (const gh of g.ghosts) moveGhost(g, gh, dt);
  meet(g);
}

/** Advance the game by dt seconds. */
export function step(g: PacGame, dt: number): void {
  g.clock += dt;
  switch (g.phase) {
    case "ready":
      g.phaseT -= dt;
      if (g.phaseT <= 0) g.phase = "play";
      return;
    case "play":
      play(g, dt);
      return;
    case "caught":
      g.phaseT -= dt;
      if (g.phaseT > 0) return;
      g.lives--;
      if (g.lives <= 0) {
        g.phase = "over";
        g.newBest = g.score > g.best;
        if (g.newBest) {
          g.best = g.score;
          writeBest(g.best);
        }
        return;
      }
      placeActors(g);
      g.phase = "ready";
      g.phaseT = READY_TIME;
      return;
    case "clear":
      g.phaseT -= dt;
      if (g.phaseT > 0) return;
      g.level++;
      g.pellets = g.maze.pellets.slice();
      g.left = g.maze.dots;
      placeActors(g);
      g.phase = "ready";
      g.phaseT = READY_TIME;
      return;
    default:
      return;
  }
}
