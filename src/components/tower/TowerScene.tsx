"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Environment, Grid, Html, OrbitControls } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { envMaxLod, facadeMaterialParams, prepareEnvTexture, type FacadeMaterial } from "./facadeShader";
import { Interiors, OPEN_GAP, PLATE_LIFT, type ExtractState } from "./Interiors";
import { entrances } from "./interiorLayout";
import { floorBands } from "@/data/tower";
import { pick, type Lang } from "@/i18n";
import { ui } from "@/i18n/ui";
import {
  BASEMENT_HEIGHT,
  BASEMENT_LEVELS,
  bridge,
  cores,
  DRAWING_ROT_Y,
  EDGE_SE,
  edgeOutwardNormal,
  FLOORS,
  floorElevation,
  floorHeight,
  garagePolygon,
  growPolygon,
  neighbours,
  parkingBays,
  perimeterColumns,
  railway,
  rampPolygon,
  stageForFloor,
  stages,
  stationPlatform,
  TOWER_HEIGHT,
  TYP_HEIGHT,
  type Pt,
} from "./geometry";

export type ViewerState = {
  showTenants: boolean;
  showGarage: boolean;
  explode: boolean;
  autoRotate: boolean;
  night: boolean;
  hovered: number | null;
  selected: number | null;
  cleaning: CleanState;
};

