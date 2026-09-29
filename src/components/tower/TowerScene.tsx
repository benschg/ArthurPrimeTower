"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Grid, Html, Lightformer, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { floorBands } from "@/data/tower";
import {
  BASEMENT_HEIGHT,
  BASEMENT_LEVELS,
  bridge,
  cores,
  DRAWING_ROT_Y,
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
  struts,
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
};

type SceneProps = ViewerState & {
  onHover: (floor: number | null) => void;
  onSelect: (floor: number | null) => void;
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

/** Procedural facade texture: slab band per floor, mullions every 1.5 m, "pixelated" open windows. */
function useFacadeTexture(night: boolean) {
  return useMemo(() => {
    const cellsX = 16; // 1.5 m panes → 24 m
    const cellsY = 6; // 3.35 m floors → 20.1 m
    const px = 64;
    const c = document.createElement("canvas");
    c.width = cellsX * px;
    c.height = cellsY * px;
    const ctx = c.getContext("2d")!;
    const glass = night ? "#0d2624" : "#2f7f78";
    const glassLight = night ? "#143d39" : "#3d968d";
    const lit = "#ffe2a0";
    const mullion = night ? "#091211" : "#1b3d3a";
    ctx.fillStyle = glass;
    ctx.fillRect(0, 0, c.width, c.height);
    for (let j = 0; j < cellsY; j++) {
      for (let i = 0; i < cellsX; i++) {
        const x = i * px;
        const y = j * px;
        const r = hash(i, j);
        ctx.fillStyle = night ? (r < 0.45 ? lit : r < 0.6 ? glassLight : glass) : r < 0.16 ? glassLight : glass;
        ctx.fillRect(x, y + px * 0.14, px, px * 0.86);
        ctx.fillStyle = mullion;
        ctx.fillRect(x, y, px, px * 0.14); // slab band
        ctx.fillRect(x, y, px * 0.05, px); // mullion
        if (r > 0.7) {
          ctx.fillStyle = night ? "#020505" : "#0e2624";
          ctx.fillRect(x + px * 0.95, y + px * 0.14, px * 0.05, px * 0.86); // opening slit
        }
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.repeat.set(1 / (cellsX * 1.5), 1 / (cellsY * TYP_HEIGHT));
    return tex;
  }, [night]);
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

function GlassStages({ night, dim }: { night: boolean; dim: boolean }) {
  const tex = useFacadeTexture(night);
  const geos = useMemo(
    () => stages.map((s) => extrudeUp(s.polygon, floorElevation(s.to) + floorHeight(s.to) - floorElevation(s.from))),
    [],
  );
  return (
    <group>
      {stages.map((s, i) => (
        <mesh key={i} geometry={geos[i]} position={[0, floorElevation(s.from), 0]} castShadow receiveShadow>
          <meshPhysicalMaterial
            map={tex}
            color={night ? "#8fb8b0" : "#c4ebe2"}
            metalness={0.3}
            roughness={0.16}
            clearcoat={1}
            clearcoatRoughness={0.08}
            envMapIntensity={night ? 0.5 : 1.3}
            transparent
            opacity={dim ? 0.14 : 1}
            emissive={night ? "#3a3220" : "#000000"}
            emissiveMap={night ? tex : undefined}
            emissiveIntensity={night ? 1 : 0}
            depthWrite={!dim}
          />
        </mesh>
      ))}
      {/* Roof plant enclosure and mast */}
      <mesh position={[0, TOWER_HEIGHT + 1.4, 0]} rotation={[0, DRAWING_ROT_Y, 0]} castShadow>
        <boxGeometry args={[22, 2.8, 12]} />
        <meshStandardMaterial color="#2a3542" roughness={0.9} />
      </mesh>
      <mesh position={[-4, TOWER_HEIGHT + 2.8 + 3.3, 2]}>
        <cylinderGeometry args={[0.12, 0.22, 6.6, 8]} />
        <meshStandardMaterial color="#d7dee6" />
      </mesh>
    </group>
  );
}

function Structure({ visible }: { visible: boolean }) {
  const columns = useMemo(() => perimeterColumns(stages[1].polygon), []);
  const list = useMemo(() => struts(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
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
      {list.map((s, i) => {
        const from = new THREE.Vector3(s.from[0], s.from[1], -s.from[2]);
        const to = new THREE.Vector3(s.to[0], s.to[1], -s.to[2]);
        const mid = from.clone().add(to).multiplyScalar(0.5);
        const dir = to.clone().sub(from);
        const len = dir.length();
        const quat = new THREE.Quaternion().setFromUnitVectors(up, dir.normalize());
        return (
          <mesh key={`s${i}`} position={mid} quaternion={quat}>
            <cylinderGeometry args={[0.4, 0.4, len, 10]} />
            <meshStandardMaterial color="#e0b458" metalness={0.3} roughness={0.5} emissive="#5a4210" emissiveIntensity={0.4} />
          </mesh>
        );
      })}
    </group>
  );
}

function FloorSlices({
  showTenants,
  explode,
  hovered,
  selected,
  onHover,
  onSelect,
}: Pick<SceneProps, "showTenants" | "explode" | "hovered" | "selected" | "onHover" | "onSelect">) {
  const geos = useMemo(
    () =>
      Array.from({ length: FLOORS }, (_, f) => {
        const s = stageForFloor(f);
        return extrudeUp(growPolygon(s.polygon, 0.1), floorHeight(f) - 0.4, true);
      }),
    [],
  );
  const group = useRef<THREE.Group>(null);
  const gap = useRef(0);

  useFrame((_, dt) => {
    gap.current = THREE.MathUtils.damp(gap.current, explode ? 1.8 : 0, 4, dt);
    if (!group.current) return;
    group.current.children.forEach((child, f) => {
      child.position.y = floorElevation(f) + 0.2 + f * gap.current;
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

function FloorLabel({ floor, explode }: { floor: number; explode: boolean }) {
  const band = bandForFloor(floor);
  const s = stageForFloor(floor);
  const v = s.polygon[4]; // east corner
  const y = floorElevation(floor) + floorHeight(floor) / 2 + (explode ? floor * 1.8 : 0);
  return (
    <Html position={[v[0] + 3, y, -v[1]]} distanceFactor={150} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
      <div className="glass rounded-md px-2.5 py-1.5 text-[11px] leading-tight whitespace-nowrap">
        <div className="font-mono text-accent">
          Floor {floor === 0 ? "G" : floor} · {floorElevation(floor).toFixed(1)} m
        </div>
        <div className="text-paper">{band?.label ?? "Offices"}</div>
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
        <Html position={[cx, height + 4, -cy]} center occlude distanceFactor={220} style={{ pointerEvents: "none" }}>
          <div className="text-center whitespace-nowrap">
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-paper/80">{name}</div>
            {note && <div className="text-[9px] text-muted">{note}</div>}
          </div>
        </Html>
      )}
    </group>
  );
}

function Site({ showGarage, night }: { showGarage: boolean; night: boolean }) {
  const bRot = (bridge.bearing * Math.PI) / 180;
  const rRot = (railway.bearing * Math.PI) / 180;
  const station = useMemo(() => extrudeUp(stationPlatform, 1.2), []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1200, 1200]} />
        <meshStandardMaterial
          color={night ? "#0d131a" : "#161d27"}
          roughness={1}
          transparent
          opacity={showGarage ? 0.12 : 1}
          depthWrite={!showGarage}
        />
      </mesh>
      <Grid
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
        <Html position={[110, bridge.deckHeight + 6, 0]} center occlude distanceFactor={220} style={{ pointerEvents: "none" }}>
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-paper/70 whitespace-nowrap">Hardbrücke</div>
        </Html>
      </group>

      {/* Bahnhof Hardbrücke platform (at ground level beneath the bridge) */}
      <mesh geometry={station} position={[0, 0.05, 0]} receiveShadow>
        <meshStandardMaterial color="#5b6774" roughness={0.9} />
      </mesh>
      <Html position={[38, 6, 45]} center occlude distanceFactor={220} style={{ pointerEvents: "none" }}>
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-paper/70 whitespace-nowrap">Bahnhof Hardbrücke</div>
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

function Garage() {
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
    <group>
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
            <Html position={[-40, yFloor + 1, 30]} distanceFactor={200} style={{ pointerEvents: "none" }}>
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-accent whitespace-nowrap">
                Level −{level + 1} · {level === 0 ? "parking, ramp from Zahnradstrasse" : "parking, plant & storage"}
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
      <Html position={[38, 2, -50]} center distanceFactor={200} style={{ pointerEvents: "none" }}>
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-accent-2 whitespace-nowrap">Garage ramp · Zahnradstrasse · 2.05 m clearance</div>
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
function CameraRig({ showGarage, explode, controlsRef }: { showGarage: boolean; explode: boolean; controlsRef: RefObject<ControlsLike | null> }) {
  const { camera, size } = useThree();
  const portrait = size.height > size.width;
  const mode = showGarage ? "garage" : explode ? "explode" : "default";
  const anim = useRef({ until: 0, mode: "" });
  const dirRef = useRef(new THREE.Vector3());

  useEffect(() => {
    anim.current = { until: performance.now() + 1600, mode };
  }, [mode, portrait]);

  useFrame((_, dt) => {
    const c = controlsRef.current;
    if (!c) return;
    const wantY = showGarage ? 2 : explode ? 96 : 58;
    c.target.y = THREE.MathUtils.damp(c.target.y, wantY, 2.5, dt);
    if (performance.now() < anim.current.until) {
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

function Scene(props: SceneProps) {
  const { night, showGarage, showTenants, explode, autoRotate, hovered, selected, onHover, onSelect } = props;
  const labelFloor = selected ?? hovered;
  const dim = showTenants || explode;
  const controlsRef = useRef<ControlsLike | null>(null);
  return (
    <>
      <color attach="background" args={[night ? "#04070b" : "#0b0f14"]} />
      <fog attach="fog" args={[night ? "#04070b" : "#0b0f14", 300, 900]} />

      <ambientLight intensity={night ? 0.22 : 0.5} />
      <directionalLight
        position={[-140, 220, 120]}
        intensity={night ? 0.45 : 2.4}
        color={night ? "#9fb4d6" : "#fff3dd"}
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
      <directionalLight position={[160, 90, -140]} intensity={night ? 0.2 : 0.6} color="#8fc9ff" />

      <Environment resolution={256} frames={1}>
        <Lightformer intensity={night ? 0.5 : 3} rotation-x={Math.PI / 2} position={[0, 80, 0]} scale={[160, 160, 1]} color="#dfe9ff" />
        <Lightformer intensity={night ? 0.3 : 1.6} rotation-y={Math.PI / 2} position={[-100, 30, 0]} scale={[80, 50, 1]} color="#ffe9c9" />
        <Lightformer intensity={night ? 0.3 : 1.2} rotation-y={-Math.PI / 2} position={[100, 30, 0]} scale={[80, 50, 1]} color="#bcd8ff" />
        <Lightformer intensity={night ? 0.9 : 0.4} form="ring" position={[0, -20, 0]} scale={100} color={night ? "#ffb36b" : "#3b4a5c"} />
      </Environment>

      <group>
        <GlassStages night={night} dim={dim} />
        <Structure visible={dim} />
        <FloorSlices showTenants={showTenants} explode={explode} hovered={hovered} selected={selected} onHover={onHover} onSelect={onSelect} />
        {labelFloor !== null && <FloorLabel floor={labelFloor} explode={explode} />}
      </group>

      <Site showGarage={showGarage} night={night} />
      {showGarage && <Garage />}

      <OrbitControls
        ref={controlsRef as never}
        makeDefault
        enablePan={false}
        autoRotate={autoRotate}
        autoRotateSpeed={0.5}
        minDistance={60}
        maxDistance={600}
        maxPolarAngle={showGarage ? Math.PI * 0.64 : Math.PI * 0.495}
        target={[0, 58, 0]}
      />
      <CameraRig showGarage={showGarage} explode={explode} controlsRef={controlsRef} />
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
      <Scene {...props} />
    </Canvas>
  );
}
