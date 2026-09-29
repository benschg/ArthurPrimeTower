"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { floorElevation } from "./geometry";
import { buildInteriors, INTERIOR_BASE, KINDS, type Inst, type Kind } from "./interiorLayout";

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
  liftShaft: { color: "#4a5563", roughness: 0.9 },
  liftDoor: { color: "#cfd6dd", roughness: 0.35, metalness: 0.6 },
  stairStep: { color: "#a7b0ba", roughness: 0.9 },
  reception: { color: "#1f4b46", roughness: 0.5 },
  lounge: { color: "#f4efe6", roughness: 0.6, cylinder: true },
};

/**
 * Instanced interiors for the exploded view. One InstancedMesh per kind covers all 36
 * floors; matrices are recomposed only while the explode gap is changing.
 */
export function Interiors({ explodeRef, explode }: { explodeRef: RefObject<{ gap: number; thin: number }>; explode: boolean }) {
  const data = useMemo(() => buildInteriors(), []);
  const refs = useRef<Partial<Record<Kind, THREE.InstancedMesh>>>({});
  const applied = useRef(-1);
  const dummy = useRef(new THREE.Object3D());
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const cyl = useMemo(() => new THREE.CylinderGeometry(0.5, 0.5, 1, 14), []);

  useFrame(() => {
    const gap = explodeRef.current?.gap ?? 0;
    if (Math.abs(gap - applied.current) > 0.0005) {
      const d = dummy.current;
      for (const k of KINDS) {
        const mesh = refs.current[k];
        if (!mesh) continue;
        const list: Inst[] = data[k];
        for (let i = 0; i < list.length; i++) {
          const it = list[i];
          d.position.set(it.e, floorElevation(it.f) + INTERIOR_BASE + it.f * gap + it.y, -it.n);
          d.rotation.set(0, it.rot, 0);
          d.scale.set(it.sx, it.sy, it.sz);
          d.updateMatrix();
          mesh.setMatrixAt(i, d.matrix);
        }
        mesh.count = list.length;
        mesh.instanceMatrix.needsUpdate = true;
      }
      applied.current = gap;
    }
    // fade with the explode amount so interiors do not pop in
    const op = Math.min(1, gap / 0.9);
    for (const k of KINDS) {
      const m = refs.current[k]?.material as THREE.MeshStandardMaterial | undefined;
      if (m) m.opacity = (LOOK[k].opacity ?? 1) * op;
    }
  });

  if (!explode) return null;
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
