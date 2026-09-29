import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { Html } from "@react-three/drei";
import type { Lang } from "@/i18n";
import { ui } from "@/i18n/ui";
import { BASEMENT_LEVELS, BASEMENT_HEIGHT, growPolygon, DRAWING_ROT_Y, cores, garagePolygon, rampPolygon, parkingBays, type Pt } from "../geometry";
import { extrudeUp } from "./helpers";

/**
 * Invisible volume over the garage footprint. Hovering the plaza around the tower
 * (or anything inside the basement volume once revealed) peeks at the garage.
 */
export function GaragePeekTarget({ onChange }: { onChange: (v: boolean) => void }) {
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

export function Garage({ lang }: { lang: Lang }) {
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
