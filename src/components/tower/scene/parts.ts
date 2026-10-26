import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Window glass of the vehicles. */
export const GLASS = "#12171d";

/** A box [length, height, width] centred at `at`, in one vertex colour. Vehicles point along +x. */
export function part(size: [number, number, number], at: [number, number, number], color: string): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(...size).translate(...at);
  const c = new THREE.Color(color);
  const colors = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < colors.length; i += 3) c.toArray(colors, i);
  return g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

/** Boxes from `part`, merged into one geometry. */
export function parts(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(list)!;
  list.forEach((p) => p.dispose());
  return merged;
}

/** Head lamps (warm white) at the +x end and tail lamps (red) at the -x end of a unit-length, unit-width vehicle. */
export function lampGeometry(): THREE.BufferGeometry {
  return parts(
    [-1, 1].flatMap((s) => [
      part([0.03, 0.16, 0.16], [0.5, 0, s * 0.33], "#fff4d6"),
      part([0.03, 0.14, 0.2], [-0.5, 0, s * 0.33], "#ff2a1a"),
    ]),
  );
}
