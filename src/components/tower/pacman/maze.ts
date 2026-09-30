/**
 * The board for the floor-13 game: a maze carved into the floor's real plan. The grid lies
 * in the letting-plan drawing frame, where the cores and lift banks are axis-aligned. Lanes
 * and walls are one cell wide; the facade and the three cores bound the maze, and the lifts
 * inside the cores are where the ghosts come from.
 *
 * Carving is seeded, so the board is the same on every visit.
 */
import { coreBoxesDrawing, growPolygon, pointInPolygon, stageForFloor, worldToDrawing, type Pt } from "../geometry";
import { LIFT_SHAFTS } from "../interiorLayout";

export const PAC_FLOOR = 13;
/** Grid pitch in metres. */
export const CELL = 1.9;
/** Lane centres keep this far inside the glass line, so the player never hangs over the edge. */
const EDGE_CLEAR = 0.95;
/**
 * The cores are measured as bounding boxes; a lane may bite this far into one. Without it
 * the diagonal facade pinches the ring shut at the corners of the main core.
 */
const CORE_SLACK = 0.45;
/** A wall is opened when that saves at least this many steps: it closes the big loops. */
const SHORTCUT_GAIN = 16;
/** Lift shafts (indices into LIFT_SHAFTS) the four ghosts use: both banks and the fire lift. */
const GHOST_LIFTS = [1, 6, 8, 2];

export type Cell = { x: number; y: number };

export type Maze = {
  w: number;
  h: number;
  /** Drawing-frame coordinates of the centre of cell (0, 0). */
  x0: number;
  y0: number;
  /** 1 where a cell is a lane. */
  lane: Uint8Array;
  /** 1 where a cell lies wholly on the floor plate, so a wall block can stand on it. */
  floor: Uint8Array;
  /** 1 where a cell is part of a core. */
  core: Uint8Array;
  /** Pellets at the start of a level: 1 = dot, 2 = power pellet. */
  pellets: Uint8Array;
  dots: number;
  start: Cell;
  /** Every lift shaft in grid coordinates (fractional), for drawing the doors. */
  lifts: Cell[];
  /** Per ghost: its lift, the lane cell where it joins the maze, and its scatter corner. */
  ghosts: { lift: Cell; exit: Cell; corner: Cell }[];
};

export const idx = (m: { w: number }, x: number, y: number) => y * m.w + x;

export function isLane(m: Maze, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < m.w && y < m.h && m.lane[y * m.w + x] === 1;
}

/** Small deterministic generator (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STEPS: Cell[] = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
];

function lanesAround(m: Maze, x: number, y: number): number {
  let n = 0;
  for (const s of STEPS) if (isLane(m, x + s.x, y + s.y)) n++;
  return n;
}

/** Label connected lane regions; returns the labels and the size of each region. */
function regions(m: Maze): { label: Int32Array; sizes: number[] } {
  const label = new Int32Array(m.w * m.h).fill(-1);
  const sizes: number[] = [];
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      if (!m.lane[idx(m, x, y)] || label[idx(m, x, y)] >= 0) continue;
      const id = sizes.length;
      let size = 0;
      const queue = [idx(m, x, y)];
      label[queue[0]] = id;
      while (queue.length) {
        const c = queue.pop() as number;
        size++;
        const cx = c % m.w;
        const cy = (c - cx) / m.w;
        for (const s of STEPS) {
          if (!isLane(m, cx + s.x, cy + s.y)) continue;
          const k = idx(m, cx + s.x, cy + s.y);
          if (label[k] < 0) {
            label[k] = id;
            queue.push(k);
          }
        }
      }
      sizes.push(size);
    }
  }
  return { label, sizes };
}

/** Steps along the lanes from the given cells to every other lane cell (-1 where unreachable). */
export function laneDistances(m: Maze, from: Cell[]): Int32Array {
  const dist = new Int32Array(m.w * m.h).fill(-1);
  let frontier: number[] = [];
  for (const c of from) {
    if (!isLane(m, c.x, c.y)) continue;
    dist[idx(m, c.x, c.y)] = 0;
    frontier.push(idx(m, c.x, c.y));
  }
  while (frontier.length) {
    const next: number[] = [];
    for (const c of frontier) {
      const cx = c % m.w;
      const cy = (c - cx) / m.w;
      for (const s of STEPS) {
        if (!isLane(m, cx + s.x, cy + s.y)) continue;
        const k = idx(m, cx + s.x, cy + s.y);
        if (dist[k] < 0) {
          dist[k] = dist[c] + 1;
          next.push(k);
        }
      }
    }
    frontier = next;
  }
  return dist;
}