type SceneProps = ViewerState & {
  lang: Lang;
  onHover: (floor: number | null) => void;
  onSelect: (floor: number | null) => void;
  onStartCleaning: () => void;
  onCleanProgress: (progress: number, secondsLeft: number) => void;
  onHoverUnit: (v: boolean) => void;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Polygon in (East, North) → THREE.Shape in (x, y) that becomes (x, -z) after rotateX(-π/2). */
function shapeFrom(pts: Pt[]): THREE.Shape {
  const s = new THREE.Shape();
  pts.forEach(([x, y], i) => (i === 0 ? s.moveTo(x, y) : s.lineTo(x, y)));
  s.closePath();
  return s;
}

/** Extrude a footprint upward from y=0 to y=height. */
function extrudeUp(pts: Pt[], height: number, bevel = false): THREE.ExtrudeGeometry {
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
const WorldUV: THREE.ExtrudeGeometryOptions["UVGenerator"] = {
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

/**
 * Procedural facade textures: a base colour map (slab band per floor, mullions every 1.5 m,
 * "pixelated" open-window slits) and a mask of windows that glow at night.
 */
function useFacadeTextures() {
  return useMemo(() => {
    const cellsX = 16; // 1.5 m panes → 24 m
    const cellsY = 6; // 3.35 m floors → 20.1 m
    const px = 64;
    const make = () => {
      const c = document.createElement("canvas");
      c.width = cellsX * px;
      c.height = cellsY * px;
      return [c, c.getContext("2d")!] as const;
    };
    const [cBase, base] = make();
    const [cLit, lit] = make();
    base.fillStyle = "#2f7f78";
    base.fillRect(0, 0, cBase.width, cBase.height);
    lit.fillStyle = "#000";
    lit.fillRect(0, 0, cLit.width, cLit.height);
    for (let j = 0; j < cellsY; j++) {
      for (let i = 0; i < cellsX; i++) {
        const x = i * px;
        const y = j * px;
        const r = hash(i, j);
        base.fillStyle = r < 0.16 ? "#3d968d" : "#2f7f78";
        base.fillRect(x, y + px * 0.14, px, px * 0.86);
        base.fillStyle = "#1b3d3a";
        base.fillRect(x, y, px, px * 0.14); // slab band
        base.fillRect(x, y, px * 0.05, px); // mullion
        if (r > 0.7) {
          base.fillStyle = "#0e2624";
          base.fillRect(x + px * 0.95, y + px * 0.14, px * 0.05, px * 0.86); // opening slit
        }
        const g = hash(j * 3 + 1, i * 7 + 2);
        if (g < 0.34) {
          lit.fillStyle = g < 0.08 ? "#ffffff" : "#8f8f8f";
          lit.fillRect(x + px * 0.08, y + px * 0.2, px * 0.84, px * 0.74);
        }
      }
    }
    const setup = (c: HTMLCanvasElement, srgb: boolean) => {
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      return tex;
    };
    return {
      map: setup(cBase, true),
      lit: setup(cLit, false),
      repeat: new THREE.Vector2(1 / (cellsX * 1.5), 1 / (cellsY * TYP_HEIGHT)),
    };
  }, []);
}

/** Deterministic pseudo-random value in [0, 1) for a texture cell. */
function hash(i: number, j: number): number {
  const n = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function bandForFloor(floor: number) {
  return floorBands.find((b) => floor >= b.from && floor <= b.to);
}

/* ------------------------------------------------------------------ */
/* Tower                                                               */
/* ------------------------------------------------------------------ */

const HDRI = {
  day: "/hdri/kloofendal_48d_partly_cloudy_puresky_1k.hdr",
  night: "/hdri/shanghai_bund_1k.hdr",
};

/** Loads both HDRIs once and returns the one for the current mode, prepared for direct sampling. */
function useHdri(night: boolean) {
  const [day, nite] = useLoader(RGBELoader, [HDRI.day, HDRI.night]);
  const prepared = useMemo(() => [prepareEnvTexture(day), prepareEnvTexture(nite)], [day, nite]);
  return night ? prepared[1] : prepared[0];
}

function GlassStages({
  night,
  dim,
  env,
  unit,
  explodeRef,
  extractRef,
}: {
  night: boolean;
  dim: boolean;
  env: THREE.Texture;
  unit: UnitProps;
  explodeRef: RefObject<{ gap: number; thin: number }>;
  extractRef: RefObject<ExtractState>;
}) {
  const { map, lit, repeat } = useFacadeTextures();
  const roofRef = useRef<THREE.Group>(null);
  const ringsRef = useRef<THREE.Group>(null);
  // One shared facade material; one glass ring per floor so the stack can open and explode.
  const material = useMemo(() => new THREE.ShaderMaterial(facadeMaterialParams()) as FacadeMaterial, []);
  const rings = useMemo(() => Array.from({ length: FLOORS }, (_, f) => extrudeUp(stageForFloor(f).polygon, floorHeight(f))), []);
  const mat = () => (ringsRef.current?.children[0] as THREE.Mesh | undefined)?.material as FacadeMaterial | undefined;

  useEffect(() => {
    const m = mat();
    if (!m) return;
    m.uniforms.uMap.value = map;
    m.uniforms.uLit.value = lit;
    m.uniforms.uRepeat.value.copy(repeat);
  }, [map, lit, repeat]);

  useEffect(() => {
    const m = mat();
    if (!m) return;
    m.uniforms.uEnv.value = env;
    m.uniforms.uEnvMaxLod.value = envMaxLod(env);
  }, [env]);

  useFrame((_, dt) => {
    const gap = explodeRef.current?.gap ?? 0;
    const ex = extractRef.current;
    const opening = ex && ex.floor >= 0 ? OPEN_GAP * ex.open : 0;
    if (roofRef.current) roofRef.current.position.y = (FLOORS - 1) * gap + opening;
    if (ringsRef.current) {
      ringsRef.current.children.forEach((ring, f) => {
        ring.position.y = floorElevation(f) + f * gap + (ex && ex.floor >= 0 && f > ex.floor ? opening : 0);
      });
    }
    const m = mat();
    if (!m) return;
    const u = m.uniforms;
    u.uNight.value = THREE.MathUtils.damp(u.uNight.value, night ? 1 : 0, 3, dt);
    u.uOpacity.value = THREE.MathUtils.damp(u.uOpacity.value, dim ? 0.14 : 1, 6, dt);
    u.uEnvIntensity.value = THREE.MathUtils.damp(u.uEnvIntensity.value, night ? 1.1 : 1, 3, dt);
    u.uReflectivity.value = THREE.MathUtils.damp(u.uReflectivity.value, night ? 1.8 : 1.3, 3, dt);
    m.depthWrite = !dim;
  });

  return (
    <group>
      <group ref={ringsRef}>
        {rings.map((g, f) => (
          <mesh key={f} geometry={g} material={material} position={[0, floorElevation(f), 0]} castShadow receiveShadow />
        ))}
      </group>
      {/* the roof and the cradle ride up with the exploded stack */}
      <group ref={roofRef}>
        <Roof night={night} party={unit.cleaning.active && unit.cleaning.progress >= 0.99} />
        <MaintenanceUnit {...unit} />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Maintenance unit and window-cleaning game                           */
/* ------------------------------------------------------------------ */

export type CleanState = {
  active: boolean;
  /** 0..1 fraction of the facade cleaned */
  progress: number;
  secondsLeft: number;
};

const GAME_SECONDS = 60;
const CLEAN_PX = 6; // dirt canvas pixels per metre

/** Frame of the Hardbruecke facade of the top stage: origin a, unit vector along, outward normal. */
function useFacadeFrame() {
  const top = stages[stages.length - 1].polygon;
  return useMemo(() => {
    const a = top[EDGE_SE];
    const b = top[(EDGE_SE + 1) % top.length];
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const len = Math.hypot(ex, ey);
    const along: Pt = [ex / len, ey / len];
    const out = edgeOutwardNormal(top, EDGE_SE);
    const yaw = Math.atan2(ey, ex); // rotation.y so a box's local x runs along the facade
    const lowY = floorElevation(17) + 0.4; // the facade steps in below floor 17
    const highY = TOWER_HEIGHT - 0.3;
    return { a, along, out, len, yaw, lowY, highY };
  }, [top]);
}

/** Dirt layer: a canvas the squeegee clears; progress is tracked on a 1 m grid. */
function useDirt(len: number, height: number) {
  return useMemo(() => {
    const w = Math.ceil(len * CLEAN_PX);
    const h = Math.ceil(height * CLEAN_PX);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    const paint = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(70, 58, 40, 0.55)";
      ctx.fillRect(0, 0, w, h);
      // streaks and blotches
      for (let i = 0; i < 260; i++) {
        const x = hash(i, 3) * w;
        const y = hash(i, 7) * h;
        const r = 4 + hash(i, 11) * 22;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        const dark = hash(i, 5) > 0.5;
        g.addColorStop(0, dark ? "rgba(40,32,22,0.75)" : "rgba(150,140,120,0.5)");
        g.addColorStop(1, "rgba(60,50,35,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < 40; i++) {
        const x = hash(i, 13) * w;
        ctx.fillStyle = "rgba(35,28,20,0.35)";
        ctx.fillRect(x, hash(i, 17) * h * 0.5, 1 + hash(i, 19) * 3, h * (0.3 + hash(i, 23) * 0.6));
      }
    };
    paint();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const cols = Math.ceil(len);
    const rows = Math.ceil(height);
    const cleaned = new Uint8Array(cols * rows);
    // Mutation goes through these closures so React sees the memoised object as read-only.
    const reset = () => {
      paint();
      cleaned.fill(0);
      tex.needsUpdate = true;
    };
    const clear = (x: number, y: number, cw: number, ch: number) => {
      ctx.clearRect(x, y, cw, ch);
      tex.needsUpdate = true;
    };
    /** Marks a 1 m cell as cleaned; true if it was dirty before. */
    const clearAll = () => {
      ctx.clearRect(0, 0, w, h);
      cleaned.fill(1);
      tex.needsUpdate = true;
    };
    const mark = (gx: number, gy: number) => {
      if (gx < 0 || gy < 0 || gx >= cols || gy >= rows) return false;
      const idx = gy * cols + gx;
      if (cleaned[idx]) return false;
      cleaned[idx] = 1;
      return true;
    };
    return { tex, cols, rows, reset, clear, clearAll, mark };
  }, [len, height]);
}

type UnitProps = {
  cleaning: CleanState;
  onStart: () => void;
  onProgress: (progress: number, secondsLeft: number) => void;
  onHoverUnit: (v: boolean) => void;
};

/**
 * Building maintenance unit (facade access cradle): a trolley on a roof rail along the
 * Hardbruecke facade, a jib reaching over the parapet, two cables and a cradle. Idle, it
 * slowly travels the upper facade; clicked, it becomes the player's squeegee.
 */
function MaintenanceUnit({ cleaning, onStart, onProgress, onHoverUnit }: UnitProps) {
  const frame = useFacadeFrame();
  const { a, along, out, len, yaw, lowY, highY } = frame;
  const H = highY - lowY;
  const dirt = useDirt(len, H);

  const trolley = useRef<THREE.Group>(null);
  const cradle = useRef<THREE.Group>(null);
  const cableL = useRef<THREE.Mesh>(null);
  const cableR = useRef<THREE.Mesh>(null);
  const target = useRef({ u: 0.5, y: highY - 6 });
  const pos = useRef({ u: 0.5, y: highY - 6 });
  const prev = useRef({ x: (1 - 0.5) * len, y: highY - 6 - lowY }); // last squeegee position on the canvas
  const game = useRef({ started: 0, lastReport: 0, cleanedCount: 0, done: false });

  const roofY = TOWER_HEIGHT + 0.2;
  const jibReach = 3.2;
  const cradleHalf = 1.9;
  const cradleH = 1.3;

  // Reset when a game starts
  useEffect(() => {
    if (!cleaning.active) return;
    dirt.reset();
    prev.current = { x: (1 - pos.current.u) * len, y: pos.current.y - lowY };
    game.current = { started: performance.now(), lastReport: 0, cleanedCount: 0, done: false };
  }, [cleaning.active, dirt, len, lowY]);

  // Success forced from outside (hidden shortcut): wipe the facade and freeze.
  useEffect(() => {
    if (cleaning.active && cleaning.progress >= 0.99 && !game.current.done) {
      dirt.clearAll();
      game.current.done = true;
    }
  }, [cleaning.active, cleaning.progress, dirt]);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    if (cleaning.active && !game.current.done) {
      // follow the pointer target
      pos.current.u = THREE.MathUtils.damp(pos.current.u, target.current.u, 14, dt);
      pos.current.y = THREE.MathUtils.damp(pos.current.y, target.current.y, 14, dt);
      // squeegee: sweep from the previous position to the new one so fast moves leave a
      // continuous strip (canvas x runs against `along`, like the plane's u)
      const cx = (1 - pos.current.u) * len;
      const cy = pos.current.y - lowY;
      const from = prev.current;
      const dx = cx - from.x;
      const dy = cy - from.y;
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx) / cradleHalf, Math.abs(dy) / (cradleH / 2))));
      for (let k = 1; k <= steps; k++) {
        const sx = from.x + (dx * k) / steps;
        const sy = from.y + (dy * k) / steps;
        dirt.clear((sx - cradleHalf) * CLEAN_PX, (H - sy - cradleH / 2) * CLEAN_PX, cradleHalf * 2 * CLEAN_PX, cradleH * CLEAN_PX);
        for (let gx = Math.floor(sx - cradleHalf); gx <= Math.floor(sx + cradleHalf); gx++) {
          for (let gy = Math.floor(sy - cradleH / 2); gy <= Math.floor(sy + cradleH / 2); gy++) {
            if (dirt.mark(gx, gy)) game.current.cleanedCount++;
          }
        }
      }
      prev.current = { x: cx, y: cy };
      const now = performance.now();
      if (!game.current.done && now - game.current.lastReport > 200) {
        game.current.lastReport = now;
        const progress = Math.min(1, game.current.cleanedCount / (dirt.cols * dirt.rows) / 0.97);
        const secondsLeft = Math.max(0, GAME_SECONDS - (now - game.current.started) / 1000);
        if (progress >= 0.99) game.current.done = true; // freeze the clock and the final score
        onProgress(progress, secondsLeft);
      }
    } else if (!cleaning.active) {
      // idle patrol
      pos.current.u = 0.5 + 0.18 * Math.sin(t * 0.04);
      const drop = 0.5 - 0.5 * Math.cos(t * 0.09);
      pos.current.y = highY - 2 - drop * (H - 4);
    }
    const u = pos.current.u;
    const y = pos.current.y;
    const px = a[0] + along[0] * u * len;
    const pz = a[1] + along[1] * u * len;
    if (trolley.current) trolley.current.position.set(px - out[0] * 1.3, roofY, -(pz - out[1] * 1.3));
    if (cradle.current) cradle.current.position.set(px + out[0] * 1.1, y - cradleH / 2, -(pz + out[1] * 1.1));
    const tipY = roofY + 3.4;
    const cableLen = tipY - (y - cradleH / 2 + 0.6);
    for (const [ref, side] of [[cableL, -1], [cableR, 1]] as const) {
      const m = ref.current;
      if (!m) continue;
      const cxw = px + out[0] * jibReach * 0.55 + along[0] * side * cradleHalf * 0.8;
      const czw = pz + out[1] * jibReach * 0.55 + along[1] * side * cradleHalf * 0.8;
      m.position.set(cxw, tipY - cableLen / 2, -czw);
      m.scale.y = cableLen;
    }
  });

  // Dirt plane sits just outside the glass, rotated so local +z is the outward normal.
  // Its local +x then runs against `along`, hence the mirrored u below.
  const planeRot = Math.atan2(out[0], -out[1]);
  const steer = (uv: THREE.Vector2 | undefined) => {
    if (!uv) return;
    target.current.u = THREE.MathUtils.clamp(1 - uv.x, cradleHalf / len, 1 - cradleHalf / len);
    target.current.y = lowY + THREE.MathUtils.clamp(uv.y, 0.02, 0.98) * H;
  };
  const mid: [number, number, number] = [a[0] + (along[0] * len) / 2 + out[0] * 0.45, (lowY + highY) / 2, -(a[1] + (along[1] * len) / 2 + out[1] * 0.45)];

  return (
    <group>
      {/* Rail along the parapet, inside the roof edge */}
      <mesh
        position={[a[0] + (along[0] * len) / 2 - out[0] * 1.3, roofY + 0.15, -(a[1] + (along[1] * len) / 2 - out[1] * 1.3)]}
        rotation={[0, yaw, 0]}
      >
        <boxGeometry args={[len - 4, 0.3, 1.4]} />
        <meshStandardMaterial color="#6b7580" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Trolley with mast, counterweight and jib */}
      <group ref={trolley} rotation={[0, yaw, 0]}>
        <mesh position={[0, 0.9, 0]} castShadow>
          <boxGeometry args={[2.6, 1.4, 1.8]} />
          <meshStandardMaterial color="#e8b532" roughness={0.6} />
        </mesh>
        <mesh position={[0, 2.5, 0]}>
          <boxGeometry args={[0.5, 2.2, 0.5]} />
          <meshStandardMaterial color="#d9dee5" metalness={0.4} roughness={0.5} />
        </mesh>
        <mesh position={[0, 1.9, -1.4]}>
          <boxGeometry args={[1.6, 1.0, 0.9]} />
          <meshStandardMaterial color="#3a4652" roughness={0.9} />
        </mesh>
        <mesh position={[0, 3.3, (1.3 + jibReach) / 2 - 0.4]}>
          <boxGeometry args={[0.35, 0.35, 1.3 + jibReach + 1.2]} />
          <meshStandardMaterial color="#d9dee5" metalness={0.4} roughness={0.5} />
        </mesh>
        <mesh position={[0, 2.9, 1.3 + jibReach * 0.55]}>
          <boxGeometry args={[3.2, 0.25, 0.25]} />
          <meshStandardMaterial color="#d9dee5" metalness={0.4} roughness={0.5} />
        </mesh>
      </group>

      <mesh ref={cableL}>
        <cylinderGeometry args={[0.03, 0.03, 1, 5]} />
        <meshStandardMaterial color="#cfd6dd" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh ref={cableR}>
        <cylinderGeometry args={[0.03, 0.03, 1, 5]} />
        <meshStandardMaterial color="#cfd6dd" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Cradle: click to start the game */}
      <group
        ref={cradle}
        rotation={[0, yaw, 0]}
        onClick={(e) => {
          e.stopPropagation();
          if (!cleaning.active) onStart();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHoverUnit(true);
        }}
        onPointerOut={() => onHoverUnit(false)}
      >
        {/* generous invisible hit box */}
        <mesh position={[0, 0.7, 0]} visible={false}>
          <boxGeometry args={[cradleHalf * 2 + 2, 3, 3]} />
        </mesh>
        <mesh position={[0, 0.25, 0]} castShadow>
          <boxGeometry args={[cradleHalf * 2, 0.5, 1.1]} />
          <meshStandardMaterial color="#e8b532" roughness={0.6} emissive="#e8b532" emissiveIntensity={cleaning.active ? 0.35 : 0} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * cradleHalf * 0.8, 0.85, 0]}>
            <boxGeometry args={[0.08, 1.2, 0.08]} />
            <meshStandardMaterial color="#cfd6dd" />
          </mesh>
        ))}
        <mesh position={[0, 1.15, 0]}>
          <boxGeometry args={[cradleHalf * 2, 0.06, 1.1]} />
          <meshStandardMaterial color="#cfd6dd" />
        </mesh>
        {[-0.8, 0.7].map((x) => (
          <mesh key={x} position={[x, 1.05, 0]}>
            <capsuleGeometry args={[0.2, 0.9, 4, 8]} />
            <meshStandardMaterial color="#2f6fd6" />
          </mesh>
        ))}
        {/* squeegee blade toward the glass */}
        <mesh position={[0, 0.7, -0.62]}>
          <boxGeometry args={[cradleHalf * 2, cradleH, 0.06]} />
          <meshStandardMaterial color="#9ad7ff" transparent opacity={cleaning.active ? 0.35 : 0} depthWrite={false} />
        </mesh>
      </group>

      {/* Dirt overlay on the facade; also the pointer surface that steers the cradle */}
      <mesh
        position={mid}
        rotation={[0, planeRot, 0]}
        visible={cleaning.active}
        onPointerDown={(e) => {
          if (!cleaning.active) return;
          e.stopPropagation();
          // keep receiving moves while a finger or button drags off the plane
          (e.target as Element | undefined)?.setPointerCapture?.(e.pointerId);
          steer(e.uv);
        }}
        onPointerUp={(e) => (e.target as Element | undefined)?.releasePointerCapture?.(e.pointerId)}
        onPointerMove={(e) => cleaning.active && steer(e.uv)}
      >
        <planeGeometry args={[len, H]} />
        <meshBasicMaterial map={dirt.tex} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
    </group>
  );
}

