import { growPolygon, type Pt } from "./footprint";

// Drawing frame (letting plan) → north-up frame. Drawing +x = bearing 32.7°, +y = bearing 122.7°.
export const DA = (32.7 * Math.PI) / 180;

export const E0 = -33.54;

export const N0 = -13.61;

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

/** Inverse of drawingToWorld: world (East, North) back into the letting-plan drawing frame. */
export function worldToDrawing([e, n]: Pt): Pt {
  const dx = e - E0;
  const dy = n - N0;
  return [Math.sin(DA) * dx + Math.cos(DA) * dy, Math.cos(DA) * dx - Math.sin(DA) * dy];
}

/** Core bounding boxes in the drawing frame: [x0, y0, x1, y1]. */
export function coreBoxesDrawing(): [number, number, number, number][] {
  return cores.map((c) => {
    const [cx, cy] = worldToDrawing(c.center);
    return [cx - c.size[0] / 2, cy - c.size[1] / 2, cx + c.size[0] / 2, cy + c.size[1] / 2];
  });
}
