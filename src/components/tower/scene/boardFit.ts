/**
 * Placement of the floor-13 game board: centred in the view and as large as fits with the
 * whole floor visible, clear of the HUD. The HUD pieces to keep clear of are the elements
 * marked data-board-avoid; they are measured, so a longer translation or a taller card
 * needs no retuning here.
 */
import * as THREE from "three";
import { stageForFloor } from "../geometry";
import { PAC_FLOOR } from "../pacman/maze";
import { AX_X, AX_Y } from "./helpers";

type Rect = { left: number; top: number; right: number; bottom: number };

/** Walls and cores stand this far above the plate's origin (metres); they must fit too. */
const BOARD_TOP = 1.7;
/** Gap kept to the view's edges and the HUD, in CSS pixels. */
const MARGIN = 14;
/** The outline is measured flat-on; perspective makes the near edge a little larger. */
const PERSPECTIVE_SLACK = 0.95;

let cache: { tilt: number; yaw: number; pts: [number, number][]; cx: number; cy: number } | null = null;

/**
 * The board's outline as the camera sees it, in metres right/up of the plate's origin, for a
 * plate tilted and turned as the pull-out holds it. Also the centre of its bounding box.
 */
export function boardOutline(tilt: number, yaw: number) {
  if (cache && cache.tilt === tilt && cache.yaw === yaw) return cache;
  const poly = stageForFloor(PAC_FLOOR).polygon;
  const v = new THREE.Vector3();
  const pts: [number, number][] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    for (let k = 0; k < 8; k++) {
      const e = a[0] + ((b[0] - a[0]) * k) / 8;
      const n = a[1] + ((b[1] - a[1]) * k) / 8;
      for (const y of [0, BOARD_TOP]) {
        v.set(e, y, -n).applyAxisAngle(AX_Y, yaw).applyAxisAngle(AX_X, tilt);
        pts.push([v.x, v.y]);
      }
    }
  }
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  cache = { tilt, yaw, pts, cx: (Math.min(...xs) + Math.max(...xs)) / 2, cy: (Math.min(...ys) + Math.max(...ys)) / 2 };
  return cache;
}

/**
 * Where the board's centre goes on the canvas (CSS pixels) and how large it can be drawn
 * (pixels per metre). On a wide view the board centres on the screen and the HUD pieces in
 * the corners are obstacles its outline must stay out of. A piece spanning most of the
 * width, and every piece on an upright view, instead shortens the free area from the top
 * or bottom, and the board centres in what is left.
 */
export function fitBoard(canvas: HTMLElement, tilt: number, yaw: number): { x: number; y: number; ppm: number } {
  const box = canvas.getBoundingClientRect();
  const free: Rect = { left: 0, top: 0, right: box.width, bottom: box.height };
  const obstacles: Rect[] = [];
  for (const el of document.querySelectorAll("[data-board-avoid]")) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const rect = { left: r.left - box.left, top: r.top - box.top, right: r.right - box.left, bottom: r.bottom - box.top };
    // an upright view is too narrow to fit the board beside anything: there every piece is a band
    if (r.width > box.width * 0.6 || box.height > box.width) {
      if ((rect.top + rect.bottom) / 2 < box.height / 2) free.top = Math.max(free.top, rect.bottom);
      else free.bottom = Math.min(free.bottom, rect.top);
    } else obstacles.push(rect);
  }
  const x = (free.left + free.right) / 2;
  const y = (free.top + free.bottom) / 2;
  const { pts, cx, cy } = boardOutline(tilt, yaw);
  const fits = (ppm: number) =>
    pts.every(([px, py]) => {
      const sx = x + (px - cx) * ppm;
      const sy = y - (py - cy) * ppm;
      if (sx < free.left + MARGIN || sx > free.right - MARGIN || sy < free.top + MARGIN || sy > free.bottom - MARGIN) return false;
      return !obstacles.some((o) => sx > o.left - MARGIN && sx < o.right + MARGIN && sy > o.top - MARGIN && sy < o.bottom + MARGIN);
    });
  // Growing the board about its centre only ever pushes the outline toward the edges and
  // the corner pieces, so the largest size that fits can be bisected.
  let lo = 0;
  let hi = Math.max(box.width, box.height) / 20;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  return { x, y, ppm: lo * PERSPECTIVE_SLACK };
}