/** Ground-floor entrances: frames, glass leaves and the canopy over the main entrance. */
function Entrances() {
  const list = useMemo(() => entrances(), []);
  return (
    <group>
      {list.map((d) => {
        const main = d.name === "main";
        const h = main ? 3.2 : 2.9;
        return (
          <group key={d.name} position={[d.e, 0, -d.n]} rotation={[0, d.rot, 0]}>
            {/* frame: two jambs and a header, so the lobby shows through the glass */}
            {[-1, 1].map((side) => (
              <mesh key={`j${side}`} position={[side * (d.width / 2 + 0.08), h / 2, 0]}>
                <boxGeometry args={[0.16, h, 0.24]} />
                <meshStandardMaterial color="#141a21" roughness={0.6} metalness={0.4} />
              </mesh>
            ))}
            <mesh position={[0, h - 0.12, 0]}>
              <boxGeometry args={[d.width + 0.32, 0.24, 0.24]} />
              <meshStandardMaterial color="#141a21" roughness={0.6} metalness={0.4} />
            </mesh>
            {/* lit lobby behind the doors */}
            <mesh position={[0, (h - 0.24) / 2, -0.6]}>
              <boxGeometry args={[d.width, h - 0.24, 0.05]} />
              <meshStandardMaterial color="#3d5f58" emissive="#8fd3c4" emissiveIntensity={0.55} roughness={1} />
            </mesh>
            {/* glass leaves, one slightly ajar */}
            {[-1, 1].map((side) => (
              <mesh key={side} position={[side * (d.width / 4), (h - 0.24) / 2, side < 0 ? 0.22 : 0.05]} rotation={[0, side < 0 ? -0.3 : 0, 0]}>
                <boxGeometry args={[d.width / 2 - 0.1, h - 0.3, 0.04]} />
                <meshPhysicalMaterial color="#cfeee6" roughness={0.05} metalness={0.1} transparent opacity={0.35} />
              </mesh>
            ))}
            {/* handles */}
            {[-1, 1].map((side) => (
              <mesh key={`h${side}`} position={[side * 0.25, 1.05, 0.2]}>
                <cylinderGeometry args={[0.02, 0.02, 0.9, 6]} />
                <meshStandardMaterial color="#d7dee6" metalness={0.7} roughness={0.3} />
              </mesh>
            ))}
            {main && (
              <>
                {/* canopy with the PRIME TOWER fascia */}
                <mesh position={[0, h + 0.55, 1.9]} castShadow>
                  <boxGeometry args={[d.width + 3.2, 0.3, 3.8]} />
                  <meshStandardMaterial color="#3a4652" roughness={0.6} metalness={0.3} />
                </mesh>
                <mesh position={[0, h + 0.55, 3.8]}>
                  <boxGeometry args={[d.width + 3.2, 0.5, 0.06]} />
                  <meshStandardMaterial color="#e8edf2" emissive="#e8edf2" emissiveIntensity={0.9} toneMapped={false} />
                </mesh>
                <mesh position={[0, h + 0.38, 1.9]}>
                  <boxGeometry args={[d.width + 3.0, 0.04, 3.6]} />
                  <meshStandardMaterial color="#fff2d6" emissive="#fff2d6" emissiveIntensity={0.8} toneMapped={false} />
                </mesh>
                {[-1, 1].map((side) => (
                  <mesh key={`c${side}`} position={[side * (d.width / 2 + 1.2), (h + 0.4) / 2, 3.3]}>
                    <cylinderGeometry args={[0.12, 0.12, h + 0.4, 10]} />
                    <meshStandardMaterial color="#8b949e" metalness={0.5} roughness={0.5} />
                  </mesh>
                ))}
              </>
            )}
          </group>
        );
      })}
    </group>
  );
}

