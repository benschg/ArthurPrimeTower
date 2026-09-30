import * as THREE from "three";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { pick, type Lang } from "@/i18n";
import { ui } from "@/i18n/ui";
import { PLATE_LIFT, type ExtractState } from "../Interiors";
import { FLOORS, TOWER_HEIGHT, floorHeight, floorElevation, growPolygon, stages, stageForFloor, DRAWING_ROT_Y, cores, perimeterColumns } from "../geometry";
import { extrudeUp, bandForFloor, EXPLODE_GAP, liftAbove, bulgeLift, bulgeScale, type ExplodeState } from "./helpers";
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

/** Picking volumes reach this far past the glass so the facade itself is hoverable. */
const PICK_PAD = 0.25;

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
  onPlateDrag,
  onPlateZoom,
}: Pick<SceneProps, "showTenants" | "explode" | "hovered" | "selected" | "onHover" | "onSelect"> & {
  interactive: boolean;
  explodeRef: RefObject<ExplodeState>;
  extractRef: RefObject<ExtractState>;
  outgoingRef: RefObject<ExtractState>;
  onPlateDrag: (dx: number, dy: number) => void;
  onPlateZoom: (factor: number) => void;
}) {
  // Interaction on the pulled-out plate: drag turns/tilts it, wheel zooms it. The events are
  // stopped before OrbitControls sees them so the camera stays put.
  const drag = useRef({ active: false, x: 0, y: 0, moved: 0 });
  const hoverPlate = useRef(false);
  const gl = useThree((st) => st.gl);
  const isBound = (f: number) => {
    const ex = extractRef.current;
    return !!ex && ex.floor === f && ex.t > 0.9;
  };
  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      if (!hoverPlate.current) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onPlateZoom(Math.exp(-e.deltaY * 0.0012));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [gl, onPlateZoom]);
  const geos = useMemo(
    () =>
      Array.from({ length: FLOORS }, (_, f) => {
        const s = stageForFloor(f);
        return extrudeUp(growPolygon(s.polygon, 0.1), floorHeight(f) - 0.4, true);
      }),
    [],
  );
  // Picking volumes: the footprint extruded 1 m (scaled in y per frame), one per floor. The
  // visible plate is thin and its interior is full of gaps, so the pointer would fall through
  // it between floors; a solid volume per floor cannot be missed.
  const pickGeos = useMemo(() => Array.from({ length: FLOORS }, (_, f) => extrudeUp(growPolygon(stageForFloor(f).polygon, PICK_PAD), 1)), []);
  const group = useRef<THREE.Group>(null);
  const picks = useRef<THREE.Group>(null);
  const bases = useRef(new Float64Array(FLOORS));
  const pickOff = useRef(Array.from({ length: FLOORS }, () => false));
  const hoverF = useRef<number | null>(null);

  // Plates are only pickable while bound to the camera (for the drag); everything else is
  // picked through the volumes, which switch off for a floor that is out of the stack.
  const plateRaycast = useMemo(
    () =>
      Array.from({ length: FLOORS }, (_, f) =>
        function (this: THREE.Mesh, rc: THREE.Raycaster, its: THREE.Intersection[]) {
          const ex = extractRef.current;
          if (!interactive || !ex || ex.floor !== f || ex.t <= 0.9) return;
          THREE.Mesh.prototype.raycast.call(this, rc, its);
        },
      ),
    [interactive, extractRef],
  );
  const pickRaycast = useMemo(
    () =>
      Array.from({ length: FLOORS }, (_, f) =>
        function (this: THREE.Mesh, rc: THREE.Raycaster, its: THREE.Intersection[]) {
          if (!interactive || pickOff.current[f]) return;
          THREE.Mesh.prototype.raycast.call(this, rc, its);
        },
      ),
    [interactive],
  );

  useFrame(() => {
    // the Scene damps the explode and pull-out amounts; plates follow them
    const x = explodeRef.current;
    const ex = extractRef.current;
    const prev = outgoingRef.current;
    if (!group.current || !picks.current || !x || !ex || !prev) return;

    // Bottom of every floor's slot, without the hover bulge.
    const base = bases.current;
    for (let f = 0; f < FLOORS; f++) base[f] = floorElevation(f) + f * x.gap + liftAbove(f, ex, prev);

    group.current.children.forEach((child, f) => {
      const slot = f === ex.floor ? ex : f === prev.floor ? prev : null;
      if (slot) {
        child.position.copy(slot.pos);
        child.quaternion.copy(slot.quat);
        child.scale.set(1, THREE.MathUtils.lerp(x.thin, 0.12, slot.t), 1);
        return;
      }
      child.position.set(0, base[f] + PLATE_LIFT + bulgeLift(f, x), 0);
      child.quaternion.identity();
      const bs = bulgeScale(f, x);
      child.scale.set(bs, x.thin, bs);
    });

    picks.current.children.forEach((child, f) => {
      // Each volume runs from the middle of the gap below it to the middle of the gap above,
      // so neighbours share a face: the pointer can never fall between two floors. The volumes
      // deliberately ignore the hover bulge, so a bulging floor cannot move its own picking
      // region out from under the pointer and make the hover jitter.
      const lo = f === 0 ? base[0] - 1 : (base[f - 1] + floorHeight(f - 1) + base[f]) / 2;
      const hi = f === FLOORS - 1 ? base[f] + floorHeight(f) + 2 : (base[f] + floorHeight(f) + base[f + 1]) / 2;
      child.position.set(0, lo, 0);
      child.scale.set(1, Math.max(hi - lo, 0.05), 1);
      pickOff.current[f] = (f === ex.floor && ex.t > 0.02) || (f === prev.floor && prev.t > 0.02);
    });
  });

  return (
    <>
      <group ref={picks}>
        {pickGeos.map((g, f) => (
          <mesh
            key={f}
            geometry={g}
            raycast={pickRaycast[f]}
            onPointerOver={(e) => {
              e.stopPropagation();
              hoverF.current = f;
              onHover(f);
            }}
            onPointerOut={() => {
              // the pointer may enter the next volume before this one reports the exit
              if (hoverF.current !== f) return;
              hoverF.current = null;
              onHover(null);
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(selected === f ? null : f);
            }}
          >
            {/* invisible but pickable: nothing is written to colour or depth */}
            <meshBasicMaterial colorWrite={false} depthWrite={false} />
          </mesh>
        ))}
      </group>
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
            raycast={plateRaycast[f]}
            onPointerOver={(e) => {
              e.stopPropagation();
              if (isBound(f)) hoverPlate.current = true;
            }}
            onPointerOut={() => {
              if (isBound(f)) hoverPlate.current = false;
            }}
            onPointerDown={(e) => {
              if (!isBound(f)) return;
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
              (e.target as Element | undefined)?.setPointerCapture?.(e.pointerId);
              drag.current = { active: true, x: e.nativeEvent.clientX, y: e.nativeEvent.clientY, moved: 0 };
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (!d.active) return;
              const dx = e.nativeEvent.clientX - d.x;
              const dy = e.nativeEvent.clientY - d.y;
              d.x = e.nativeEvent.clientX;
              d.y = e.nativeEvent.clientY;
              d.moved += Math.abs(dx) + Math.abs(dy);
              onPlateDrag(dx, dy);
            }}
            onPointerUp={(e) => {
              if (!drag.current.active) return;
              drag.current.active = false;
              (e.target as Element | undefined)?.releasePointerCapture?.(e.pointerId);
            }}
            onClick={(e) => {
              e.stopPropagation();
              // a drag on the pulled-out plate is not a click
              if (drag.current.moved > 4) {
                drag.current.moved = 0;
                return;
              }
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
    </>
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
