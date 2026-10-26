import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { railway, railCrossing } from "../geometry";
import { pick, rand } from "../math";
import { GLASS, part, parts } from "./parts";
import { useStage } from "./stage";

const HALF = railway.length / 2;
const COUPLING = 0.7; // gap between the vehicles of a train
const TRAIN_ACCEL = 1.1; // m/s², pulling away and braking
const DWELL = 9; // seconds at the platform

type TrainSpec = {
  /** vehicle lengths, front to back */
  cars: number[];
  /** the front vehicle is a locomotive */
  loco: boolean;
  decks: 1 | 2;
  accent: string;
  /** cruising speed, m/s */
  cruise: number;
  /** calls at Bahnhof Hardbrücke, under the bridge */
  stops: boolean;
  /** tracks it may use (0 is nearest the tower) */
  tracks: number[];
  /** seconds until its first run, and the range between runs */
  first: number;
  wait: [number, number];
};

/** Zurich S-Bahn: a double-deck unit that calls at the station. */
const S_BAHN: TrainSpec = {
  cars: [25, 25, 25, 25, 25, 25],
  loco: false,
  decks: 2,
  accent: "#2a4d9b",
  cruise: 21,
  stops: true,
  tracks: [0, 1, 2, 3],
  first: 3,
  wait: [14, 40],
};

/** Long-distance train: a red locomotive and single-deck coaches, running through. */
const INTERCITY: TrainSpec = {
  cars: [19, 26, 26, 26, 26, 26, 26, 26],
  loco: true,
  decks: 1,
  accent: "#c8372d",
  cruise: 27,
  stops: false,
  tracks: [4, 5, 6, 7],
  first: 26,
  wait: [35, 80],
};

/** Body shell of one rail vehicle; a cab end gets a windscreen. */
function shellGeometry(len: number, spec: TrainSpec, loco: boolean, cabFront: boolean, cabBack: boolean): THREE.BufferGeometry {
  const top = spec.decks === 2 ? 4.45 : 4.05;
  const list = [
    part([len - 1.2, 0.85, 2.5], [0, 0.57, 0], "#161b21"), // bogies and underframe
    part([len, top - 1, 2.9], [0, (top + 1) / 2, 0], loco ? spec.accent : "#e3e7ec"),
    part([len - 0.8, 0.22, 2.3], [0, top + 0.11, 0], "#707b87"),
  ];
  if (!loco) list.push(part([len + 0.02, spec.decks === 2 ? 0.45 : 0.2, 2.94], [0, spec.decks === 2 ? 2.7 : 1.55, 0], spec.accent));
  if (cabFront) list.push(part([0.1, 1, 2.3], [len / 2, top - 1.15, 0], GLASS));
  if (cabBack) list.push(part([0.1, 1, 2.3], [-len / 2, top - 1.15, 0], GLASS));
  return parts(list);
}

/** The window bands along both sides, lit from within at night. */
function windowGeometry(len: number, spec: TrainSpec): THREE.BufferGeometry {
  const band = (y: number, h: number) => new THREE.BoxGeometry(len - 3, h, 2.95).translate(0, y, 0);
  return parts(spec.decks === 2 ? [band(1.95, 0.7), band(3.5, 0.7)] : [band(2.75, 0.85)]);
}

/** Three white lamps at the front of a train, or two red ones at its back. */
function trainLamps(len: number, front: boolean): THREE.BufferGeometry {
  const x = (front ? 1 : -1) * (len / 2 + 0.04);
  const color = front ? "#fff4d6" : "#ff2a1a";
  const lamps = [part([0.1, 0.22, 0.3], [x, 1.5, 0.95], color), part([0.1, 0.22, 0.3], [x, 1.5, -0.95], color)];
  if (front) lamps.push(part([0.1, 0.2, 0.3], [x, 3.75, 0], color));
  return parts(lamps);
}

/**
 * One train that now and then runs the length of the corridor on one of its tracks, and
 * waits out of sight in between. Swiss trains keep left: of each pair of tracks the even
 * one carries trains along the corridor's bearing, the odd one those coming back.
 * A vehicle crossing the end of the track is squeezed to the part still on it; its shell
 * is a prism along x, so that looks like cutting it off there.
 */