/** Radial glow sprite texture for the aviation lights. */
function useGlowTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,70,50,1)");
    g.addColorStop(0.25, "rgba(255,50,40,0.55)");
    g.addColorStop(0.6, "rgba(255,40,30,0.12)");
    g.addColorStop(1, "rgba(255,40,30,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

/** Louvre stripes for the roof plant enclosure. */
function useLouvreTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 16;
    c.height = 128;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#232c36";
    ctx.fillRect(0, 0, 16, 128);
    ctx.fillStyle = "#0f151c";
    for (let y = 0; y < 128; y += 8) ctx.fillRect(0, y, 16, 3);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 6);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

function AviationLight({ position, night, glow, mast = 2, party = false }: { position: [number, number, number]; night: boolean; glow: THREE.Texture; mast?: number; party?: boolean }) {
  const sprite = useRef<THREE.Sprite>(null);
  const lamp = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pulse = party ? 0.6 + 0.6 * Math.max(0, Math.sin(t * 9 + position[0] * 0.7)) : 0.85 + 0.15 * Math.sin(t * 2.2 + position[0]);
    const base = (night ? 9 : 3.2) * (party ? 1.6 : 1);
    if (sprite.current) sprite.current.scale.setScalar(base * pulse);
    const m = lamp.current?.material as THREE.MeshStandardMaterial | undefined;
    if (m) m.emissiveIntensity = (night ? 6 : 2.5) * pulse;
  });
  return (
    <group position={position}>
      <mesh position={[0, mast / 2, 0]}>
        <cylinderGeometry args={[0.08, 0.1, mast, 6]} />
        <meshStandardMaterial color="#8b949e" />
      </mesh>
      <mesh ref={lamp} position={[0, mast + 0.25, 0]}>
        <sphereGeometry args={[0.32, 12, 12]} />
        <meshStandardMaterial color="#ff2a1a" emissive="#ff3020" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      <sprite ref={sprite} position={[0, mast + 0.25, 0]} scale={4}>
        <spriteMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
    </group>
  );
}

