import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { bridgePoint } from "../geometry";
import { DECK_TOP, LANE_Z, LOOP } from "../crossing/road";
import { CAR_LEN, CAR_WIDTH, FINISH, START } from "../race/game";
import { race, useRaceActive } from "../race/store";
import { lampGeometry, part } from "./traffic";

/** The player's car first, then the rivals'. */
const COLORS = ["#e0262a", "#f2c14e", "#4f8fd6", "#a78bfa"];
/** The three lanes raced on, from the median's line to the footway's kerb. */
const TRACK = { from: 1.2, to: 12 };
const GANTRY = 6.2; // height of the beam over the finish line

/**
 * The chase camera: behind and above the player's car, looking down the road. It leans
 * toward the car's lane without following every change. Upright screens look from higher
 * and farther back, which puts the car above the HUD card. World coordinates; null off a race.
 */
export function raceView(portrait: boolean): { target: [number, number, number]; camera: [number, number, number] } | null {
  const g = race.game;
  if (!g) return null;
  const me = g.racers[0];
  const x = me.p - LOOP / 2;
  const z = LANE_Z[1] + (me.z - LANE_Z[1]) * 0.7;
  const at = bridgePoint(x + (portrait ? 12 : 26), z);
  const from = bridgePoint(x - (portrait ? 34 : 22), z);
  return { target: [at[0], DECK_TOP + 1, -at[1]], camera: [from[0], DECK_TOP + (portrait ? 16 : 9), -from[1]] };
}

/** A low coupé with a wing; white where the racer's colour goes. */
function raceCar(): THREE.BufferGeometry {
  return mergeGeometries([
    part([3.6, 0.42, 1.76], [0, 0.22, 0], "#0c0f13"), // wheels, as a dark skirt
    part([CAR_LEN, 0.42, CAR_WIDTH], [0, 0.56, 0], "#ffffff"),
    part([1.6, 0.38, 1.42], [-0.3, 0.95, 0], "#12171d"),
    part([1.35, 0.05, 1.3], [-0.3, 1.16, 0], "#ffffff"), // roof
    part([0.12, 0.36, 0.12], [-1.9, 0.94, 0.62], "#0c0f13"),
    part([0.12, 0.36, 0.12], [-1.9, 0.94, -0.62], "#0c0f13"),
    part([0.55, 0.07, 1.9], [-1.95, 1.15, 0], "#ffffff"), // wing
  ])!;
}

/** Black and white squares, for the lines across the road and the beam over the finish. */
function useChecker() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 96;
    c.height = 16;
    const ctx = c.getContext("2d")!;
    for (let i = 0; i < 12; i++) {
      for (let j = 0; j < 2; j++) {
        ctx.fillStyle = (i + j) % 2 ? "#f4f6f8" : "#10151b";
        ctx.fillRect(i * 8, j * 8, 8, 8);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

/**
 * The cars of the Hardbrücke sprint, with the start line and the finish under its gantry.
 * A child of the bridge's group; the race itself is stepped with the traffic (see BridgeTraffic).
 */
export function RaceCars() {
  const active = useRaceActive();
  const car = useMemo(() => raceCar(), []);
  const lamps = useMemo(() => lampGeometry(), []);
  const checker = useChecker();
  const cars = useRef<(THREE.Group | null)[]>([]);
  const marker = useRef<THREE.Mesh>(null);

  useFrame((st) => {
    const g = race.game;
    if (!g) return;
    const t = st.clock.elapsedTime;
    g.racers.forEach((r, i) => {
      const o = cars.current[i];
      if (!o) return;
      o.position.set(r.p - LOOP / 2, DECK_TOP, r.z);
      // nose toward where it is going; a crash sets it wobbling
      o.rotation.y = -Math.atan2(r.vz, Math.max(r.v, 6)) + Math.sin(t * 38) * 0.35 * (r.shaken / 0.6);
    });
    if (marker.current) marker.current.position.y = 3 + 0.3 * Math.sin(t * 5);
  });

  if (!active) return null;
  const width = TRACK.to - TRACK.from;
  const mid = (TRACK.from + TRACK.to) / 2;
  return (
    <group>
      {[START + CAR_LEN / 2 + 0.8, FINISH].map((p) => (
        <mesh key={p} position={[p - LOOP / 2, DECK_TOP + 0.05, mid]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
          <planeGeometry args={[width, 1.8]} />
          <meshBasicMaterial map={checker} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
        </mesh>
      ))}
      <group position={[FINISH - LOOP / 2, DECK_TOP, 0]}>
        {[TRACK.from - 0.4, TRACK.to + 0.4].map((z) => (
          <mesh key={z} position={[0, GANTRY / 2, z]} castShadow>
            <boxGeometry args={[0.4, GANTRY, 0.4]} />
            <meshStandardMaterial color="#cfd6dd" roughness={0.6} metalness={0.3} />
          </mesh>
        ))}
        <mesh position={[0, GANTRY + 0.6, mid]} rotation={[0, Math.PI / 2, 0]} castShadow>
          <boxGeometry args={[width + 1.2, 1.2, 0.3]} />
          <meshBasicMaterial map={checker} />
        </mesh>
      </group>
      {COLORS.map((color, i) => (
        <group
          key={i}
          ref={(o) => {
            cars.current[i] = o;
          }}
        >
          <mesh geometry={car} castShadow receiveShadow>
            <meshStandardMaterial vertexColors color={color} emissive={color} emissiveIntensity={0.18} roughness={0.35} metalness={0.3} />
          </mesh>
          <mesh geometry={lamps} position={[0, 0.6, 0]} scale={[CAR_LEN, 1, CAR_WIDTH]}>
            <meshBasicMaterial vertexColors toneMapped={false} />
          </mesh>
          {/* an arrow over the player's car */}
          {i === 0 && (
            <mesh ref={marker} position={[0, 3, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.55, 1.1, 4]} />
              <meshBasicMaterial color="#7dd3c0" toneMapped={false} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}
