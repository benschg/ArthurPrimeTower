"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { floorElevation, FLOORS, TOWER_HEIGHT } from "./geometry";
import { buildInteriors, INTERIOR_BASE, INTERIOR_HEIGHT, KINDS, type Inst, type Kind } from "./interiorLayout";

type Look = { color: string; roughness?: number; metalness?: number; emissive?: string; cylinder?: boolean; opacity?: number };

const LOOK: Record<Kind, Look> = {
  partition: { color: "#e6e9ee", roughness: 0.9 },
  corridorWall: { color: "#d5dae2", roughness: 0.9 },
  door: { color: "#b98a5a", roughness: 0.7 },
  desk: { color: "#f2ede4", roughness: 0.6 },
  chairSeat: { color: "#2f3a47", roughness: 0.8 },
  chairBack: { color: "#2f3a47", roughness: 0.8 },
  screen: { color: "#0b0f14", roughness: 0.3, metalness: 0.3, emissive: "#2a4a6a" },
  table: { color: "#e9e2d3", roughness: 0.6 },
  roundTable: { color: "#f4efe6", roughness: 0.6, cylinder: true },
  coreWall: { color: "#8d97a3", roughness: 0.95 },
  column: { color: "#b9c2cc", roughness: 0.7, cylinder: true },
  liftShaft: { color: "#4a5563", roughness: 0.9, opacity: 0.55 },
  liftDoor: { color: "#cfd6dd", roughness: 0.35, metalness: 0.6 },
  stairStep: { color: "#a7b0ba", roughness: 0.9 },
  reception: { color: "#1f4b46", roughness: 0.5 },
  lounge: { color: "#f4efe6", roughness: 0.6, cylinder: true },
  liftCable: { color: "#e3e8ee", roughness: 0.3, metalness: 0.8, cylinder: true },
  liftCar: { color: "#f3c34a", roughness: 0.5, metalness: 0.2, emissive: "#8a6a10" },
};

export type ExtractState = { floor: number; t: number; dx: number; dz: number };
export const EXTRACT_DISTANCE = 78;

/**
 * Instanced interiors. One InstancedMesh per kind covers all 36 floors. In the exploded
 * view every floor is drawn (with lift cables spanning the whole stack); when a single
 * floor is pulled out of the tower only that floor's pieces are drawn, at its offset.
 * Matrices recompose only while the explode gap or the pull-out amount is changing.
 */