/** Parapet, plant enclosure, mast and the ring of red aviation lights seen in photos. */
function Roof({ night, party }: { night: boolean; party: boolean }) {
  const top = stages[stages.length - 1].polygon;
  const glow = useGlowTexture();
  const louvre = useLouvreTexture();
  const parapet = useMemo(() => {
    const outer = growPolygon(top, 0.25);
    const inner = growPolygon(top, -0.45);
    const shape = shapeFrom(outer);
    shape.holes.push(new THREE.Path(inner.map(([x, y]) => new THREE.Vector2(x, y))));
    const g = new THREE.ExtrudeGeometry(shape, { depth: 1.1, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    return g;
  }, [top]);
  // One light near each roof corner, inset from the parapet; the two reflex corners are skipped.
  const lights = useMemo(() => growPolygon(top, -1.6).filter((_, i) => i !== 1 && i !== 5), [top]);
  return (
    <group>
      <mesh geometry={parapet} position={[0, TOWER_HEIGHT - 0.1, 0]} castShadow>
        <meshStandardMaterial color="#141a21" roughness={0.85} metalness={0.2} />
      </mesh>
      {/* Plant enclosure with louvred sides, offset toward the cores */}
      <group position={[-1, TOWER_HEIGHT, 4]} rotation={[0, DRAWING_ROT_Y, 0]}>
        <mesh position={[0, 1.5, 0]} castShadow>
          <boxGeometry args={[24, 3, 11]} />
          <meshStandardMaterial map={louvre} color="#9aa5b1" roughness={0.9} metalness={0.15} />
        </mesh>
        <mesh position={[0, 3.05, 0]}>
          <boxGeometry args={[24.4, 0.12, 11.4]} />
          <meshStandardMaterial color="#11161c" roughness={0.9} />
        </mesh>
        {[-7, 0, 7].map((x) => (
          <mesh key={x} position={[x, 3.5, -2]}>
            <boxGeometry args={[2.2, 0.9, 1.6]} />
            <meshStandardMaterial color="#3a4652" roughness={0.8} />
          </mesh>
        ))}
      </group>
      {/* Main mast with lights at the tip and mid-height */}
      <mesh position={[-4, TOWER_HEIGHT + 3.2 + 3.6, 2]}>
        <cylinderGeometry args={[0.1, 0.24, 7.2, 8]} />
        <meshStandardMaterial color="#d7dee6" metalness={0.4} roughness={0.4} />
      </mesh>
      <AviationLight position={[-4, TOWER_HEIGHT + 3.2 + 7.2, 2]} night={night} glow={glow} mast={0.6} party={party} />
      <AviationLight position={[-4, TOWER_HEIGHT + 3.2 + 3.6, 2]} night={night} glow={glow} mast={0.2} party={party} />
      {lights.map(([e, n], i) => (
        <AviationLight key={i} position={[e, TOWER_HEIGHT + 1.0, -n]} night={night} glow={glow} party={party} />
      ))}
    </group>
  );
}

function Structure({ visible }: { visible: boolean }) {
  const columns = useMemo(() => perimeterColumns(stages[1].polygon), []);
  return (
    <group visible={visible}>
      {cores.map((c) => (
        <mesh key={c.name} position={[c.center[0], TOWER_HEIGHT / 2 + 1.2, -c.center[1]]} rotation={[0, DRAWING_ROT_Y, 0]} castShadow>
          <boxGeometry args={[c.size[0], TOWER_HEIGHT + 2.4, c.size[1]]} />
          <meshStandardMaterial color="#8d97a3" roughness={0.9} />
        </mesh>
      ))}
      {columns.map(([e, n], i) => (
        <mesh key={i} position={[e, TOWER_HEIGHT / 2, -n]}>
          <cylinderGeometry args={[0.28, 0.28, TOWER_HEIGHT, 8]} />
          <meshStandardMaterial color="#b9c2cc" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

const noRaycast = () => null;
const EXPLODE_GAP = 2.6;
const AX_X = new THREE.Vector3(1, 0, 0);
const AX_Y = new THREE.Vector3(0, 1, 0);
/** Yaw that lays the tower's long axis (bearing 34 deg) horizontally on screen when bound to the camera. */
const PLATE_YAW = Math.atan2(-Math.cos((34 * Math.PI) / 180), Math.sin((34 * Math.PI) / 180));

function FloorSlices({
  showTenants,
  explode,
  hovered,
  selected,
  onHover,
  onSelect,
  interactive,
  explodeRef,
  extractRef,
}: Pick<SceneProps, "showTenants" | "explode" | "hovered" | "selected" | "onHover" | "onSelect"> & {
  interactive: boolean;
  explodeRef: RefObject<{ gap: number; thin: number }>;
  extractRef: RefObject<ExtractState>;
}) {
  const geos = useMemo(
    () =>
      Array.from({ length: FLOORS }, (_, f) => {
        const s = stageForFloor(f);
        return extrudeUp(growPolygon(s.polygon, 0.1), floorHeight(f) - 0.4, true);
      }),
    [],
  );
  const group = useRef<THREE.Group>(null);

  useFrame(() => {
    // the Scene damps the explode and pull-out amounts; plates follow them
    const x = explodeRef.current;
    const ex = extractRef.current;
    if (!group.current || !x || !ex) return;
    group.current.children.forEach((child, f) => {
      if (f === ex.floor) {
        child.position.copy(ex.pos);
        child.quaternion.copy(ex.quat);
        child.scale.y = THREE.MathUtils.lerp(x.thin, 0.12, ex.t);
        return;
      }
      const lift = ex.floor >= 0 && f > ex.floor ? OPEN_GAP * ex.open : 0;
      child.position.set(0, floorElevation(f) + PLATE_LIFT + f * x.gap + lift, 0);
      child.quaternion.identity();
      child.scale.y = x.thin;
    });
  });

  return (
    <group ref={group}>
      {geos.map((g, f) => {
        const band = bandForFloor(f);
        const active = hovered === f || selected === f;
        const visible = showTenants || explode || active;
        const color = band?.color ?? "#5c6f83";
        return (
          <mesh
            key={f}
            geometry={g}
            position={[0, floorElevation(f) + 0.2, 0]}
            raycast={interactive ? undefined : noRaycast}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHover(f);
            }}
            onPointerOut={() => onHover(null)}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(selected === f ? null : f);
            }}
            castShadow={explode}
          >
            <meshStandardMaterial
              color={active ? "#ffffff" : color}
              emissive={active ? color : "#000000"}
              emissiveIntensity={selected === f ? 1 : hovered === f ? 0.6 : 0}
              transparent
              opacity={visible ? (explode ? 0.95 : active ? 0.92 : 0.72) : 0}
              depthWrite={visible}
              roughness={0.55}
              metalness={0.1}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function FloorLabel({ floor, explode, lang }: { floor: number; explode: boolean; lang: Lang }) {
  const t = ui[lang].viewer;
  const band = bandForFloor(floor);
  const s = stageForFloor(floor);
  const v = s.polygon[4]; // east corner
  const y = floorElevation(floor) + floorHeight(floor) / 2 + (explode ? floor * EXPLODE_GAP : 0);
  return (
    <Html position={[v[0] + 3, y, -v[1]]} distanceFactor={150} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
      <div className="glass rounded-md px-2.5 py-1.5 text-[11px] leading-tight whitespace-nowrap">
        <div className="font-mono text-accent">
          {t.floor} {floor === 0 ? t.ground : floor} · {floorElevation(floor).toFixed(1)} m
        </div>
        <div className="text-paper">{band ? pick(band.label, lang) : t.offices}</div>
      </div>
    </Html>
  );
}

/* ------------------------------------------------------------------ */
/* Site                                                                */
/* ------------------------------------------------------------------ */

function Footprint({ polygon, height, color, floors, name, note }: (typeof neighbours)[number]) {
  const geo = useMemo(() => extrudeUp(polygon, height), [polygon, height]);
  const lines = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let f = 1; f < floors; f++) {
      const y = (height * f) / floors;
      for (let i = 0; i < polygon.length; i++) {
        const a = polygon[i];
        const b = polygon[(i + 1) % polygon.length];
        pts.push(new THREE.Vector3(a[0], y, -a[1]), new THREE.Vector3(b[0], y, -b[1]));
      }
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [polygon, height, floors]);
  const cx = polygon.reduce((s, p) => s + p[0], 0) / polygon.length;
  const cy = polygon.reduce((s, p) => s + p[1], 0) / polygon.length;
  return (
    <group>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.85} metalness={0.05} />
      </mesh>
      <lineSegments geometry={lines}>
        <lineBasicMaterial color="#0b0f14" transparent opacity={0.5} />
      </lineSegments>
      {name && (
        <Html zIndexRange={[5, 0]} position={[cx, height + 4, -cy]} center occlude distanceFactor={220} style={{ pointerEvents: "none" }}>
          <div className="text-center whitespace-nowrap">
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-paper/80">{name}</div>
            {note && <div className="text-[9px] text-muted">{note}</div>}
          </div>
        </Html>
      )}
    </group>
  );
}

function Site({ lang }: { lang: Lang }) {
  const lab = ui[lang].viewer.labels;
  const bRot = (bridge.bearing * Math.PI) / 180;
  const rRot = (railway.bearing * Math.PI) / 180;
  const station = useMemo(() => extrudeUp(stationPlatform, 1.2), []);
  return (
    <group>
      <mesh name="ground" rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1200, 1200]} />
        {/* Always in the transparent pass with depth writes on; the Blender animates opacity and colour. */}
        <meshStandardMaterial color="#161d27" roughness={1} transparent opacity={1} />
      </mesh>
      <Grid
        renderOrder={1}
        position={[0, 0.03, 0]}
        args={[1200, 1200]}
        cellSize={10}
        cellThickness={0.5}
        cellColor="#22303d"
        sectionSize={50}
        sectionThickness={1}
        sectionColor="#2e4053"
        fadeDistance={560}
        fadeStrength={1.3}
        infiniteGrid
      />

      {neighbours.map((b, i) => (
        <Footprint key={i} {...b} />
      ))}

      {/* Hardbrücke elevated road. Rotation about Y by -bearing aligns local +x with the compass bearing. */}
      <group position={[bridge.center[0], 0, -bridge.center[1]]} rotation={[0, Math.PI / 2 - bRot, 0]}>
        <mesh position={[0, bridge.deckHeight, 0]} castShadow receiveShadow>
          <boxGeometry args={[bridge.length, 1.5, bridge.width]} />
          <meshStandardMaterial color="#2c3641" roughness={0.9} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0, bridge.deckHeight + 1.2, (s * bridge.width) / 2]}>
            <boxGeometry args={[bridge.length, 1.1, 0.3]} />
            <meshStandardMaterial color="#4a5663" />
          </mesh>
        ))}
        {Array.from({ length: 14 }, (_, i) => (
          <mesh key={i} position={[-260 + i * 40, bridge.deckHeight / 2, 0]} castShadow>
            <boxGeometry args={[2.4, bridge.deckHeight, bridge.width - 8]} />
            <meshStandardMaterial color="#39434f" />
          </mesh>
        ))}
        <Html zIndexRange={[5, 0]} position={[110, bridge.deckHeight + 6, 0]} center occlude distanceFactor={220} style={{ pointerEvents: "none" }}>
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-paper/70 whitespace-nowrap">{lab.hardbruecke}</div>
        </Html>
      </group>

      {/* Bahnhof Hardbrücke platform (at ground level beneath the bridge) */}
      <mesh geometry={station} position={[0, 0.05, 0]} receiveShadow>
        <meshStandardMaterial color="#5b6774" roughness={0.9} />
      </mesh>
      <Html zIndexRange={[5, 0]} position={[38, 6, 45]} center occlude distanceFactor={220} style={{ pointerEvents: "none" }}>
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-paper/70 whitespace-nowrap">{lab.station}</div>
      </Html>

      {/* Railway corridor south-west of the tower */}
      <group position={[railway.center[0], 0.05, -railway.center[1]]} rotation={[0, Math.PI / 2 - rRot, 0]}>
        {Array.from({ length: railway.tracks }, (_, i) => (
          <mesh key={i} position={[0, 0, (i - (railway.tracks - 1) / 2) * railway.spacing]}>
            <boxGeometry args={[railway.length, 0.1, 1.5]} />
            <meshStandardMaterial color="#3d4956" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/**
 * Invisible volume over the garage footprint. Hovering the plaza around the tower
 * (or anything inside the basement volume once revealed) peeks at the garage.
 */
function GaragePeekTarget({ onChange }: { onChange: (v: boolean) => void }) {
  const geo = useMemo(() => extrudeUp(growPolygon(garagePolygon, 4), BASEMENT_LEVELS * BASEMENT_HEIGHT + 0.6), []);
  return (
    <mesh
      geometry={geo}
      position={[0, -BASEMENT_LEVELS * BASEMENT_HEIGHT - 0.3, 0]}
      onPointerOver={() => onChange(true)}
      onPointerOut={() => onChange(false)}
    >
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

function Garage({ lang }: { lang: Lang }) {
  const lab = ui[lang].viewer.labels;
  // Remember each material's designed opacity so the blender can scale it, and draw the
  // whole garage before the ground plane so it shows through the translucent plaza.
  const prime = (g: THREE.Group | null) => {
    if (!g) return;
    g.traverse((o) => {
      o.renderOrder = -2;
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (m && m.userData.baseOpacity === undefined) m.userData.baseOpacity = m.opacity;
    });
  };
  const bays = useMemo(() => {
    const all = parkingBays();
    // 182 spaces for the tower: 91 per level, closest to the ramp first
    const ramp: Pt = [30, 40];
    all.sort((a, b) => Math.hypot(a.x - ramp[0], -a.z - ramp[1]) - Math.hypot(b.x - ramp[0], -b.z - ramp[1]));
    return all.slice(0, 91);
  }, []);
  const inst = useRef<THREE.InstancedMesh>(null);
  const slab = useMemo(() => extrudeUp(garagePolygon, 0.3), []);
  const outline = useMemo(() => {
    const pts = garagePolygon.map(([e, n]) => new THREE.Vector3(e, 0, -n));
    pts.push(pts[0].clone());
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);
  const ramp = useMemo(() => extrudeUp(rampPolygon, 0.25), []);

  useEffect(() => {
    if (!inst.current) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3(1, 1, 1);
    let i = 0;
    for (let level = 0; level < BASEMENT_LEVELS; level++) {
      const y = -(level + 1) * BASEMENT_HEIGHT + 0.6;
      for (const b of bays) {
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), b.rot);
        m.compose(new THREE.Vector3(b.x, y, b.z), q, s);
        inst.current.setMatrixAt(i++, m);
      }
    }
    inst.current.count = i;
    inst.current.instanceMatrix.needsUpdate = true;
  }, [bays]);

  return (
    <group name="garage" ref={prime}>
      {Array.from({ length: BASEMENT_LEVELS }, (_, level) => {
        const yTop = -level * BASEMENT_HEIGHT;
        const yFloor = -(level + 1) * BASEMENT_HEIGHT;
        return (
          <group key={level}>
            <mesh geometry={slab} position={[0, yFloor, 0]}>
              <meshStandardMaterial color="#7dd3c0" transparent opacity={0.22} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
            <primitive object={new THREE.Line(outline, new THREE.LineBasicMaterial({ color: "#7dd3c0", transparent: true, opacity: 0.8 }))} position={[0, yFloor, 0]} />
            <primitive object={new THREE.Line(outline, new THREE.LineBasicMaterial({ color: "#7dd3c0", transparent: true, opacity: 0.35 }))} position={[0, yTop - 0.05, 0]} />
            <Html zIndexRange={[5, 0]} position={[-40, yFloor + 1, 30]} distanceFactor={200} style={{ pointerEvents: "none" }} className="garage-label">
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-accent whitespace-nowrap">
                {level === 0 ? lab.level1 : lab.level2}
              </div>
            </Html>
          </group>
        );
      })}
      {/* Vertical edges */}
      {garagePolygon.map(([e, n], i) => (
        <mesh key={i} position={[e, -BASEMENT_LEVELS * BASEMENT_HEIGHT * 0.5, -n]}>
          <boxGeometry args={[0.2, BASEMENT_LEVELS * BASEMENT_HEIGHT, 0.2]} />
          <meshBasicMaterial color="#7dd3c0" transparent opacity={0.6} />
        </mesh>
      ))}
      {/* Cores and raft foundation continue below ground */}
      {cores.map((c) => (
        <mesh key={c.name} position={[c.center[0], -BASEMENT_LEVELS * BASEMENT_HEIGHT * 0.5, -c.center[1]]} rotation={[0, DRAWING_ROT_Y, 0]}>
          <boxGeometry args={[c.size[0], BASEMENT_LEVELS * BASEMENT_HEIGHT, c.size[1]]} />
          <meshStandardMaterial color="#8d97a3" transparent opacity={0.7} />
        </mesh>
      ))}
      {/* Ramp */}
      <mesh geometry={ramp} position={[0, -BASEMENT_HEIGHT * 0.5, 0]} rotation={[0, 0, 0]}>
        <meshStandardMaterial color="#4f8fd6" transparent opacity={0.45} side={THREE.DoubleSide} />
      </mesh>
      <Html zIndexRange={[5, 0]} position={[38, 2, -50]} center distanceFactor={200} style={{ pointerEvents: "none" }} className="garage-label">
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-accent-2 whitespace-nowrap">{lab.ramp}</div>
      </Html>
      <instancedMesh ref={inst} args={[undefined, undefined, 91 * BASEMENT_LEVELS]}>
        <boxGeometry args={[2.2, 0.5, 4.6]} />
        <meshStandardMaterial color="#4f8fd6" emissive="#1d4f8f" emissiveIntensity={0.8} transparent opacity={0.9} />
      </instancedMesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Camera & scene                                                      */
/* ------------------------------------------------------------------ */

type ControlsLike = { target: THREE.Vector3; update: () => void };

/**
 * Eases the orbit target and camera distance when a mode changes (garage → look low,
 * explode → back off), then leaves the camera to the user. Portrait screens start farther out.
 */
function CameraRig({
  showGarage,
  explode,
  cleaning,
  controlsRef,
}: {
  showGarage: boolean;
  explode: boolean;
  cleaning: boolean;
  controlsRef: RefObject<ControlsLike | null>;
}) {
  const size = useThree((st) => st.size);
  const portrait = size.height > size.width;
  const mode = cleaning ? "cleaning" : showGarage ? "garage" : explode ? "explode" : "default";
  const facade = useFacadeFrame();
  const goal = useRef(new THREE.Vector3());
  const anim = useRef({ until: 0, mode: "" });
  const dirRef = useRef(new THREE.Vector3());

  useEffect(() => {
    anim.current = { until: performance.now() + 1600, mode };
  }, [mode, portrait]);

  // Deep link /#entrance: start at street level in front of the main entrance.
  const { camera: cam0 } = useThree();
  useEffect(() => {
    if (typeof window === "undefined" || window.location.hash !== "#entrance") return;
    const c = controlsRef.current;
    if (!c) return;
    const d = entrances()[0];
    const out = edgeOutwardNormal(stages[0].polygon, EDGE_SE);
    c.target.set(d.e, 3, -d.n);
    cam0.position.set(d.e + out[0] * 38, 7, -(d.n + out[1] * 38));
    anim.current = { until: 0, mode };
    c.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((st, dt) => {
    const c = controlsRef.current;
    if (!c) return;
    const camera = st.camera;
    if (cleaning) {
      // Face the Hardbruecke facade square-on, far enough to see the whole cleaning area.
      const { a, along, out, len, lowY, highY } = facade;
      const mx = a[0] + (along[0] * len) / 2;
      const mz = -(a[1] + (along[1] * len) / 2);
      const my = (lowY + highY) / 2;
      const dist = portrait ? 215 : 150;
      goal.current.set(mx + out[0] * dist, my + 6, mz - out[1] * dist);
      c.target.x = THREE.MathUtils.damp(c.target.x, mx, 3, dt);
      c.target.y = THREE.MathUtils.damp(c.target.y, my, 3, dt);
      c.target.z = THREE.MathUtils.damp(c.target.z, mz, 3, dt);
      camera.position.x = THREE.MathUtils.damp(camera.position.x, goal.current.x, 3, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, goal.current.y, 3, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, goal.current.z, 3, dt);
      c.update();
      return;
    }
    // Only steer the target while a mode transition is running; afterwards zoom-to-cursor
    // may carry the target wherever the user is looking (e.g. down to the entrance).
    if (performance.now() < anim.current.until) {
      c.target.x = THREE.MathUtils.damp(c.target.x, 0, 2.5, dt);
      c.target.z = THREE.MathUtils.damp(c.target.z, 0, 2.5, dt);
      const wantY = showGarage ? 2 : explode ? 96 : 58;
      c.target.y = THREE.MathUtils.damp(c.target.y, wantY, 2.5, dt);
      const base = showGarage ? 230 : explode ? 420 : 290;
      const wantDist = base * (portrait ? 1.8 : 1);
      const dir = dirRef.current;
      dir.copy(camera.position).sub(c.target);
      const dist = THREE.MathUtils.damp(dir.length(), wantDist, 2.5, dt);
      if (showGarage) dir.setY(THREE.MathUtils.damp(dir.y, dist * 0.42, 2.5, dt));
      camera.position.copy(c.target).add(dir.setLength(dist));
    }
    c.update();
  });
  return null;
}

const DAY_FOG = new THREE.Color("#1a2230");
const NIGHT_FOG = new THREE.Color("#070a10");
const DAY_SUN = new THREE.Color("#fff3dd");
const NIGHT_SUN = new THREE.Color("#9fb4d6");
const DAY_GROUND = new THREE.Color("#161d27");
const NIGHT_GROUND = new THREE.Color("#0d131a");

/**
 * Drives the day/night and garage fades imperatively every frame (no React re-renders):
 * lights, fog, sky intensities, ground opacity and garage opacities. React is only told
 * when the sky HDRI should swap (midpoint of the fade) and when the garage should mount.
 */
function Blender({
  night,
  garageOpen,
  onSkyNight,
  onGarageMounted,
}: {
  night: boolean;
  garageOpen: boolean;
  onSkyNight: (v: boolean) => void;
  onGarageMounted: (v: boolean) => void;
}) {
  const state = useRef({ night: night ? 1 : 0, garage: 0, skyNight: night, mounted: false });
  const tmp = useRef(new THREE.Color());

  useFrame(({ scene }, dt) => {
    const st = state.current;
    const refs = {
      ambient: scene.getObjectByName("ambient") as THREE.AmbientLight | undefined,
      sun: scene.getObjectByName("sun") as THREE.DirectionalLight | undefined,
      fill: scene.getObjectByName("fill") as THREE.DirectionalLight | undefined,
      fog: scene.fog as THREE.Fog | null,
      ground: (scene.getObjectByName("ground") as THREE.Mesh | undefined)?.material as THREE.MeshStandardMaterial | undefined,
      garage: scene.getObjectByName("garage") as THREE.Group | undefined,
    };
    st.night = THREE.MathUtils.damp(st.night, night ? 1 : 0, 2.2, dt);
    st.garage = THREE.MathUtils.damp(st.garage, garageOpen ? 1 : 0, 4, dt);
    if (Math.abs(st.night - (night ? 1 : 0)) < 0.004) st.night = night ? 1 : 0;
    if (Math.abs(st.garage - (garageOpen ? 1 : 0)) < 0.004) st.garage = garageOpen ? 1 : 0;
    const nt = st.night;
    const gt = st.garage;

    // lights and fog
    if (refs.ambient) refs.ambient.intensity = THREE.MathUtils.lerp(0.5, 0.22, nt);
    if (refs.sun) {
      refs.sun.intensity = THREE.MathUtils.lerp(2.4, 0.45, nt);
      refs.sun.color.copy(DAY_SUN).lerp(NIGHT_SUN, nt);
    }
    if (refs.fill) refs.fill.intensity = THREE.MathUtils.lerp(0.6, 0.2, nt);
    if (refs.fog) refs.fog.color.copy(DAY_FOG).lerp(NIGHT_FOG, nt);

    // sky: swap the HDRI at the midpoint, dipping through dark to hide the cut
    const skyNight = nt >= 0.5;
    if (skyNight !== st.skyNight) {
      st.skyNight = skyNight;
      onSkyNight(skyNight);
    }
    const dip = 1 - Math.min(1, Math.abs(nt - 0.5) * 2);
    scene.backgroundIntensity = (skyNight ? 0.22 : 0.55) * (1 - dip * 0.9);
    scene.environmentIntensity = (skyNight ? 0.5 : 0.8) * (1 - dip * 0.6);
    scene.backgroundBlurriness = skyNight ? 0.08 : 0.02;

    // ground and garage
    const ground = refs.ground;
    if (ground) {
      ground.opacity = THREE.MathUtils.lerp(1, 0.12, gt);
      ground.color.copy(tmp.current.copy(DAY_GROUND).lerp(NIGHT_GROUND, nt));
    }
    const mounted = gt > 0.001;
    if (mounted !== st.mounted) {
      st.mounted = mounted;
      onGarageMounted(mounted);
    }
    const g = refs.garage;
    if (g) {
      g.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.Material | undefined;
        if (m && m.userData.baseOpacity !== undefined) m.opacity = m.userData.baseOpacity * gt;
      });
      for (const el of document.querySelectorAll<HTMLElement>(".garage-label")) el.style.opacity = String(gt);
    }
  });
  return null;
}

function Scene(props: SceneProps) {
  const { night, showGarage, showTenants, explode, autoRotate, hovered, selected, cleaning, lang, onHover, onSelect, onStartCleaning, onCleanProgress, onHoverUnit } = props;
  const labelFloor = selected ?? hovered;
  const [peek, setPeek] = useState(false);
  const garageOpen = showGarage || (peek && !explode && !cleaning.active);
  const [skyNight, setSkyNight] = useState(night);
  const [garageMounted, setGarageMounted] = useState(false);
  const explodeRef = useRef({ gap: 0, thin: 1 });
  const extractRef = useRef<ExtractState>({ floor: -1, t: 0, open: 0, shift: 0, pos: new THREE.Vector3(), quat: new THREE.Quaternion() });
  const [interiorsActive, setInteriorsActive] = useState(false);
  const bind = useRef({ pos: new THREE.Vector3(), quat: new THREE.Quaternion(), q1: new THREE.Quaternion(), q2: new THREE.Quaternion(), rest: new THREE.Vector3(), off: new THREE.Vector3() });
  useFrame((st, dt) => {
    const x = explodeRef.current;
    x.gap = THREE.MathUtils.damp(x.gap, explode ? EXPLODE_GAP : 0, 4, dt);
    x.thin = THREE.MathUtils.damp(x.thin, explode ? 0.12 : 1, 4, dt);

    const ex = extractRef.current;
    const sel = selected !== null && !cleaning.active;
    if (sel && ex.floor !== selected) ex.floor = selected;
    // Choreography: open the stack above the floor, then pop the plate out; reverse on release.
    ex.open = THREE.MathUtils.damp(ex.open, sel ? 1 : ex.t < 0.3 ? 0 : 1, 3.5, dt);
    ex.t = THREE.MathUtils.damp(ex.t, sel && ex.open > 0.55 ? 1 : 0, 3.5, dt);
    ex.shift = THREE.MathUtils.damp(ex.shift, sel ? 1 : 0, 3, dt);
    if (!sel && ex.t < 0.002 && ex.open < 0.002) {
      ex.t = 0;
      ex.open = 0;
      ex.floor = -1;
    }
    if (ex.floor >= 0) {
      const f = ex.floor;
      const b = bind.current;
      const cam = st.camera;
      const size = st.size;
      // rest: the plate's slot in the (possibly exploded) stack
      b.rest.set(0, floorElevation(f) + PLATE_LIFT + f * x.gap, 0);
      // bound: a spot on the right of the view, tilted toward the viewer, long axis horizontal
      const dist = size.height > size.width ? 150 : 112;
      const right = size.height > size.width ? 0 : 44;
      const up = size.height > size.width ? -38 : -6;
      b.off.set(right, up, -dist).applyQuaternion(cam.quaternion);
      b.pos.copy(cam.position).add(b.off);
      b.q1.setFromAxisAngle(AX_X, 0.95);
      b.q2.setFromAxisAngle(AX_Y, PLATE_YAW);
      b.quat.copy(cam.quaternion).multiply(b.q1).multiply(b.q2);
      const e = ex.t * ex.t * (3 - 2 * ex.t);
      b.rest.lerp(b.pos, e);
      b.q1.identity().slerp(b.quat, e);
      const k = 1 - Math.exp(-7 * dt);
      ex.pos.lerp(b.rest, k);
      ex.quat.slerp(b.q1, k);
      // shift the picture right so the tower sits left of the pulled-out floor
      const cam2 = cam as THREE.PerspectiveCamera;
      if (ex.shift > 0.001) cam2.setViewOffset(size.width, size.height, ex.shift * 0.17 * size.width, 0, size.width, size.height);
      else if (cam2.view?.enabled) cam2.clearViewOffset();
    }
    const want = x.gap > 0.001 || ex.floor >= 0 || explode || selected !== null;
    if (want !== interiorsActive) setInteriorsActive(want);
  });
  const unit: UnitProps = { cleaning, onStart: onStartCleaning, onProgress: onCleanProgress, onHoverUnit };
  const dim = showTenants || explode;
  const controlsRef = useRef<ControlsLike | null>(null);
  const env = useHdri(skyNight);
  return (
    <>
      <fog attach="fog" args={["#1a2230", 420, 1100]} />

      <ambientLight name="ambient" intensity={0.5} />
      <directionalLight
        name="sun"
        position={[-140, 220, 120]}
        intensity={2.4}
        color="#fff3dd"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-260}
        shadow-camera-right={260}
        shadow-camera-top={260}
        shadow-camera-bottom={-260}
        shadow-camera-near={10}
        shadow-camera-far={700}
        shadow-bias={-0.0004}
      />
      <directionalLight name="fill" position={[160, 90, -140]} intensity={0.6} color="#8fc9ff" />

      <Environment map={env} background />
      <Blender night={night} garageOpen={garageOpen} onSkyNight={setSkyNight} onGarageMounted={setGarageMounted} />

      <group>
        <GlassStages night={night} dim={dim} env={env} unit={unit} explodeRef={explodeRef} extractRef={extractRef} />
        <Structure visible={showTenants && !explode} />
        <FloorSlices
          showTenants={showTenants}
          explode={explode}
          hovered={hovered}
          selected={selected}
          onHover={onHover}
          onSelect={onSelect}
          interactive={!cleaning.active}
          explodeRef={explodeRef}
          extractRef={extractRef}
        />
        <Interiors explodeRef={explodeRef} extractRef={extractRef} active={interiorsActive} />
        <Entrances />
        {labelFloor !== null && !cleaning.active && selected === null && <FloorLabel floor={labelFloor} explode={explode} lang={lang} />}
      </group>

      <Site lang={lang} />
      <GaragePeekTarget onChange={setPeek} />
      {garageMounted && <Garage lang={lang} />}

      <OrbitControls
        ref={controlsRef as never}
        makeDefault
        enablePan={false}
        enabled={!cleaning.active}
        autoRotate={autoRotate && !cleaning.active}
        autoRotateSpeed={0.5}
        zoomToCursor
        minDistance={explode ? 14 : 45}
        maxDistance={600}
        maxPolarAngle={showGarage ? Math.PI * 0.64 : Math.PI * 0.495}
        target={[0, 58, 0]}
      />
      <CameraRig showGarage={showGarage} explode={explode} cleaning={cleaning.active} controlsRef={controlsRef} />
    </>
  );
}

export default function TowerScene(props: SceneProps) {
  // Rendered client-side only (dynamic import, ssr: false), so window is available.
  const [dpr] = useState<[number, number]>(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches ? [1, 1.25] : [1, 1.75],
  );
  return (
    <Canvas
      shadows
      dpr={dpr}
      camera={{ position: [200, 120, 160], fov: 36, near: 1, far: 2500 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      onPointerMissed={() => props.onSelect(null)}
      className="!absolute inset-0"
    >
      <Suspense fallback={null}>
        <Scene {...props} />
      </Suspense>
    </Canvas>
  );
}