function Train({ spec }: { spec: TrainSpec }) {
  const { blendRef } = useStage();
  const last = spec.cars.length - 1;
  const total = spec.cars.reduce((a, b) => a + b, 0) + COUPLING * last;
  const geos = useMemo(
    () =>
      spec.cars.map((len, k) => {
        const loco = spec.loco && k === 0;
        return {
          shell: shellGeometry(len, spec, loco, k === 0 || loco, k === last || loco),
          windows: loco ? null : windowGeometry(len, spec),
          lamps: k === 0 ? trainLamps(len, true) : k === last ? trainLamps(len, false) : null,
        };
      }),
    [spec, last],
  );
  /** centre of each vehicle, in metres behind the middle of the train */
  const offsets = useMemo(
    () => spec.cars.map((len, k) => spec.cars.slice(0, k).reduce((a, b) => a + b + COUPLING, 0) + len / 2 - total / 2),
    [spec, total],
  );
  const cars = useRef<(THREE.Group | null)[]>([]);
  const glass = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const lampMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  // stage: 0 running in, 1 standing at the platform, 2 on its way out
  const run = useRef({ running: false, timer: spec.first, x: 0, v: 0, dir: 1, z: 0, stage: 0, dwell: 0 });

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const nt = blendRef.current.night;
    for (const m of glass.current) if (m) m.emissiveIntensity = 1.3 * nt;
    for (const m of lampMats.current) m?.color.setScalar(THREE.MathUtils.lerp(0.7, 1, nt));

    const r = run.current;
    if (!r.running) {
      r.timer -= dt;
      if (r.timer > 0) return;
      const track = pick(spec.tracks);
      r.running = true;
      r.dir = track % 2 === 0 ? 1 : -1;
      r.z = (track - (railway.tracks - 1) / 2) * railway.spacing;
      r.x = -r.dir * (HALF + total / 2 + 1);
      r.v = spec.cruise;
      r.stage = spec.stops ? 0 : 2;
    }
    if (r.stage === 0) {
      // brake so that the middle of the train comes to rest under the bridge
      const togo = (railCrossing - r.x) * r.dir;
      r.v = Math.min(spec.cruise, Math.sqrt(2 * TRAIN_ACCEL * Math.max(togo, 0)) + 0.4);
      if (togo < 0.05) {
        r.stage = 1;
        r.v = 0;
        r.dwell = DWELL;
      }
    } else if (r.stage === 1) {
      r.dwell -= dt;
      if (r.dwell <= 0) r.stage = 2;
    } else {
      r.v = Math.min(spec.cruise, r.v + TRAIN_ACCEL * dt);
    }
    r.x += r.dir * r.v * dt;
    if (r.x * r.dir > HALF + total / 2 + 1) {
      r.running = false;
      r.timer = rand(...spec.wait);
    }

    cars.current.forEach((g, k) => {
      if (!g) return;
      const len = spec.cars[k];
      const mid = r.x - r.dir * offsets[k];
      const from = Math.max(mid - len / 2, -HALF);
      const to = Math.min(mid + len / 2, HALF);
      g.visible = r.running && to - from > 0.05;
      if (!g.visible) return;
      g.position.set((from + to) / 2, 0.05, r.z);
      g.rotation.y = r.dir > 0 ? 0 : Math.PI;
      g.scale.x = (to - from) / len;
    });
  });

  return (
    <group>
      {geos.map((g, k) => (
        <group
          key={k}
          visible={false}
          ref={(o) => {
            cars.current[k] = o;
          }}
        >
          <mesh geometry={g.shell} castShadow receiveShadow>
            <meshStandardMaterial vertexColors roughness={0.5} metalness={0.2} />
          </mesh>
          {g.windows && (
            <mesh geometry={g.windows}>
              <meshStandardMaterial
                ref={(m) => {
                  glass.current[k] = m;
                }}
                color={GLASS}
                emissive="#ffd9a0"
                emissiveIntensity={0}
                roughness={0.2}
                metalness={0.4}
              />
            </mesh>
          )}
          {g.lamps && (
            <mesh geometry={g.lamps}>
              <meshBasicMaterial
                ref={(m) => {
                  lampMats.current[k] = m;
                }}
                vertexColors
                toneMapped={false}
              />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

/** The trains of the railway corridor; a child of the railway's group, so +x runs along the tracks. */
export function Trains() {
  return (
    <>
      <Train spec={S_BAHN} />
      <Train spec={INTERCITY} />
    </>
  );
}
