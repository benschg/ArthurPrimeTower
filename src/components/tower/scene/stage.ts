import * as THREE from "three";
import { createContext, useContext, useMemo, useRef, type RefObject } from "react";

/** Explode-view state shared by plates, rings and interiors. */
export type ExplodeState = {
  gap: number;
  thin: number;
  /** damped hovered floor (or -1) driving the dock-style bulge */
  hoverF: number;
  /** damped strength of the bulge, 0..1 */
  hoverAmt: number;
};

/**
 * Pull-out state. `open` lifts everything above the floor; `t` blends the plate from its
 * slot to `pos`/`quat`, a transform kept relative to the camera by useStackMotion each frame.
 */
export type ExtractState = {
  floor: number;
  t: number;
  open: number;
  shift: number;
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  /** user adjustments while the floor is bound to the camera */
  spin: number;
  tilt: number;
  zoom: number;
};

/** Eased 0..1 amounts the whole scene follows: day to night, and the garage hidden to shown. */
export type Blend = { night: number; garage: number };

/**
 * The scene's per-frame state, shared through context: written in useFrame by the parts that
 * drive it (useStackMotion, Atmosphere, Underground) and read in useFrame by the parts that
 * follow it. Refs only, so none of it ever causes a render.
 */
export type Stage = {
  explodeRef: RefObject<ExplodeState>;
  extractRef: RefObject<ExtractState>;
  /** the floor on its way back in while a newly selected one comes out */
  outgoingRef: RefObject<ExtractState>;
  blendRef: RefObject<Blend>;
  /** the facade's glass rings, which the site's labels hide behind */
  glassRef: RefObject<THREE.Group | null>;
};

export const EXPLODE_GAP = 2.6;
export const PLATE_TILT = 0.95;
/** how far the stack above a pulled-out floor opens, metres */
export const OPEN_GAP = 9;
/** plate meshes sit this far above the floor elevation */
export const PLATE_LIFT = 0.2;
/** Yaw that lays the tower's long axis (bearing 34 deg) horizontally on screen when bound to the camera. */
export const PLATE_YAW = Math.atan2(-Math.cos((34 * Math.PI) / 180), Math.sin((34 * Math.PI) / 180));

const newExtract = (): ExtractState => ({ floor: -1, t: 0, open: 0, shift: 0, pos: new THREE.Vector3(), quat: new THREE.Quaternion(), spin: 0, tilt: PLATE_TILT, zoom: 1 });

/** A fresh stage for the scene to provide, starting at day or night. */
export function useNewStage(night: boolean): Stage {
  const explodeRef = useRef<ExplodeState>({ gap: 0, thin: 1, hoverF: -1, hoverAmt: 0 });
  const extractRef = useRef<ExtractState>(newExtract());
  const outgoingRef = useRef<ExtractState>(newExtract());
  const blendRef = useRef<Blend>({ night: night ? 1 : 0, garage: 0 });
  const glassRef = useRef<THREE.Group | null>(null);
  return useMemo(() => ({ explodeRef, extractRef, outgoingRef, blendRef, glassRef }), []);
}

export const StageContext = createContext<Stage | null>(null);

export function useStage(): Stage {
  const stage = useContext(StageContext);
  if (!stage) throw new Error("useStage outside the scene");
  return stage;
}

/** How far floor f (fractional for the lift cars) is lifted by the stack opening below it, in either pull-out slot. */
export function liftAbove(f: number, ex: ExtractState, prev: ExtractState): number {
  const a = ex.floor >= 0 && f > ex.floor ? ex.open : 0;
  const b = prev.floor >= 0 && f > prev.floor ? prev.open : 0;
  return OPEN_GAP * Math.max(a, b);
}

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
