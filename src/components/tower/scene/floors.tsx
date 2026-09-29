import * as THREE from "three";
import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { pick, type Lang } from "@/i18n";
import { ui } from "@/i18n/ui";
import { PLATE_LIFT, type ExtractState } from "../Interiors";
import { FLOORS, TOWER_HEIGHT, floorHeight, floorElevation, growPolygon, stages, stageForFloor, DRAWING_ROT_Y, cores, perimeterColumns } from "../geometry";
import { extrudeUp, bandForFloor, noRaycast, EXPLODE_GAP, liftAbove } from "./helpers";
import type { SceneProps } from "./types";

export function Structure({ visible }: { visible: boolean }) {
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

export function FloorSlices({
  showTenants,
  explode,
  hovered,
  selected,
  onHover,
  onSelect,
  interactive,
  explodeRef,
  extractRef,
  outgoingRef,
}: Pick<SceneProps, "showTenants" | "explode" | "hovered" | "selected" | "onHover" | "onSelect"> & {
  interactive: boolean;
  explodeRef: RefObject<{ gap: number; thin: number }>;
  extractRef: RefObject<ExtractState>;
  outgoingRef: RefObject<ExtractState>;
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
    const prev = outgoingRef.current;
    if (!group.current || !x || !ex || !prev) return;
    group.current.children.forEach((child, f) => {
      const slot = f === ex.floor ? ex : f === prev.floor ? prev : null;
      if (slot) {
        child.position.copy(slot.pos);
        child.quaternion.copy(slot.quat);
        child.scale.y = THREE.MathUtils.lerp(x.thin, 0.12, slot.t);
        return;
      }
      child.position.set(0, floorElevation(f) + PLATE_LIFT + f * x.gap + liftAbove(f, ex, prev), 0);
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

export function FloorLabel({ floor, explode, lang }: { floor: number; explode: boolean; lang: Lang }) {
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