export function Interiors({
  explodeRef,
  extractRef,
  active,
}: {
  explodeRef: RefObject<{ gap: number; thin: number }>;
  extractRef: RefObject<ExtractState>;
  active: boolean;
}) {
  const data = useMemo(() => buildInteriors(), []);
  // per kind, per floor: [start, end) into the instance list (instances are built floor by floor)
  const ranges = useMemo(() => {
    const r = {} as Record<Kind, [number, number][]>;
    for (const k of KINDS) {
      const list = data[k];
      const arr: [number, number][] = Array.from({ length: FLOORS }, () => [0, 0]);
      let i = 0;
      for (let f = 0; f < FLOORS; f++) {
        const start = i;
        while (i < list.length && list[i].f === f) i++;
        arr[f] = [start, i];
      }
      r[k] = arr;
    }
    return r;
  }, [data]);
  const refs = useRef<Partial<Record<Kind, THREE.InstancedMesh>>>({});
  const applied = useRef({ gap: -1, t: -1, floor: -2 });
  const dummy = useRef(new THREE.Object3D());
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const cyl = useMemo(() => new THREE.CylinderGeometry(0.5, 0.5, 1, 14), []);

  useFrame(() => {
    const gap = explodeRef.current?.gap ?? 0;
    const ex = extractRef.current ?? { floor: -1, t: 0, dx: 1, dz: 0 };
    const a = applied.current;
    const exploded = gap > 0.001;
    if (Math.abs(gap - a.gap) > 0.0005 || Math.abs(ex.t - a.t) > 0.0005 || ex.floor !== a.floor) {
      const d = dummy.current;
      const offX = ex.dx * EXTRACT_DISTANCE * ex.t;
      const offZ = ex.dz * EXTRACT_DISTANCE * ex.t;
      const stackTop = TOWER_HEIGHT + (FLOORS - 1) * gap;
      for (const k of KINDS) {
        const mesh = refs.current[k];
        if (!mesh) continue;
        const list: Inst[] = data[k];
        let n = 0;
        const place = (it: Inst) => {
          const pulled = it.f === ex.floor;
          d.position.set(
            it.e + (pulled ? offX : 0),
            floorElevation(it.f) + INTERIOR_BASE + it.f * gap + it.y,
            -it.n + (pulled ? offZ : 0),
          );
          d.rotation.set(0, it.rot, 0);
          d.scale.set(it.sx, it.sy, it.sz);
          if (k === "liftCable") {
            const h = stackTop + INTERIOR_HEIGHT;
            d.position.y = h / 2;
            d.scale.y = h;
          }
          d.updateMatrix();
          mesh.setMatrixAt(n++, d.matrix);
        };
        if (exploded) {
          for (let i = 0; i < list.length; i++) place(list[i]);
        } else if (ex.floor >= 0 && k !== "liftCable") {
          const [s0, s1] = ranges[k][ex.floor];
          for (let i = s0; i < s1; i++) place(list[i]);
        }
        mesh.count = n;
        mesh.instanceMatrix.needsUpdate = true;
      }
      a.gap = gap;
      a.t = ex.t;
      a.floor = ex.floor;
    }
    // lift cars travel their shafts (exploded view only)
    const cars = refs.current.liftCar;
    if (cars && exploded) {
      const d = dummy.current;
      const list = data.liftCar;
      const time = performance.now() / 1000;
      for (let i = 0; i < list.length; i++) {
        const it = list[i];
        const mid = i === 8 ? 12 : 17.5;
        const amp = i === 8 ? 11 : 16.5;
        const fl = mid + amp * Math.sin(time * (0.16 + i * 0.023) + i * 1.7);
        const lo = Math.floor(fl);
        const frac = fl - lo;
        const elev = THREE.MathUtils.lerp(floorElevation(lo), floorElevation(Math.min(FLOORS - 1, lo + 1)), frac);
        d.position.set(it.e, elev + INTERIOR_BASE + fl * gap + it.y, -it.n);
        d.rotation.set(0, it.rot, 0);
        d.scale.set(it.sx, it.sy, it.sz);
        d.updateMatrix();
        cars.setMatrixAt(i, d.matrix);
      }
      cars.count = list.length;
      cars.instanceMatrix.needsUpdate = true;
    } else if (cars && !exploded) {
      cars.count = 0;
    }
    const op = exploded ? Math.min(1, gap / 0.9) : ex.t;
    for (const k of KINDS) {
      const m = refs.current[k]?.material as THREE.MeshStandardMaterial | undefined;
      if (m) m.opacity = (LOOK[k].opacity ?? 1) * op;
    }
  });

  if (!active) return null;
  return (
    <group>
      {KINDS.map((k) => (
        <instancedMesh
          key={k}
          ref={(m) => {
            refs.current[k] = m ?? undefined;
          }}
          args={[LOOK[k].cylinder ? cyl : box, undefined, Math.max(1, data[k].length)]}
          frustumCulled={false}
          castShadow={k === "coreWall" || k === "partition"}
        >
          <meshStandardMaterial
            color={LOOK[k].color}
            roughness={LOOK[k].roughness ?? 0.8}
            metalness={LOOK[k].metalness ?? 0}
            emissive={LOOK[k].emissive ?? "#000000"}
            emissiveIntensity={LOOK[k].emissive ? 0.8 : 0}
            transparent
            opacity={0}
          />
        </instancedMesh>
      ))}
    </group>
  );
}
