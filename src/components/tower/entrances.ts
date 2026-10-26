/** Ground-floor entrances derived from the recessed south-east porch and the plaza face. */
import { edgeFrame, stageForFloor } from "./geometry";
import { rotFor } from "./interiorLayout";

export type Entrance = { e: number; n: number; rot: number; width: number; name: string };

/**
 * Building entrances on the ground floor: the main entrance in the recessed porch on the
 * south-east (Hardbruecke / Cubus) face near the east corner, the bank branch further along
 * the same face, and the Clouds entrance on the plaza (south-west) face at Maagplatz.
 */
export function entrances(): Entrance[] {
  const poly = stageForFloor(0).polygon;
  const on = (i: number, t: number, width: number, name: string): Entrance => {
    const { a, b, along } = edgeFrame(poly, i);
    return { e: a[0] + (b[0] - a[0]) * t, n: a[1] + (b[1] - a[1]) * t, rot: rotFor(along[0], along[1]), width, name };
  };
  return [on(3, 0.74, 4.6, "main"), on(3, 0.36, 3.0, "bank"), on(6, 0.42, 3.4, "clouds")];
}
