import * as THREE from "three";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Lang } from "@/i18n";
import { ui } from "@/i18n/ui";
import { BASEMENT_LEVELS, BASEMENT_HEIGHT, growPolygon, DRAWING_ROT_Y, cores, garagePolygon, rampPolygon, parkingBays, type Pt } from "../geometry";
import { extrudeUp } from "./helpers";
import { useStage } from "./stage";

/** 182 spaces for the tower: this many per level. */
const BAYS_PER_LEVEL = 91;

/**
 * The garage beneath the plaza: open with its toggle and in the explode view, peeked at while
 * the pointer is over the plaza (unless a game has the scene). It fades in and out with the
 * stage's garage blend, which the ground follows too, and is only mounted while it shows.
 */
export const Underground = memo(function Underground({ lang, open, busy }: { lang: Lang; open: boolean; busy: boolean }) {
  const { blendRef } = useStage();
  const [peek, setPeek] = useState(false);
  const [mounted, setMounted] = useState(false);
  const shown = open || (peek && !busy);
  const mountedRef = useRef(false);

  useFrame((_, dt) => {
    const b = blendRef.current;
    const want = shown ? 1 : 0;
    b.garage = THREE.MathUtils.damp(b.garage, want, 4, dt);
    if (Math.abs(b.garage - want) < 0.004) b.garage = want;
    const m = b.garage > 0.001;
    if (m !== mountedRef.current) {
      mountedRef.current = m;
      setMounted(m);
    }
  });

  return (
    <>
      <GaragePeekTarget onChange={setPeek} />
      {mounted && <Garage lang={lang} />}
    </>
  );
});

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
  const { blendRef } = useStage();
  const lab = ui[lang].viewer.labels;
  // the materials, whose designed opacity the fade scales, and the blend they were last set for
  const fading = useRef<{ mats: THREE.Material[]; at: number }>({ mats: [], at: -1 });
  const labelsRef = useRef<(HTMLDivElement | null)[]>([]);
  // Remember each material's designed opacity, and draw the whole garage before the ground
  // plane so it shows through the translucent plaza.
  const prime = (g: THREE.Group | null) => {
    if (!g) return;
    const mats = new Set<THREE.Material>();
    g.traverse((o) => {
      o.renderOrder = -2;
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (!m) return;
      m.userData.baseOpacity ??= m.opacity;
      mats.add(m);
    });
    fading.current.mats = [...mats];
    fading.current.at = -1;
  };
  const bays = useMemo(() => {
    const all = parkingBays();
    // closest to the ramp first
    const ramp: Pt = [30, 40];
    all.sort((a, b) => Math.hypot(a.x - ramp[0], -a.z - ramp[1]) - Math.hypot(b.x - ramp[0], -b.z - ramp[1]));
    return all.slice(0, BAYS_PER_LEVEL);
  }, []);
  const inst = useRef<THREE.InstancedMesh>(null);
  const slab = useMemo(() => extrudeUp(garagePolygon, 0.3), []);
  const ramp = useMemo(() => extrudeUp(rampPolygon, 0.25), []);
  // the outline at each level's floor, and fainter at its ceiling
  const outlines = useMemo(() => {
    const pts = garagePolygon.map(([e, n]) => new THREE.Vector3(e, 0, -n));
    pts.push(pts[0].clone());
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const floor = new THREE.LineBasicMaterial({ color: "#7dd3c0", transparent: true, opacity: 0.8 });
    const ceiling = new THREE.LineBasicMaterial({ color: "#7dd3c0", transparent: true, opacity: 0.35 });
    return Array.from({ length: BASEMENT_LEVELS }, () => ({ floor: new THREE.Line(geo, floor), ceiling: new THREE.Line(geo, ceiling) }));
  }, []);
  useEffect(
    () => () => {
      const { floor, ceiling } = outlines[0];
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
      (ceiling.material as THREE.Material).dispose();
    },
    [outlines],
  );

  useEffect(() => {
    if (!inst.current) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3(1, 1, 1);
    const up = new THREE.Vector3(0, 1, 0);
    let i = 0;
    for (let level = 0; level < BASEMENT_LEVELS; level++) {
      const y = -(level + 1) * BASEMENT_HEIGHT + 0.6;
      for (const b of bays) {
        q.setFromAxisAngle(up, b.rot);
        m.compose(p.set(b.x, y, b.z), q, s);
        inst.current.setMatrixAt(i++, m);
      }
    }
    inst.current.count = i;
    inst.current.instanceMatrix.needsUpdate = true;
  }, [bays]);

  // the fade: only while the blend moves
  useFrame(() => {
    const f = fading.current;
    const gt = blendRef.current.garage;
    if (gt === f.at) return;
    f.at = gt;
    for (const m of f.mats) m.opacity = m.userData.baseOpacity * gt;
    for (const el of labelsRef.current) if (el) el.style.opacity = String(gt);
  });

  return (
    <group ref={prime}>
      {outlines.map((o, level) => {
        const yTop = -level * BASEMENT_HEIGHT;
        const yFloor = -(level + 1) * BASEMENT_HEIGHT;
        return (
          <group key={level}>
            <mesh geometry={slab} position={[0, yFloor, 0]}>
              <meshStandardMaterial color="#7dd3c0" transparent opacity={0.22} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
            <primitive object={o.floor} position={[0, yFloor, 0]} />
            <primitive object={o.ceiling} position={[0, yTop - 0.05, 0]} />
            <Html
              ref={(el) => {
                labelsRef.current[level] = el;
              }}
              zIndexRange={[5, 0]} position={[-40, yFloor + 1, 30]} distanceFactor={200} style={{ pointerEvents: "none" }}>
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-accent whitespace-nowrap">{level === 0 ? lab.level1 : lab.level2}</div>
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
      <mesh geometry={ramp} position={[0, -BASEMENT_HEIGHT * 0.5, 0]}>
        <meshStandardMaterial color="#4f8fd6" transparent opacity={0.45} side={THREE.DoubleSide} />
      </mesh>
      <Html
        ref={(el) => {
          labelsRef.current[BASEMENT_LEVELS] = el;
        }}
        zIndexRange={[5, 0]} position={[38, 2, -50]} center distanceFactor={200} style={{ pointerEvents: "none" }}>
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-accent-2 whitespace-nowrap">{lab.ramp}</div>
      </Html>
      <instancedMesh ref={inst} args={[undefined, undefined, BAYS_PER_LEVEL * BASEMENT_LEVELS]}>
        <boxGeometry args={[2.2, 0.5, 4.6]} />
        <meshStandardMaterial color="#4f8fd6" emissive="#1d4f8f" emissiveIntensity={0.8} transparent opacity={0.9} />
      </instancedMesh>
    </group>
  );
}