/** True if turning these cells into lanes would leave a 2 x 2 open square somewhere. */
function opensSquare(m: Maze, cells: number[]): boolean {
  const on = (x: number, y: number) => isLane(m, x, y) || cells.includes(idx(m, x, y));
  for (const c of cells) {
    const cx = c % m.w;
    const cy = (c - cx) / m.w;
    for (const [ax, ay] of [
      [0, 0],
      [-1, 0],
      [0, -1],
      [-1, -1],
    ]) {
      if (on(cx + ax, cy + ay) && on(cx + ax + 1, cy + ay) && on(cx + ax, cy + ay + 1) && on(cx + ax + 1, cy + ay + 1)) return true;
    }
  }
  return false;
}

/** Carve one candidate board with the lattice shifted by (ox, oy) metres. */
function carve(ox: number, oy: number, seed: number): Maze {
  const outline = stageForFloor(PAC_FLOOR).polygon.map(worldToDrawing);
  const reach = growPolygon(stageForFloor(PAC_FLOOR).polygon, -EDGE_CLEAR).map(worldToDrawing);
  const cores = coreBoxesDrawing();
  const minX = Math.min(...outline.map((p) => p[0]));
  const maxX = Math.max(...outline.map((p) => p[0]));
  const minY = Math.min(...outline.map((p) => p[1]));
  const maxY = Math.max(...outline.map((p) => p[1]));
  const x0 = minX - CELL + ox;
  const y0 = minY - CELL + oy;
  const w = Math.ceil((maxX - x0) / CELL) + 2;
  const h = Math.ceil((maxY - y0) / CELL) + 2;
  const m: Maze = {
    w,
    h,
    x0,
    y0,
    lane: new Uint8Array(w * h),
    floor: new Uint8Array(w * h),
    core: new Uint8Array(w * h),
    pellets: new Uint8Array(w * h),
    dots: 0,
    start: { x: 0, y: 0 },
    lifts: [],
    ghosts: [],
  };

  // Which cells can hold a lane: the centre clear of the glass and outside the cores.
  const free = new Uint8Array(w * h);
  const half = CELL / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cx = x0 + x * CELL;
      const cy = y0 + y * CELL;
      const corners: Pt[] = [
        [cx - half, cy - half],
        [cx + half, cy - half],
        [cx + half, cy + half],
        [cx - half, cy + half],
      ];
      if (corners.every((p) => pointInPolygon(p, outline))) m.floor[idx(m, x, y)] = 1;
      if (!pointInPolygon([cx, cy], outline)) continue;
      const inCore = cores.some(([a, b, c, d]) => cx > a + CORE_SLACK && cx < c - CORE_SLACK && cy > b + CORE_SLACK && cy < d - CORE_SLACK);
      if (inCore) m.core[idx(m, x, y)] = 1;
      else if (pointInPolygon([cx, cy], reach)) free[idx(m, x, y)] = 1;
    }
  }
  const isFree = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && free[idx(m, x, y)] === 1;
  const neighbours = (c: number) => {
    const cx = c % w;
    const cy = (c - cx) / w;
    return STEPS.filter((s) => isFree(cx + s.x, cy + s.y)).map((s) => idx(m, cx + s.x, cy + s.y));
  };

  // Depth-first carving on the odd lattice: nodes two cells apart, the cell between is the door.
  const rand = rng(seed);
  for (let sy = 1; sy < h; sy += 2) {
    for (let sx = 1; sx < w; sx += 2) {
      if (!isFree(sx, sy) || m.lane[idx(m, sx, sy)]) continue;
      m.lane[idx(m, sx, sy)] = 1;
      const stack: Cell[] = [{ x: sx, y: sy }];
      while (stack.length) {
        const c = stack[stack.length - 1];
        const options = STEPS.filter((s) => isFree(c.x + s.x, c.y + s.y) && isFree(c.x + 2 * s.x, c.y + 2 * s.y) && !m.lane[idx(m, c.x + 2 * s.x, c.y + 2 * s.y)]);
        if (!options.length) {
          stack.pop();
          continue;
        }
        const s = options[Math.floor(rand() * options.length)];
        m.lane[idx(m, c.x + s.x, c.y + s.y)] = 1;
        m.lane[idx(m, c.x + 2 * s.x, c.y + 2 * s.y)] = 1;
        stack.push({ x: c.x + 2 * s.x, y: c.y + 2 * s.y });
      }
    }
  }

  // Braid: a dead end gets a second way out wherever one wall separates it from another lane.
  for (let y = 1; y < h; y += 2) {
    for (let x = 1; x < w; x += 2) {
      if (!m.lane[idx(m, x, y)] || lanesAround(m, x, y) !== 1) continue;
      const o = STEPS.filter((s) => isFree(x + s.x, y + s.y) && !m.lane[idx(m, x + s.x, y + s.y)] && isLane(m, x + 2 * s.x, y + 2 * s.y));
      if (o.length) {
        const s = o[Math.floor(rand() * o.length)];
        m.lane[idx(m, x + s.x, y + s.y)] = 1;
      }
    }
  }

  // Join separate regions by the shortest way through the walls between them. The lattice
  // cannot follow the diagonal facade past a core corner; these stepped paths can.
  for (let pass = 0; pass < 12; pass++) {
    const { label, sizes } = regions(m);
    if (sizes.length <= 1) break;
    const main = sizes.indexOf(Math.max(...sizes));
    const prev = new Int32Array(w * h).fill(-2);
    let frontier: number[] = [];
    for (let i = 0; i < label.length; i++) {
      if (label[i] === main) {
        prev[i] = -1;
        frontier.push(i);
      }
    }
    let found = -1;
    while (frontier.length && found < 0) {
      const next: number[] = [];
      for (const c of frontier) {
        for (const k of neighbours(c)) {
          if (m.lane[k]) {
            if (label[k] !== main && !m.lane[c]) found = c;
            continue;
          }
          if (prev[k] === -2) {
            prev[k] = c;
            next.push(k);
          }
        }
        if (found >= 0) break;
      }
      frontier = next;
    }
    if (found < 0) break;
    for (let c = found; c >= 0 && !m.lane[c]; c = prev[c]) m.lane[c] = 1;
  }
  {
    const { label, sizes } = regions(m);
    const keep = sizes.indexOf(Math.max(...sizes));
    for (let i = 0; i < m.lane.length; i++) if (m.lane[i] && label[i] !== keep) m.lane[i] = 0;
  }

  // Close loops: open a wall (up to three cells thick) wherever it turns a long way round
  // into a short one. This is what makes the lanes a ring around the cores.
  for (let pass = 0; pass < 10; pass++) {
    const cache = new Map<number, Int32Array>();
    const from = (c: number) => {
      let d = cache.get(c);
      if (!d) {
        d = laneDistances(m, [{ x: c % w, y: (c - (c % w)) / w }]);
        cache.set(c, d);
      }
      return d;
    };
    let best: { gain: number; cells: number[] } | null = null;
    const consider = (cells: number[]) => {
      const a = neighbours(cells[0]).filter((k) => m.lane[k]);
      const b = neighbours(cells[cells.length - 1]).filter((k) => m.lane[k]);
      for (const p of a) {
        for (const q of b) {
          if (p === q) continue;
          const gain = from(p)[q] - (cells.length + 1);
          if (gain >= SHORTCUT_GAIN && (!best || gain > best.gain) && !opensSquare(m, cells)) best = { gain, cells };
        }
      }
    };
    for (let c = 0; c < w * h; c++) {
      if (!free[c] || m.lane[c]) continue;
      consider([c]);
      for (const d of neighbours(c)) {
        if (m.lane[d]) continue;
        consider([c, d]);
        for (const e of neighbours(d)) if (!m.lane[e] && e !== c) consider([c, d, e]);
      }
    }
    if (!best) break;
    for (const c of (best as { cells: number[] }).cells) m.lane[c] = 1;
  }

  // Fill the dead ends that are left (repeatedly: filling one can expose the next).
  for (let changed = true; changed; ) {
    changed = false;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (m.lane[idx(m, x, y)] && lanesAround(m, x, y) <= 1) {
          m.lane[idx(m, x, y)] = 0;
          changed = true;
        }
      }
    }
  }

  const lanes: Cell[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m.lane[idx(m, x, y)]) lanes.push({ x, y });
  if (!lanes.length) return m;

  // Ghosts: each floats from its lift to the nearest lane cell, and scatters to a far corner.
  m.lifts = LIFT_SHAFTS.map(([lx, ly]) => ({ x: (lx - x0) / CELL, y: (ly - y0) / CELL }));
  const nearest = (p: Cell, taken: Cell[]) => {
    let pick = lanes[0];
    let bd = Infinity;
    for (const c of lanes) {
      if (taken.some((t) => t.x === c.x && t.y === c.y)) continue;
      const d = (c.x - p.x) ** 2 + (c.y - p.y) ** 2;
      if (d < bd) {
        bd = d;
        pick = c;
      }
    }
    return pick;
  };
  const mid = { x: lanes.reduce((a, c) => a + c.x, 0) / lanes.length, y: lanes.reduce((a, c) => a + c.y, 0) / lanes.length };
  const extreme = (dx: number, dy: number) => lanes.reduce((far, c) => ((c.x - mid.x) * dx + (c.y - mid.y) * dy > (far.x - mid.x) * dx + (far.y - mid.y) * dy ? c : far), lanes[0]);
  const corners = [extreme(1, -1), extreme(-1, 1), extreme(1, 1), extreme(-1, -1)];
  const exits: Cell[] = [];
  m.ghosts = GHOST_LIFTS.map((li, i) => {
    const lift = m.lifts[li];
    const exit = nearest(lift, exits);
    exits.push(exit);
    return { lift, exit, corner: corners[i] };
  });

  // The player starts as far from the ghosts' exits as the lanes allow.
  const dist = laneDistances(m, exits);
  m.start = lanes.reduce((far, c) => (dist[idx(m, c.x, c.y)] > dist[idx(m, far.x, far.y)] ? c : far), lanes[0]);

  // A dot in every lane cell, and a power pellet at each end of the floor.
  for (const c of lanes) m.pellets[idx(m, c.x, c.y)] = 1;
  m.pellets[idx(m, m.start.x, m.start.y)] = 0;
  for (const c of [extreme(1, 0), extreme(-1, 0), extreme(0, 1), extreme(0, -1)]) {
    if (c.x === m.start.x && c.y === m.start.y) continue;
    m.pellets[idx(m, c.x, c.y)] = 2;
  }
  m.dots = m.pellets.reduce((a, v) => a + (v ? 1 : 0), 0);
  return m;
}

