/**
 * Interior layout for the exploded view, derived from the 31st-floor (Homburger) plan:
 * cellular offices along every facade with a ring corridor behind them, meeting rooms in
 * the convex corners, two banks of four lifts facing a lobby in the main core, a fire lift
 * and stairs in the north-east core. The ground floor is a lobby, 34 a conference floor,
 * 35 the Clouds restaurant.
 *
 * Every piece is an instance of a unit box or unit cylinder, so the whole tower renders
 * with one draw call per kind. Coordinates: world East/North; y is relative to the floor.
 */
import {
  coreBoxesDrawing,
  DRAWING_ROT_Y,
  drawingToWorld,
  edgeOutwardNormal,
  FLOORS,
  isConvexVertex,
  perimeterColumns,
  stageForFloor,
  worldToDrawing,
  type Pt,
} from "./geometry";

export type Inst = { f: number; e: number; n: number; y: number; rot: number; sx: number; sy: number; sz: number };

export const KINDS = [
  "partition",
  "corridorWall",
  "door",
  "desk",
  "chairSeat",
  "chairBack",
  "screen",
  "table",
  "roundTable",
  "coreWall",
  "column",
  "liftShaft",
  "liftDoor",
  "stairStep",
  "reception",
  "lounge",
  "liftCable",
  "liftCar",
] as const;
export type Kind = (typeof KINDS)[number];

export const INTERIOR_HEIGHT = 2.7; // clear height under the slab
export const INTERIOR_BASE = 0.56; // top of the thin floor plate in the exploded view

const OFFICE_DEPTH = 5.2;
const CELL = 4.7;

/** Rotation about Y so a box's local x runs along direction (dE, dN). */
const rotFor = (dE: number, dN: number) => Math.atan2(dN, dE);

function makeStore(): Record<Kind, Inst[]> {
  const o = {} as Record<Kind, Inst[]>;
  for (const k of KINDS) o[k] = [];
  return o;
}

const coreBoxes = coreBoxesDrawing();
function inCore(e: number, n: number, margin = 0.8): boolean {
  const [x, y] = worldToDrawing([e, n]);
  return coreBoxes.some(([x0, y0, x1, y1]) => x >= x0 - margin && x <= x1 + margin && y >= y0 - margin && y <= y1 + margin);
}

function floorKind(f: number): "lobby" | "office" | "conference" | "restaurant" {
  if (f === 0) return "lobby";
  if (f === 34) return "conference";
  if (f === 35) return "restaurant";
  return "office";
}

/** Lift shaft centres in the drawing frame: two banks of four in the main core, the fire lift in the north-east core. */
export const LIFT_SHAFTS: Pt[] = [
  ...[18.0, 20.6, 23.2, 25.8].map((x) => [x, 19.6] as Pt),
  ...[18.0, 20.6, 23.2, 25.8].map((x) => [x, 28.3] as Pt),
  [46.3, 14.6],
];

