"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { floorElevation, FLOORS, TOWER_HEIGHT } from "./geometry";
import { buildInteriors, INTERIOR_BASE, INTERIOR_HEIGHT, KINDS, type Inst, type Kind } from "./interiorLayout";

const ONE = new THREE.Vector3(1, 1, 1);

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

/**
 * Pull-out state. `open` lifts everything above the floor; `t` blends the plate from its
 * slot to `pos`/`quat`, a transform kept relative to the camera by the Scene each frame.
 */
export type ExtractState = { floor: number; t: number; open: number; shift: number; pos: THREE.Vector3; quat: THREE.Quaternion };
export const OPEN_GAP = 9;
export const PLATE_LIFT = 0.2; // plate meshes sit this far above the floor elevation

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
  const applied = useRef({ gap: -1, open: -1, floor: -2 });
  const dummy = useRef(new THREE.Object3D());
  const plate = useRef(new THREE.Matrix4());
  const local = useRef(new THREE.Matrix4());
  const world = useRef(new THREE.Matrix4());
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const cyl = useMemo(() => new THREE.CylinderGeometry(0.5, 0.5, 1, 14), []);

  useFrame(() => {
    const gap = explodeRef.current?.gap ?? 0;
    const ex = extractRef.current;
    const a = applied.current;
    const exploded = gap > 0.001;
    const exFloor = ex?.floor ?? -1;
    const open = ex?.open ?? 0;
    const stackTop = TOWER_HEIGHT + (FLOORS - 1) * gap + (exFloor >= 0 ? OPEN_GAP * open : 0);

    // Whole stack (exploded view): recompose only when the gap, the opening or the floor changes.
    if (Math.abs(gap - a.gap) > 0.0005 || Math.abs(open - a.open) > 0.0005 || exFloor !== a.floor) {
      const d = dummy.current;
      for (const k of KINDS) {
        const mesh = refs.current[k];
        if (!mesh) continue;
        const list: Inst[] = data[k];
        let n = 0;
        if (exploded) {
          for (let i = 0; i < list.length; i++) {
            const it = list[i];
            const lift = exFloor >= 0 && it.f > exFloor ? OPEN_GAP * open : 0;
            d.position.set(it.e, floorElevation(it.f) + INTERIOR_BASE + it.f * gap + lift + it.y, -it.n);
            d.rotation.set(0, it.rot, 0);
            d.scale.set(it.sx, it.sy, it.sz);
            if (k === "liftCable") {
              const h = stackTop + INTERIOR_HEIGHT;
              d.position.y = h / 2;
              d.scale.y = h;
            }
            d.updateMatrix();
            mesh.setMatrixAt(n++, d.matrix);
          }
        }
        mesh.count = n;
        mesh.instanceMatrix.needsUpdate = true;
      }
      a.gap = gap;
      a.open = open;
      a.floor = exFloor;
    }

    // The pulled-out floor follows its camera-bound transform every frame.
    if (ex && exFloor >= 0) {
      plate.current.compose(ex.pos, ex.quat, ONE);
      const d = dummy.current;
      for (const k of KINDS) {
        if (k === "liftCable" || k === "liftCar") continue;
        const mesh = refs.current[k];
        if (!mesh) continue;
        const list: Inst[] = data[k];
        const [s0, s1] = ranges[k][exFloor];
        const base = exploded ? s0 : 0;
        for (let i = s0; i < s1; i++) {
          const it = list[i];
          d.position.set(it.e, INTERIOR_BASE - PLATE_LIFT + it.y, -it.n);
          d.rotation.set(0, it.rot, 0);
          d.scale.set(it.sx, it.sy, it.sz);
          d.updateMatrix();
          local.current.copy(d.matrix);
          world.current.multiplyMatrices(plate.current, local.current);
          mesh.setMatrixAt(base + (i - s0), world.current);
        }
        if (!exploded) mesh.count = s1 - s0;
        mesh.instanceMatrix.needsUpdate = true;
      }
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
        const lift = exFloor >= 0 && fl > exFloor ? OPEN_GAP * open : 0;
        d.position.set(it.e, elev + INTERIOR_BASE + fl * gap + lift + it.y, -it.n);
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
    const op = exploded ? Math.min(1, gap / 0.9) : (ex?.t ?? 0);
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
