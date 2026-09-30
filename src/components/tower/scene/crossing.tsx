import * as THREE from "three";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { bridge, bridgePoint } from "../geometry";
import { COLS, ROWS, STEP } from "../crossing/game";
import { DECK_TOP } from "../crossing/road";
import { crossing, useCrossingActive } from "../crossing/store";

const ACCENT = "#7dd3c0";
const SKIN = "#5cb84a";
const SKIN_DARK = "#3f8f3a";
/** Width of the stretch of bridge the game is played on. */
const PITCH = (2 * COLS + 1) * STEP;
/** Middle of a footway, metres from the bridge's centreline. */
const FOOTWAY = bridge.width / 2 - 1;

/**
 * Where the camera sits for the game and what it looks at, in world coordinates: beside the
 * bridge on the side away from the tower, looking down across the deck, so that the bridge
 * runs left to right and the far footway is up. Upright screens need more distance to take
 * the pitch in.
 */
export function crossingView(portrait: boolean): { target: [number, number, number]; camera: [number, number, number] } {
  const dist = portrait ? 150 : 62;
  const tilt = (52 * Math.PI) / 180;
  // look a little to the left of the pitch on wide screens: the HUD covers that corner
  const along = portrait ? 0 : -5;
  // and a little beyond the middle on upright ones, where the warning sign hangs above the deck
  const across = portrait ? -4 : 0;
  const at = bridgePoint(along, across);
  const from = bridgePoint(along, across + dist * Math.cos(tilt));
  return { target: [at[0], DECK_TOP, -at[1]], camera: [from[0], DECK_TOP + dist * Math.sin(tilt), -from[1]] };
}

/**
 * The frog of the Hardbrücke game (a good deal larger than life, to be seen from up there)
 * and the footway to reach, lit up. A child of the bridge's group; the game itself is
 * stepped with the traffic (see BridgeTraffic).
 */
export function CrossingFrog() {
  const active = useCrossingActive();
  const spot = useRef<THREE.Group>(null);
  const frog = useRef<THREE.Group>(null);
  const ring = useRef<THREE.MeshBasicMaterial>(null);
  const goal = useRef<THREE.Mesh>(null);
  const goalMat = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((st) => {
    const g = crossing.game;
    if (!g || !spot.current || !frog.current || !goal.current || !goalMat.current || !ring.current) return;
    const t = st.clock.elapsedTime;
    spot.current.position.set(g.x, DECK_TOP + 0.12, g.z);
    const down = g.phase === "hit" || g.phase === "over";
    const leap = Math.sin(Math.PI * g.hop);
    frog.current.position.y = down ? 0 : g.lift;
    frog.current.rotation.y = g.heading;
    // run over: flat on the road, as in the arcade; a leap stretches it out
    if (down) frog.current.scale.set(1.5, 0.12, 1.5);
    else frog.current.scale.set(1 - 0.1 * leap, 1 - 0.1 * leap, 1 + 0.35 * leap);
    ring.current.color.set(down ? "#ff5a4a" : ACCENT);
    ring.current.opacity = down ? 0.9 : 0.55 + 0.25 * Math.sin(t * 6);
    goal.current.position.z = g.home === 0 ? -FOOTWAY : FOOTWAY;
    goal.current.visible = g.phase !== "over";
    goalMat.current.opacity = 0.3 + 0.18 * Math.sin(t * 4);
  });

  if (!active) return null;
  return (
    <group>
      <mesh ref={goal} position={[0, DECK_TOP + 0.2, -FOOTWAY]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[PITCH, 2]} />
        <meshBasicMaterial ref={goalMat} color={ACCENT} transparent opacity={0.3} depthWrite={false} toneMapped={false} />
      </mesh>
      <group ref={spot} position={[0, DECK_TOP + 0.12, ROWS[0]]} scale={1.3}>
        {/* a ring on the ground keeps the frog findable between the vehicles */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
          <ringGeometry args={[0.8, 1.02, 28]} />
          <meshBasicMaterial ref={ring} color={ACCENT} transparent opacity={0.7} depthWrite={false} toneMapped={false} />
        </mesh>
        {/* the frog faces +z */}
        <group ref={frog}>
          <mesh position={[0, 0.4, -0.08]} scale={[1, 0.62, 1.2]} castShadow>
            <sphereGeometry args={[0.5, 20, 14]} />
            <meshStandardMaterial color={SKIN} emissive={SKIN} emissiveIntensity={0.3} roughness={0.55} />
          </mesh>
          <mesh position={[0, 0.5, 0.42]} scale={[1.05, 0.68, 0.95]} castShadow>
            <sphereGeometry args={[0.38, 18, 12]} />
            <meshStandardMaterial color={SKIN} emissive={SKIN} emissiveIntensity={0.3} roughness={0.55} />
          </mesh>
          {[-1, 1].map((s) => (
            <group key={s}>
              {/* eye, bulging on top of the head */}
              <mesh position={[s * 0.24, 0.8, 0.46]}>
                <sphereGeometry args={[0.17, 14, 10]} />
                <meshStandardMaterial color="#f6f8e6" emissive="#f6f8e6" emissiveIntensity={0.35} roughness={0.4} />
              </mesh>
              <mesh position={[s * 0.25, 0.86, 0.58]}>
                <sphereGeometry args={[0.085, 10, 8]} />
                <meshBasicMaterial color="#10151b" />
              </mesh>
              {/* hind leg, folded, and its foot */}
              <mesh position={[s * 0.5, 0.24, -0.42]} scale={[0.72, 0.62, 1.3]} castShadow>
                <sphereGeometry args={[0.28, 12, 10]} />
                <meshStandardMaterial color={SKIN_DARK} emissive={SKIN_DARK} emissiveIntensity={0.25} roughness={0.6} />
              </mesh>
              <mesh position={[s * 0.66, 0.06, -0.12]}>
                <boxGeometry args={[0.3, 0.1, 0.56]} />
                <meshStandardMaterial color={SKIN_DARK} roughness={0.6} />
              </mesh>
              {/* front leg and foot */}
              <mesh position={[s * 0.38, 0.17, 0.4]}>
                <boxGeometry args={[0.15, 0.34, 0.15]} />
                <meshStandardMaterial color={SKIN_DARK} roughness={0.6} />
              </mesh>
              <mesh position={[s * 0.44, 0.05, 0.56]}>
                <boxGeometry args={[0.26, 0.08, 0.3]} />
                <meshStandardMaterial color={SKIN_DARK} roughness={0.6} />
              </mesh>
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}
