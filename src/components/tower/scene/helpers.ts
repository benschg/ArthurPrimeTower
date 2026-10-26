import * as THREE from "three";
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

/** For objects the pointer and the labels' occlusion tests should pass straight through. */
export const noRaycast = () => null;

export const AX_X = new THREE.Vector3(1, 0, 0);

export const AX_Y = new THREE.Vector3(0, 1, 0);

/**
 * A canvas texture drawn once by `draw` (sRGB). Glows, stripes and gradients that would cost a
 * file each are a few lines of 2D canvas instead.
 */
export function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  draw(c.getContext("2d")!, width, height);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
