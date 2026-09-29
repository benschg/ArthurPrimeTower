import { useMemo } from "react";
import { entrances } from "../entrances";

/** Ground-floor entrances: frames, glass leaves and the canopy over the main entrance. */
export function Entrances() {
  const list = useMemo(() => entrances(), []);
  return (
    <group>
      {list.map((d) => {
        const main = d.name === "main";
        const h = main ? 3.2 : 2.9;
        return (
          <group key={d.name} position={[d.e, 0, -d.n]} rotation={[0, d.rot, 0]}>
            {/* frame: two jambs and a header, so the lobby shows through the glass */}
            {[-1, 1].map((side) => (
              <mesh key={`j${side}`} position={[side * (d.width / 2 + 0.08), h / 2, 0]}>
                <boxGeometry args={[0.16, h, 0.24]} />
                <meshStandardMaterial color="#141a21" roughness={0.6} metalness={0.4} />
              </mesh>
            ))}
            <mesh position={[0, h - 0.12, 0]}>
              <boxGeometry args={[d.width + 0.32, 0.24, 0.24]} />
              <meshStandardMaterial color="#141a21" roughness={0.6} metalness={0.4} />
            </mesh>
            {/* lit lobby behind the doors */}
            <mesh position={[0, (h - 0.24) / 2, -0.6]}>
              <boxGeometry args={[d.width, h - 0.24, 0.05]} />
              <meshStandardMaterial color="#3d5f58" emissive="#8fd3c4" emissiveIntensity={0.55} roughness={1} />
            </mesh>
            {/* glass leaves, one slightly ajar */}
            {[-1, 1].map((side) => (
              <mesh key={side} position={[side * (d.width / 4), (h - 0.24) / 2, side < 0 ? 0.22 : 0.05]} rotation={[0, side < 0 ? -0.3 : 0, 0]}>
                <boxGeometry args={[d.width / 2 - 0.1, h - 0.3, 0.04]} />
                <meshPhysicalMaterial color="#cfeee6" roughness={0.05} metalness={0.1} transparent opacity={0.35} />
              </mesh>
            ))}
            {/* handles */}
            {[-1, 1].map((side) => (
              <mesh key={`h${side}`} position={[side * 0.25, 1.05, 0.2]}>
                <cylinderGeometry args={[0.02, 0.02, 0.9, 6]} />
                <meshStandardMaterial color="#d7dee6" metalness={0.7} roughness={0.3} />
              </mesh>
            ))}
            {main && (
              <>
                {/* canopy with the PRIME TOWER fascia */}
                <mesh position={[0, h + 0.55, 1.9]} castShadow>
                  <boxGeometry args={[d.width + 3.2, 0.3, 3.8]} />
                  <meshStandardMaterial color="#3a4652" roughness={0.6} metalness={0.3} />
                </mesh>
                <mesh position={[0, h + 0.55, 3.8]}>
                  <boxGeometry args={[d.width + 3.2, 0.5, 0.06]} />
                  <meshStandardMaterial color="#e8edf2" emissive="#e8edf2" emissiveIntensity={0.9} toneMapped={false} />
                </mesh>
                <mesh position={[0, h + 0.38, 1.9]}>
                  <boxGeometry args={[d.width + 3.0, 0.04, 3.6]} />
                  <meshStandardMaterial color="#fff2d6" emissive="#fff2d6" emissiveIntensity={0.8} toneMapped={false} />
                </mesh>
                {[-1, 1].map((side) => (
                  <mesh key={`c${side}`} position={[side * (d.width / 2 + 1.2), (h + 0.4) / 2, 3.3]}>
                    <cylinderGeometry args={[0.12, 0.12, h + 0.4, 10]} />
                    <meshStandardMaterial color="#8b949e" metalness={0.5} roughness={0.5} />
                  </mesh>
                ))}
              </>
            )}
          </group>
        );
      })}
    </group>
  );
}
