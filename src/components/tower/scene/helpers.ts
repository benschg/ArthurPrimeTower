import { OPEN_GAP, type ExtractState } from "../Interiors";
import * as THREE from "three";
import { floorBands } from "@/data/tower";
import { perimeterOffsets, type Pt } from "../geometry";

/** Polygon in (East, North) → THREE.Shape in (x, y) that becomes (x, -z) after rotateX(-π/2). */
export function shapeFrom(pts: Pt[]): THREE.Shape {
  const s = new THREE.Shape();
  pts.forEach(([x, y], i) => (i === 0 ? s.moveTo(x, y) : s.lineTo(x, y)));
  s.closePath();
  return s;
}

/** Extrude a footprint upward from y=0 to y=height. */
export function extrudeUp(pts: Pt[], height: number, bevel = false): THREE.ExtrudeGeometry {
  const geo = new THREE.ExtrudeGeometry(shapeFrom(pts), {
    depth: height,
    bevelEnabled: bevel,
    bevelSize: 0.12,
    bevelThickness: 0.12,
    bevelSegments: 1,
    UVGenerator: perimeterUV(pts),
  });
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * UV generator for a footprint: u is the distance along the perimeter from vertex 0 (metres,
 * continuous around the corners in either traversal direction), v the height. Pane k of the
 * facade is then u in [1.5k, 1.5k + 1.5), which is how the blinds texture addresses panes.
 */
export function perimeterUV(pts: Pt[]): THREE.ExtrudeGeometryOptions["UVGenerator"] {
  const { cum, total } = perimeterOffsets(pts);
  const n = pts.length;
  const nearest = (x: number, y: number) => {
    let best = 0;
    let bd = Infinity;
    for (let i = 0; i < n; i++) {
      const d = (pts[i][0] - x) ** 2 + (pts[i][1] - y) ** 2;
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    return best;
  };
  return {
    generateTopUV(_g, v, a, b, c) {
      return [new THREE.Vector2(v[a * 3], v[a * 3 + 1]), new THREE.Vector2(v[b * 3], v[b * 3 + 1]), new THREE.Vector2(v[c * 3], v[c * 3 + 1])];
    },
    generateSideWallUV(_g, v, a, b, c, d) {
      // a and d sit on the segment's first contour vertex, b and c on the second
      const i = nearest(v[a * 3], v[a * 3 + 1]);
      const j = nearest(v[b * 3], v[b * 3 + 1]);
      const len = Math.hypot(v[b * 3] - v[a * 3], v[b * 3 + 1] - v[a * 3 + 1]);
      let ua: number;
      let ub: number;
      if (j === (i + 1) % n) {
        ua = cum[i];
        ub = cum[i] + len;
      } else {
        // contour reversed by ExtrudeGeometry: walk the perimeter backwards, wrapping at vertex 0
        ua = i === 0 ? total : cum[i];
        ub = ua - len;
      }
      return [new THREE.Vector2(ua, v[a * 3 + 2]), new THREE.Vector2(ub, v[b * 3 + 2]), new THREE.Vector2(ub, v[c * 3 + 2]), new THREE.Vector2(ua, v[d * 3 + 2])];
    },
  };
}

/** Deterministic pseudo-random value in [0, 1) for a texture cell. */
export function hash(i: number, j: number): number {
  const n = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

export function bandForFloor(floor: number) {
  return floorBands.find((b) => floor >= b.from && floor <= b.to);
}

export const noRaycast = () => null;

export const EXPLODE_GAP = 2.6;

export const AX_X = new THREE.Vector3(1, 0, 0);

export const AX_Y = new THREE.Vector3(0, 1, 0);

/** Yaw that lays the tower's long axis (bearing 34 deg) horizontally on screen when bound to the camera. */
export const PLATE_YAW = Math.atan2(-Math.cos((34 * Math.PI) / 180), Math.sin((34 * Math.PI) / 180));

export type ControlsLike = { target: THREE.Vector3; update: () => void };

/** How far floor f is lifted by the stack opening below it (either extract slot). */
export function liftAbove(f: number, ex: ExtractState, prev: ExtractState): number {
  const a = ex.floor >= 0 && f > ex.floor ? ex.open : 0;
  const b = prev.floor >= 0 && f > prev.floor ? prev.open : 0;
  return OPEN_GAP * Math.max(a, b);
}

/** Explode-view state shared by plates, rings and interiors. */
export type ExplodeState = {
  gap: number;
  thin: number;
  /** damped hovered floor (or -1) driving the dock-style bulge */
  hoverF: number;
  /** damped strength of the bulge, 0..1 */
  hoverAmt: number;
};

const BULGE_SIGMA = 1.6; // floors
const BULGE_SCALE = 0.32; // extra footprint scale at the centre
const BULGE_SPREAD = 2.2; // extra vertical room around the hovered floor, metres

/** Dock-style bulge: 0..1 for floor f around the hovered floor. */
export function bulge(f: number, x: ExplodeState): number {
  if (x.hoverAmt < 0.001 || x.hoverF < 0) return 0;
  const d = (f - x.hoverF) / BULGE_SIGMA;
  return x.hoverAmt * Math.exp(-0.5 * d * d);
}

/** Footprint scale for floor f in the exploded view. */
export function bulgeScale(f: number, x: ExplodeState): number {
  return 1 + BULGE_SCALE * bulge(f, x);
}

/** Extra vertical offset so the bulged floors have room: above the hovered floor up, below down. */
export function bulgeLift(f: number, x: ExplodeState): number {
  if (x.hoverAmt < 0.001 || x.hoverF < 0) return 0;
  const t = (f - x.hoverF) / (BULGE_SIGMA * 1.5);
  return BULGE_SPREAD * x.hoverAmt * Math.tanh(t);
}
