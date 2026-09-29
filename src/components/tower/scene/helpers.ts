import { OPEN_GAP, type ExtractState } from "../Interiors";
import * as THREE from "three";
import { floorBands } from "@/data/tower";
import type { Pt } from "../geometry";

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
    UVGenerator: WorldUV,
  });
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

/** UV generator that maps facade walls in world metres (u along the wall, v = height). */
export const WorldUV: THREE.ExtrudeGeometryOptions["UVGenerator"] = {
  generateTopUV(_g, v, a, b, c) {
    return [new THREE.Vector2(v[a * 3], v[a * 3 + 1]), new THREE.Vector2(v[b * 3], v[b * 3 + 1]), new THREE.Vector2(v[c * 3], v[c * 3 + 1])];
  },
  generateSideWallUV(_g, v, a, b, c, d) {
    const ax = v[a * 3], ay = v[a * 3 + 1], az = v[a * 3 + 2];
    const bx = v[b * 3], by = v[b * 3 + 1], bz = v[b * 3 + 2];
    const cz = v[c * 3 + 2];
    const dz = v[d * 3 + 2];
    const len = Math.hypot(bx - ax, by - ay);
    // u runs along the wall segment, seeded by the segment's start position so mullions stay continuous
    const u0 = (ax + ay) * 0.37;
    return [new THREE.Vector2(u0, az), new THREE.Vector2(u0 + len, bz), new THREE.Vector2(u0 + len, cz), new THREE.Vector2(u0, dz)];
  },
};

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
