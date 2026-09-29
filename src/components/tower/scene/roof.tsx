import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { TOWER_HEIGHT, growPolygon, stages, DRAWING_ROT_Y } from "../geometry";
import { shapeFrom } from "./helpers";
import { useGlowTexture, useLouvreTexture } from "./textures";

export function AviationLight({ position, night, glow, mast = 2, party = false }: { position: [number, number, number]; night: boolean; glow: THREE.Texture; mast?: number; party?: boolean }) {
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
export function Roof({ night, party }: { night: boolean; party: boolean }) {
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
