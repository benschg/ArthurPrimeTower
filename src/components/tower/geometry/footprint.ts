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

export function signedArea(p: Pt[]): number {
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

/** Unit outward normal of edge i (from vertex i to i+1), independent of winding. */
export function edgeOutwardNormal(poly: Pt[], i: number): Pt {
  const a = poly[i];
  const b = poly[(i + 1) % poly.length];
  const ex = b[0] - a[0];
  const ey = b[1] - a[1];
  const len = Math.hypot(ex, ey);
  const ccw = signedArea(poly) > 0;
  return ccw ? [ey / len, -ex / len] : [-ey / len, ex / len];
}

export function lineIntersect(p1: Pt, d1: Pt, p2: Pt, d2: Pt): Pt {
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

export type Stage = { from: number; to: number; polygon: Pt[]; label: { en: string; de: string } };

export const withNE = offsetEdge(basePolygon, EDGE_NE, 1.3);

export const withNESE = offsetEdge(withNE, EDGE_SE, 3.0);

export const withAll = offsetEdge(withNESE, EDGE_W, 2.8);

export const stages: Stage[] = [
  { from: 0, to: 0, polygon: offsetEdge(basePolygon, EDGE_SE, -3.5), label: { en: "Ground floor, recessed entrance porch", de: "Erdgeschoss, zurückversetzter Eingang" } },
  { from: 1, to: 10, polygon: basePolygon, label: { en: "Base plan, 1,600 m² inside the facade", de: "Grundplan, 1600 m² innerhalb der Fassade" } },
  { from: 11, to: 16, polygon: withNE, label: { en: "North-east facade steps out 1.3 m", de: "Nordostfassade springt 1.3 m vor" } },
  { from: 17, to: 25, polygon: withNESE, label: { en: "Hardbrücke facade cantilevers 3 m", de: "Hardbrücke-Fassade kragt 3 m aus" } },
  { from: 26, to: 35, polygon: withAll, label: { en: "West facade cantilevers 2.8 m", de: "Westfassade kragt 2.8 m aus" } },
];

export function stageForFloor(f: number): Stage {
  return stages.find((s) => f >= s.from && f <= s.to) ?? stages[stages.length - 1];
}

export function pointInPolygon([x, y]: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** True when vertex i of the polygon is a convex corner (independent of winding). */
export function isConvexVertex(poly: Pt[], i: number): boolean {
  const n = poly.length;
  const p = poly[(i - 1 + n) % n];
  const c = poly[i];
  const q = poly[(i + 1) % n];
  const cross = (c[0] - p[0]) * (q[1] - c[1]) - (c[1] - p[1]) * (q[0] - c[0]);
  return Math.sign(cross) === Math.sign(signedArea(poly));
}

/** Cumulative perimeter length at each vertex of a polygon (cum[i] = distance from vertex 0 to vertex i, cum[n] = total). */
export function perimeterOffsets(poly: Pt[]): { cum: number[]; total: number } {
  const cum = [0];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    cum.push(cum[i] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  return { cum, total: cum[poly.length] };
}
