/**
 * Parametric model of the Prime Tower, built from published drawings.
 *
 * Coordinates: metres, East = +x, North = +y, origin at the tower centroid
 * (47.38610 N, 8.51727 E). The base octagon was measured from the vector
 * letting plans (3. OG, primetower.ch, 20 m scale bar); the height steps come
 * from the Gigon/Guyer plans and sections; floor-to-floor height from Doka's
 * formwork reference (3.35 m); neighbouring footprints from OpenStreetMap.
 *
 * The plan is an irregular octagon with two reflex corners: two rectangles
 * offset diagonally and merged. It does not taper; three facades are pushed
 * outward at floors 11, 17 and 26 so the tower broadens toward the top.
 */

export type Pt = [number, number];

export const FLOORS = 36; // above ground, 0 = ground floor
export const GROUND_HEIGHT = 6.7; // double-height lobby
export const TYP_HEIGHT = 3.35; // Doka: 3.35 m concreting sections
export const TOP_HEIGHT = 5.4; // 35th floor (Clouds) plus plant
export const TOWER_HEIGHT = GROUND_HEIGHT + 34 * TYP_HEIGHT + TOP_HEIGHT; // 126.0 m
export const BASEMENT_LEVELS = 2;
export const BASEMENT_HEIGHT = 3.4;

export function floorHeight(f: number): number {
  if (f === 0) return GROUND_HEIGHT;
  if (f === FLOORS - 1) return TOP_HEIGHT;
  return TYP_HEIGHT;
}

export function floorElevation(f: number): number {
  if (f === 0) return 0;
  return GROUND_HEIGHT + (f - 1) * TYP_HEIGHT;
}

/** Base facade polygon (floors 1–10), north-up, metres from centroid. Counter-clockwise. */
export const basePolygon: Pt[] = [
  [-19.26, -22.78], // V1 west corner (Diagonal side)
  [-14.76, -7.87], // V2 reflex
  [-16.24, 13.33], // V3
  [-2.84, 33.06], // V4 north corner
  [20.04, 19.44], // V5 east corner (Hardbrücke side)
  [14.77, 3.44], // V6 reflex
  [15.89, -9.26], // V7
  [2.42, -29.35], // V8 south corner (plaza / railway side)
];

// Edge indices (edge i runs from vertex i to i+1)
export const EDGE_NE = 2; // V3→V4 north-east facade
export const EDGE_SE = 3; // V4→V5 east / south-east facade (Hardbrücke)
export const EDGE_SW = 6; // V7→V8 south-west facade (plaza)
export const EDGE_W = 7; // V8→V1 west facade (Diagonal side)

function signedArea(p: Pt[]): number {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % p.length];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
}

export function polygonArea(p: Pt[]): number {
  return Math.abs(signedArea(p));
}

function lineIntersect(p1: Pt, d1: Pt, p2: Pt, d2: Pt): Pt {
  const det = d1[0] * d2[1] - d1[1] * d2[0];
  if (Math.abs(det) < 1e-9) return [p2[0], p2[1]];
  const t = ((p2[0] - p1[0]) * d2[1] - (p2[1] - p1[1]) * d2[0]) / det;
  return [p1[0] + d1[0] * t, p1[1] + d1[1] * t];
}

/** Push edge i of a polygon outward by d (negative = inward), extending the neighbouring edges. */
export function offsetEdge(poly: Pt[], i: number, d: number): Pt[] {
  const n = poly.length;
  const ccw = signedArea(poly) > 0;
  const a = poly[i];
  const b = poly[(i + 1) % n];
  const prev = poly[(i - 1 + n) % n];
  const next = poly[(i + 2) % n];
  const ex = b[0] - a[0];
  const ey = b[1] - a[1];
  const len = Math.hypot(ex, ey);
  // outward normal: for CCW polygons the outward normal is (ey, -ex)
  const nx = ((ccw ? ey : -ey) / len) * d;
  const ny = ((ccw ? -ex : ex) / len) * d;
  const a2: Pt = [a[0] + nx, a[1] + ny];
  const dir: Pt = [ex, ey];
  const newA = lineIntersect(prev, [a[0] - prev[0], a[1] - prev[1]], a2, dir);
  const newB = lineIntersect(next, [b[0] - next[0], b[1] - next[1]], a2, dir);
  const out = poly.map((p) => [p[0], p[1]] as Pt);
  out[i] = newA;
  out[(i + 1) % n] = newB;
  return out;
}

/** Uniformly grow a polygon by d (approximate, per-edge offset). */
export function growPolygon(poly: Pt[], d: number): Pt[] {
  let out = poly;
  for (let i = 0; i < poly.length; i++) out = offsetEdge(out, i, d);
  return out;
}

export type Stage = { from: number; to: number; polygon: Pt[]; label: string };

const withNE = offsetEdge(basePolygon, EDGE_NE, 1.3);
const withNESE = offsetEdge(withNE, EDGE_SE, 3.0);
const withAll = offsetEdge(withNESE, EDGE_W, 2.8);

