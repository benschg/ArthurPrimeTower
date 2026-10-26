/** Small numeric helpers shared by the game logic and the scene. No three.js, so the page can load them before the 3D chunk. */

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Smooth 0..1 ramp of x between lo and hi (Hermite, as GLSL smoothstep). */
export function smoothstep(x: number, lo = 0, hi = 1): number {
  const t = clamp((x - lo) / (hi - lo), 0, 1);
  return t * t * (3 - 2 * t);
}

export const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

export const pick = <T>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

/** Deterministic random numbers in [0, 1) from a seed (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic random numbers in [0, 1) from a seed (linear congruential); the blinds and windows are laid out with it. */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
