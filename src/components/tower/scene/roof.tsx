import * as THREE from "three";
import { useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { FLOORS, TOWER_HEIGHT, growPolygon, stages, DRAWING_ROT_Y } from "../geometry";
import { shapeFrom } from "./helpers";
import { liftAbove, useStage } from "./stage";
import { useGlowTexture, useLouvreTexture } from "./textures";

type Light = { position: [number, number, number]; mast: number };

/** A red aviation light on a short mast; Roof makes it pulse. */
function AviationLight({ position, mast, glow }: Light & { glow: THREE.Texture }) {
  return (
    <group position={position}>
      <mesh position={[0, mast / 2, 0]}>
        <cylinderGeometry args={[0.08, 0.1, mast, 6]} />
        <meshStandardMaterial color="#8b949e" />
      </mesh>
      <mesh position={[0, mast + 0.25, 0]}>
        <sphereGeometry args={[0.32, 12, 12]} />
        <meshStandardMaterial color="#ff2a1a" emissive="#ff3020" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      <sprite position={[0, mast + 0.25, 0]} scale={4}>
        <spriteMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
    </group>
  );
}

/**
 * Parapet, plant enclosure, mast and the ring of red aviation lights seen in photos. It rides
 * up with the top floor when the stack explodes or opens, and carries what stands on it.
 * `party`: the lights flash for a won game.
 */
export function Roof({ night, party, children }: { night: boolean; party: boolean; children?: ReactNode }) {
  const { explodeRef, extractRef, outgoingRef } = useStage();
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
  // Main mast with lights at the tip and mid-height; one near each roof corner, inset from the
  // parapet, skipping the two reflex corners.
  const lights = useMemo<Light[]>(
    () => [
      { position: [-4, TOWER_HEIGHT + 3.2 + 7.2, 2], mast: 0.6 },
      { position: [-4, TOWER_HEIGHT + 3.2 + 3.6, 2], mast: 0.2 },
      ...growPolygon(top, -1.6)
        .filter((_, i) => i !== 1 && i !== 5)
        .map(([e, n]): Light => ({ position: [e, TOWER_HEIGHT + 1.0, -n], mast: 2 })),
    ],
    [top],
  );
  const group = useRef<THREE.Group>(null);
  const lamps = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const g = group.current;
    if (g) g.position.y = (FLOORS - 1) * explodeRef.current.gap + liftAbove(FLOORS, extractRef.current, outgoingRef.current);
    const t = clock.elapsedTime;
    lamps.current?.children.forEach((light, i) => {
      const x = lights[i].position[0];
      const pulse = party ? 0.6 + 0.6 * Math.max(0, Math.sin(t * 9 + x * 0.7)) : 0.85 + 0.15 * Math.sin(t * 2.2 + x);
      const [, lamp, sprite] = light.children as [THREE.Mesh, THREE.Mesh, THREE.Sprite];
      sprite.scale.setScalar((night ? 9 : 3.2) * (party ? 1.6 : 1) * pulse);
      (lamp.material as THREE.MeshStandardMaterial).emissiveIntensity = (night ? 6 : 2.5) * pulse;
    });
  });

  return (
    <group ref={group}>
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
      <mesh position={[-4, TOWER_HEIGHT + 3.2 + 3.6, 2]}>
        <cylinderGeometry args={[0.1, 0.24, 7.2, 8]} />
        <meshStandardMaterial color="#d7dee6" metalness={0.4} roughness={0.4} />
      </mesh>
      <group ref={lamps}>
        {lights.map((l, i) => (
          <AviationLight key={i} {...l} glow={glow} />
        ))}
      </group>
      {children}
    </group>
  );
}