export const stages: Stage[] = [
  { from: 0, to: 0, polygon: offsetEdge(basePolygon, EDGE_SE, -3.5), label: "Ground floor, recessed entrance porch" },
  { from: 1, to: 10, polygon: basePolygon, label: "Base plan, 1,600 m² inside the facade" },
  { from: 11, to: 16, polygon: withNE, label: "North-east facade steps out 1.3 m" },
  { from: 17, to: 25, polygon: withNESE, label: "Hardbrücke facade cantilevers 3 m" },
  { from: 26, to: 35, polygon: withAll, label: "West facade cantilevers 2.8 m" },
];

export function stageForFloor(f: number): Stage {
  return stages.find((s) => f >= s.from && f <= s.to) ?? stages[stages.length - 1];
}

/* ------------------------------------------------------------------ */
/* Structure                                                           */
/* ------------------------------------------------------------------ */

// Drawing frame (letting plan) → north-up frame. Drawing +x = bearing 32.7°, +y = bearing 122.7°.
const DA = (32.7 * Math.PI) / 180;
const E0 = -33.54;
const N0 = -13.61;
export function drawingToWorld([x, y]: Pt): Pt {
  return [Math.sin(DA) * x + Math.cos(DA) * y + E0, Math.cos(DA) * x - Math.sin(DA) * y + N0];
}
/** Rotation (radians, about Y) that aligns a box's local x axis with the drawing's x axis in three.js space. */
export const DRAWING_ROT_Y = Math.PI / 2 - DA;

export type Core = { name: string; center: Pt; size: [number, number] };

/** The three concrete cores, measured as bounding boxes in the drawing frame. */
export const cores: Core[] = [
  { name: "TK1/TK3 · stairs, 8 lifts", center: drawingToWorld([22.76, 23.96]), size: [19.6, 15.9] },
  { name: "Service core · WC, kitchens", center: drawingToWorld([32.86, 18.23]), size: [11.1, 13.2] },
  { name: "TK2 · fire stair, lifts", center: drawingToWorld([42.5, 12.8]), size: [12.6, 10.8] },
];