export function buildInteriors(): Record<Kind, Inst[]> {
  const out = makeStore();
  const push = (k: Kind, f: number, e: number, n: number, y: number, rot: number, sx: number, sy: number, sz: number) =>
    out[k].push({ f, e, n, y, rot, sx, sy, sz });

  // Lift cables run the full height of the exploded stack (scaled at render time) and one
  // car waits in each shaft at a plausible floor.
  LIFT_SHAFTS.forEach(([x, y], i) => {
    const [e, n] = drawingToWorld([x, y]);
    push("liftCable", 0, e + 0.35, n, 0, DRAWING_ROT_Y, 0.06, 1, 0.06);
    push("liftCable", 0, e - 0.35, n, 0, DRAWING_ROT_Y, 0.06, 1, 0.06);
    const carFloor = [3, 12, 22, 31, 7, 17, 27, 34, 0][i];
    push("liftCar", carFloor, e, n, INTERIOR_HEIGHT / 2 - 0.15, DRAWING_ROT_Y, 2.0, INTERIOR_HEIGHT - 0.4, 2.0);
  });

  for (let f = 0; f < FLOORS; f++) {
    const poly = stageForFloor(f).polygon;
    const kind = floorKind(f);
    const H = INTERIOR_HEIGHT;

    // --- columns and core walls on every floor
    for (const [e, n] of perimeterColumns(poly)) push("column", f, e, n, H / 2, 0, 0.28, H, 0.28);
    for (const [x0, y0, x1, y1] of coreBoxes) {
      const w = x1 - x0;
      const d = y1 - y0;
      const t = 0.25;
      const walls: [number, number, number, number][] = [
        [(x0 + x1) / 2, y0 + t / 2, w, t],
        [(x0 + x1) / 2, y1 - t / 2, w, t],
        [x0 + t / 2, (y0 + y1) / 2, t, d],
        [x1 - t / 2, (y0 + y1) / 2, t, d],
      ];
      for (const [cx, cy, sx, sz] of walls) {
        const [e, n] = drawingToWorld([cx, cy]);
        push("coreWall", f, e, n, H / 2, DRAWING_ROT_Y, sx, H, sz);
      }
    }

    // --- lifts: two banks of four in the main core (drawing frame), doors toward the lobby
    const bankX = [18.0, 20.6, 23.2, 25.8];
    for (const [rowY, doorSide] of [
      [19.6, 1],
      [28.3, -1],
    ] as const) {
      for (const x of bankX) {
        const [e, n] = drawingToWorld([x, rowY]);
        push("liftShaft", f, e, n, H / 2, DRAWING_ROT_Y, 2.3, H, 2.3);
        const [de, dn] = drawingToWorld([x, rowY + doorSide * 1.2]);
        push("liftDoor", f, de, dn, 1.05, DRAWING_ROT_Y, 1.4, 2.1, 0.08);
      }
    }
    // fire lift in the north-east core
    {
      const [e, n] = drawingToWorld([46.3, 14.6]);
      push("liftShaft", f, e, n, H / 2, DRAWING_ROT_Y, 2.3, H, 2.3);
      const [de, dn] = drawingToWorld([45.1, 14.6]);
      push("liftDoor", f, de, dn, 1.05, DRAWING_ROT_Y, 0.08, 2.1, 1.4);
    }
    // --- stairs: TK3 in the main core, TK2 in the north-east core (12 steps per run)
    for (const [sx0, sy0, dir] of [
      [14.2, 22.6, 1],
      [39.0, 9.6, 1],
    ] as const) {
      for (let s = 0; s < 12; s++) {
        const [e, n] = drawingToWorld([sx0 + dir * s * 0.28, sy0]);
        push("stairStep", f, e, n, (s + 0.5) * (H / 12), DRAWING_ROT_Y, 0.3, H / 12, 2.2);
      }
    }

    if (kind === "lobby") {
      // reception counter facing the main entrance (south-east recessed face) and lounge tables
      {
        const a = poly[3];
        const b = poly[4];
        const out = edgeOutwardNormal(poly, 3);
        const t = 0.62;
        const cx = a[0] + (b[0] - a[0]) * t - out[0] * 9;
        const cn = a[1] + (b[1] - a[1]) * t - out[1] * 9;
        push("reception", f, cx, cn, 0.55, rotFor(b[0] - a[0], b[1] - a[1]), 5.5, 1.1, 0.9);
      }
      {
        const a = poly[6];
        const b = poly[7];
        const out = edgeOutwardNormal(poly, 6);
        for (const t of [0.3, 0.5, 0.7]) {
          const cx = a[0] + (b[0] - a[0]) * t - out[0] * 4;
          const cn = a[1] + (b[1] - a[1]) * t - out[1] * 4;
          push("lounge", f, cx, cn, 0.22, 0, 1.3, 0.45, 1.3);
        }
      }
      continue;
    }

    // --- perimeter cells along every facade
    const nEdges = poly.length;
    for (let i = 0; i < nEdges; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % nEdges];
      const dE = b[0] - a[0];
      const dN = b[1] - a[1];
      const L = Math.hypot(dE, dN);
      const along: Pt = [dE / L, dN / L];
      const outN = edgeOutwardNormal(poly, i);
      const inw: Pt = [-outN[0], -outN[1]];
      const rot = rotFor(along[0], along[1]);
      const cells = Math.max(1, Math.round(L / CELL));
      const w = L / cells;
      const startConvex = isConvexVertex(poly, i);
      const endConvex = isConvexVertex(poly, (i + 1) % nEdges);

      for (let k = 0; k < cells; k++) {
        // corner cells become meeting rooms (handled below)
        if ((k === 0 && startConvex) || (k === cells - 1 && endConvex)) continue;
        const cE = a[0] + along[0] * (k + 0.5) * w;
        const cN = a[1] + along[1] * (k + 0.5) * w;
        const at = (depth: number, side = 0): Pt => [cE + inw[0] * depth + along[0] * side, cN + inw[1] * depth + along[1] * side];
        const [backE, backN] = at(OFFICE_DEPTH);
        if (inCore(backE, backN, 1.5)) continue;

        if (kind === "office") {
          // partition on the cell's start boundary
          if (k > 0 || !startConvex) {
            const sE = a[0] + along[0] * k * w + inw[0] * (OFFICE_DEPTH / 2);
            const sN = a[1] + along[1] * k * w + inw[1] * (OFFICE_DEPTH / 2);
            if (!inCore(sE + inw[0] * (OFFICE_DEPTH / 2), sN + inw[1] * (OFFICE_DEPTH / 2), 1.2)) {
              push("partition", f, sE, sN, H / 2, rot, 0.08, H, OFFICE_DEPTH);
            }
          }
          // corridor wall with a door opening at the cell's end
          const [wE, wN] = at(OFFICE_DEPTH, -0.5);
          push("corridorWall", f, wE, wN, H / 2, rot, w - 1.0, H, 0.08);
          const [dE2, dN2] = at(OFFICE_DEPTH - 0.4, w / 2 - 0.55);
          push("door", f, dE2, dN2, 1.05, rot + 0.6, 0.9, 2.1, 0.05);
          // desk, chair, screen
          const [deskE, deskN] = at(2.2);
          push("desk", f, deskE, deskN, 0.72, rot, 1.7, 0.06, 0.8);
          const [scrE, scrN] = at(1.9);
          push("screen", f, scrE, scrN, 0.98, rot, 0.55, 0.36, 0.03);
          const [seatE, seatN] = at(3.2);
          push("chairSeat", f, seatE, seatN, 0.45, rot, 0.5, 0.08, 0.5);
          const [bkE, bkN] = at(3.45);
          push("chairBack", f, bkE, bkN, 0.72, rot, 0.5, 0.5, 0.06);
        } else if (kind === "conference") {
          if (k % 2 === 1) continue;
          const [tE, tN] = at(2.8);
          push("table", f, tE, tN, 0.72, rot, 3.6, 0.06, 1.2);
          for (const side of [-1, 1]) {
            for (const pos of [-1.2, 0, 1.2]) {
              const [sE, sN] = at(2.8 + side * 1.0, pos);
              push("chairSeat", f, sE, sN, 0.45, rot, 0.5, 0.08, 0.5);
            }
          }
          const [wE, wN] = at(OFFICE_DEPTH, 0);
          push("corridorWall", f, wE, wN, H / 2, rot, 2 * w - 1.0, H, 0.08);
        } else if (kind === "restaurant") {
          const [tE, tN] = at(2.6);
          push("roundTable", f, tE, tN, 0.36, 0, 1.1, 0.72, 1.1);
          for (const ang of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
            const ce = tE + Math.cos(ang) * 0.95;
            const cn = tN + Math.sin(ang) * 0.95;
            push("chairSeat", f, ce, cn, 0.45, ang, 0.45, 0.08, 0.45);
          }
        }
      }

      // meeting room in the convex corner at this edge's end vertex
      if (endConvex && kind === "office") {
        const v = b;
        const outNext = edgeOutwardNormal(poly, (i + 1) % nEdges);
        let bx = -(outN[0] + outNext[0]);
        let bn = -(outN[1] + outNext[1]);
        const bl = Math.hypot(bx, bn) || 1;
        bx /= bl;
        bn /= bl;
        const tE = v[0] + bx * 5.2;
        const tN = v[1] + bn * 5.2;
        if (!inCore(tE, tN, 2)) {
          push("table", f, tE, tN, 0.72, rot, 3.2, 0.06, 1.2);
          for (const side of [-1, 1]) {
            for (const pos of [-1.1, 0, 1.1]) {
              const sE = tE + along[0] * pos + inw[0] * side * 0.95;
              const sN = tN + along[1] * pos + inw[1] * side * 0.95;
              push("chairSeat", f, sE, sN, 0.45, rot, 0.5, 0.08, 0.5);
            }
          }
        }
      }
    }
  }
  return out;
}

export type Entrance = { e: number; n: number; rot: number; width: number; name: string };

/**
 * Building entrances on the ground floor: the main entrance in the recessed porch on the
 * south-east (Hardbruecke / Cubus) face near the east corner, the bank branch further along
 * the same face, and the Clouds entrance on the plaza (south-west) face at Maagplatz.
 */
export function entrances(): Entrance[] {
  const poly = stageForFloor(0).polygon;
  const along = (i: number): [Pt, Pt, Pt] => {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return [a, b, [(b[0] - a[0]) / L, (b[1] - a[1]) / L]];
  };
  const on = (i: number, t: number, width: number, name: string): Entrance => {
    const [a, b, dir] = along(i);
    return { e: a[0] + (b[0] - a[0]) * t, n: a[1] + (b[1] - a[1]) * t, rot: rotFor(dir[0], dir[1]), width, name };
  };
  return [on(3, 0.74, 4.6, "main"), on(3, 0.36, 3.0, "bank"), on(6, 0.42, 3.4, "clouds")];
}
