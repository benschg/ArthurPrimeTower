import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { growPolygon, stageForFloor } from "../geometry";
import { CELL, PAC_FLOOR, idx, type Cell, type Maze } from "../pacman/maze";
import { extrudeUp, shapeFrom } from "./helpers";

// Heights and radii in cells (one cell is CELL metres).
export const WALL_H = 0.42;
export const CORE_H = 0.62;
export const PAC_R = 0.4;
export const GHOST_R = 0.4;
export const GHOST_H = 0.3; // straight part of the body, under the dome
export const MOUTHS = 8;

/** Dome on a short cylinder with a scalloped hem: the arcade ghost, in the round. */
function ghostGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [
    new THREE.SphereGeometry(GHOST_R, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, GHOST_H, 0),
    new THREE.CylinderGeometry(GHOST_R, GHOST_R, GHOST_H, 20, 1, true).translate(0, GHOST_H / 2, 0),
    new THREE.CircleGeometry(GHOST_R, 20).rotateX(Math.PI / 2),
  ];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    parts.push(new THREE.SphereGeometry(GHOST_R * 0.36, 8, 6).translate(Math.cos(a) * GHOST_R * 0.66, 0, Math.sin(a) * GHOST_R * 0.66));
  }
  const merged = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return merged;
}

/** Every geometry of the board: the floor slab and its rim in metres, the rest in cells. */
export function boardGeometries() {
  const poly = stageForFloor(PAC_FLOOR).polygon;
  const rimShape = shapeFrom(growPolygon(poly, -0.1));
  rimShape.holes.push(shapeFrom(growPolygon(poly, -0.45)));
  const rim = new THREE.ExtrudeGeometry(rimShape, { depth: WALL_H * CELL, bevelEnabled: false });
  rim.rotateX(-Math.PI / 2);
  return {
    slab: extrudeUp(growPolygon(poly, -0.1), 0.06),
    rim,
    box: new THREE.BoxGeometry(1, 1, 1),
    dot: new THREE.SphereGeometry(0.11, 10, 8),
    power: new THREE.SphereGeometry(0.27, 14, 10),
    ghost: ghostGeometry(),
    eye: new THREE.SphereGeometry(0.115, 10, 8),
    pupil: new THREE.SphereGeometry(0.06, 8, 6),
    pacEye: new THREE.SphereGeometry(0.075, 10, 8),
    pacGlint: new THREE.SphereGeometry(0.028, 6, 5),
    // the player: a ball with a wedge cut out, one geometry per mouth opening
    mouths: Array.from({ length: MOUTHS }, (_, i) => {
      const open = 0.04 + (i / (MOUTHS - 1)) * 1.3;
      return new THREE.SphereGeometry(PAC_R, 28, 18, open / 2, Math.PI * 2 - open);
    }),
  };
}

/** The maze's cells by what stands on them, and the middle of its lanes (where the banner floats). */
export function boardCells(maze: Maze) {
  const walls: Cell[] = [];
  const cores: Cell[] = [];
  const dots: Cell[] = [];
  const powers: Cell[] = [];
  let sx = 0;
  let sy = 0;
  let lanes = 0;
  for (let y = 0; y < maze.h; y++) {
    for (let x = 0; x < maze.w; x++) {
      const i = idx(maze, x, y);
      if (maze.core[i]) cores.push({ x, y });
      else if (maze.lane[i]) {
        sx += x;
        sy += y;
        lanes++;
        if (maze.pellets[i] === 2) powers.push({ x, y });
        else if (maze.pellets[i] === 1) dots.push({ x, y });
      } else if (maze.floor[i]) walls.push({ x, y });
    }
  }
  return { walls, cores, dots, powers, centre: { x: sx / Math.max(1, lanes), y: sy / Math.max(1, lanes) } };
}