/** Perimeter columns ≈5.65 m apart, ~1 m inside the glass line. */
export function perimeterColumns(poly: Pt[], spacing = 5.65, inset = 1.0): Pt[] {
  const inner = growPolygon(poly, -inset);
  const out: Pt[] = [];
  const n = inner.length;
  for (let i = 0; i < n; i++) {
    const a = inner[i];
    const b = inner[(i + 1) % n];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const count = Math.max(1, Math.round(len / spacing));
    for (let k = 0; k < count; k++) {
      const t = (k + 0.5) / count;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

export type Strut = { from: [number, number, number]; to: [number, number, number] };

/** Inclined facade columns carrying each cantilever over three storeys. */
export function struts(): Strut[] {
  const out: Strut[] = [];
  const pushes: { stage: number; edge: number }[] = [
    { stage: 2, edge: EDGE_NE },
    { stage: 3, edge: EDGE_SE },
    { stage: 4, edge: EDGE_W },
  ];
  for (const { stage, edge } of pushes) {
    const prev = stages[stage - 1].polygon;
    const cur = stages[stage].polygon;
    const yTop = floorElevation(stages[stage].from);
    const yBot = yTop - 3 * TYP_HEIGHT;
    const a0 = prev[edge];
    const b0 = prev[(edge + 1) % prev.length];
    const a1 = cur[edge];
    const b1 = cur[(edge + 1) % cur.length];
    const n = 4;
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      const p0: Pt = [a0[0] + (b0[0] - a0[0]) * t, a0[1] + (b0[1] - a0[1]) * t];
      const p1: Pt = [a1[0] + (b1[0] - a1[0]) * t, a1[1] + (b1[1] - a1[1]) * t];
      out.push({ from: [p0[0], yBot, p0[1]], to: [p1[0], yTop, p1[1]] });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Site (OpenStreetMap footprints, metres from tower centroid)         */
/* ------------------------------------------------------------------ */

export type Building = {
  name: string;
  polygon: Pt[];
  height: number;
  floors: number;
  color: string;
  note?: string;
};

export const neighbours: Building[] = [
  {
    name: "Cubus",
    polygon: [
      [48.4, 61.9], [51.6, 59.3], [58.1, 54.0], [36.5, 21.6], [34.7, 22.7], [32.4, 24.3], [30.5, 25.5],
      [28.8, 26.6], [17.5, 34.0], [16.2, 37.6], [12.2, 48.7], [18.1, 50.9], [41.1, 59.4],
    ],
    height: 25,
    floors: 7,
    color: "#d8dde3",
    note: "Hardstrasse 221 · white-cement concrete",
  },
  {
    name: "Diagonal",
    polygon: [
      [-62.1, 22.4], [-54.9, 25.0], [-11.1, 40.4], [-5.6, 36.9], [-5.9, 36.5], [-12.8, 26.0], [-36.6, 17.4],
      [-54.5, 10.9], [-58.8, 12.7], [-60.3, 17.5],
    ],
    height: 21,
    floors: 5,
    color: "#8c6e5c",
    note: "Maagplatz 3 · listed 1920s industrial hall",
  },
  {
    name: "Platform",
    polygon: [
      [-37.7, -58.4], [-76.8, -43.2], [-80.1, -41.9], [-144.8, -16.1], [-147.3, -7.7], [-128.6, -0.3],
      [-101.9, 8.0], [-101.9, 8.9], [-95.4, 11.7], [-77.4, 16.8], [-67.1, 1.3], [-58.3, -18.7], [-54.5, -21.6],
      [-48.7, -25.2], [-42.3, -29.8], [-33.3, -39.1],
    ],
    height: 25,
    floors: 7,
    color: "#3a4753",
    note: "Maagplatz 1 · EY headquarters",
  },
  {
    name: "Lichthalle MAAG",
    polygon: [
      [-71.5, 80.0], [-74.3, 74.7], [-94.1, 39.8], [-84.1, 34.0], [-78.9, 42.7], [-70.7, 37.9], [-69.9, 39.5],
      [-68.2, 38.5], [-33.2, 51.1], [-32.5, 54.1], [-34.0, 55.6],
    ],
    height: 14,
    floors: 3,
    color: "#6f5f55",
    note: "Zahnradstrasse 22 · MAAG Halle event venue",
  },
  {
    name: "Parkhaus Pfingstweid",
    polygon: [
      [97.2, 116.2], [68.4, 137.3], [56.8, 143.3], [44.0, 155.1], [33.1, 163.0], [44.1, 177.0], [104.9, 132.7],
      [97.4, 121.8], [99.9, 120.2],
    ],
    height: 24,
    floors: 8,
    color: "#3e4a56",
    note: "Nearest public car park · 276 spaces",
  },
  {
    name: "Prime 2",
    polygon: [[-24.8, 209.7], [24.5, 173.9], [-11.3, 124.6], [-60.6, 160.4]],
    height: 26,
    floors: 7,
    color: "#46525e",
  },
  {
    name: "",
    polygon: [[68.2, -40.8], [91.2, -44.5], [84.9, -84.4], [61.2, -85.0]],
    height: 9,
    floors: 2,
    color: "#4a5560",
  },
  {
    name: "",
    polygon: [[-132.7, 10.6], [-148.7, 19.7], [-110.8, 163.6], [-62.0, 136.2], [-95.6, 76.4]],
    height: 32,
    floors: 10,
    color: "#3f4a55",
  },
];

/** Hardbrücke elevated road: centreline through (58, 0) at bearing 30°, deck ~9 m above ground. */
export const bridge = { center: [58, 0] as Pt, bearing: 30, length: 520, width: 28, deckHeight: 9 };

/** Bahnhof Hardbrücke platform footprint (OSM). */
export const stationPlatform: Pt[] = [[21.9, -74.2], [19.5, -73.0], [52.8, -19.5], [56.2, -19.4]];

/** Railway corridor: tracks run at bearing ~112° south-west of the tower. */
export const railway = { center: [0, -95] as Pt, bearing: 112, length: 700, tracks: 8, spacing: 4.5 };

/** Garage: two levels under tower and plaza, ramp from Zahnradstrasse at the north-east (OSM "Parkshaus Prime Tower"). */
export const garagePolygon: Pt[] = [
  [-42, -38], [24, -50], [46, -12], [43.1, 56.3], [19.3, 47.6], [15.0, 46.0], [-40, 18],
];
export const rampPolygon: Pt[] = [[15.0, 46.0], [19.3, 47.6], [43.1, 56.3], [50.4, 51.7], [34.9, 25.9], [18.9, 36.0]];

export function pointInPolygon([x, y]: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Parking bays on a grid aligned with the tower's long axis (bearing 34°), 2.5 × 5 m, double rows with 6 m aisles. */
export function parkingBays(): { x: number; z: number; rot: number }[] {
  const bays: { x: number; z: number; rot: number }[] = [];
  const ang = (34 * Math.PI) / 180; // bearing of the row direction
  const ux: Pt = [Math.sin(ang), Math.cos(ang)]; // along rows
  const uy: Pt = [Math.cos(ang), -Math.sin(ang)]; // across rows
  const bayW = 2.5;
  const bayL = 5;
  const aisle = 6.5;
  const moduleW = bayL * 2 + aisle;
  const coreBoxes = cores.map((c) => ({ c: c.center, r: Math.max(...c.size) / 2 + 1.5 }));
  for (let m = -6; m <= 6; m++) {
    for (const side of [-1, 1]) {
      const v = m * moduleW + side * (bayL / 2 + 0.2);
      for (let u = -70; u <= 70; u += bayW) {
        const E = ux[0] * u + uy[0] * v;
        const N = ux[1] * u + uy[1] * v;
        if (!pointInPolygon([E, N], garagePolygon)) continue;
        if (pointInPolygon([E, N], rampPolygon)) continue;
        if (coreBoxes.some((b) => Math.hypot(E - b.c[0], N - b.c[1]) < b.r)) continue;
        bays.push({ x: E, z: -N, rot: -ang });
      }
    }
  }
  return bays;
}