let cached: Maze | null = null;

/**
 * The floor-13 board. The plan is irregular, so the lattice is tried at a few offsets and the
 * one that fits the most lanes between the facade and the cores wins.
 */
export function getMaze(): Maze {
  if (cached) return cached;
  let best: Maze | null = null;
  for (let a = 0; a < 4; a++) {
    for (let b = 0; b < 4; b++) {
      const m = carve((a * CELL) / 2, (b * CELL) / 2, 13);
      if (!best || m.dots > best.dots) best = m;
    }
  }
  cached = best as Maze;
  return cached;
}

/** The board as text, for the console and the probe script. */
export function mazeText(m: Maze = getMaze()): string {
  const rows: string[] = [];
  for (let y = 0; y < m.h; y++) {
    let row = "";
    for (let x = 0; x < m.w; x++) {
      const i = idx(m, x, y);
      if (m.start.x === x && m.start.y === y) row += "P";
      else if (m.ghosts.some((g) => g.exit.x === x && g.exit.y === y)) row += "G";
      else if (m.pellets[i] === 2) row += "O";
      else if (m.lane[i]) row += ".";
      else if (m.core[i]) row += "%";
      else if (m.floor[i]) row += "#";
      else row += " ";
    }
    rows.push(row);
  }
  return rows.join("\n");
}
