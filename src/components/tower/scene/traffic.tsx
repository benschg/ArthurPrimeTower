import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { bridge, railway, railCrossing } from "../geometry";
import { crossing } from "../crossing/store";
import { BUS, CAR, DECK_TOP, KINDS, LANE_Z, LOOP, MAX_PER_LANE, road, VAN } from "../crossing/road";

const GLASS = "#12171d";
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
const smooth = (t: number) => t * t * (3 - 2 * t);

/** A box [length, height, width] centred at `at`, in one vertex colour. Vehicles point along +x. */
function part(size: [number, number, number], at: [number, number, number], color: string): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(...size).translate(...at);
  const c = new THREE.Color(color);
  const colors = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < colors.length; i += 3) c.toArray(colors, i);
  return g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

/** Head lamps (warm white) at the +x end and tail lamps (red) at the -x end of a unit-length, unit-width vehicle. */
function lampGeometry(): THREE.BufferGeometry {
  return mergeGeometries(
    [-1, 1].flatMap((s) => [
      part([0.03, 0.16, 0.16], [0.5, 0, s * 0.33], "#fff4d6"),
      part([0.03, 0.14, 0.2], [-0.5, 0, s * 0.33], "#ff2a1a"),
    ]),
  )!;
}

/** Eases 0 (day) to 1 (night) in step with the scene's own fade. */
function useNight(night: boolean) {
  const amt = useRef(night ? 1 : 0);
  return (dt: number) => (amt.current = THREE.MathUtils.damp(amt.current, night ? 1 : 0, 2.2, dt));
}

// ── Road traffic on the Hardbrücke ──────────────────────────────────────────────

/** The model of each kind of vehicle (see KINDS in crossing/road.ts for their sizes). */
const MODELS: Record<number, () => THREE.BufferGeometry> = {
  [CAR]: () =>
    mergeGeometries([
      part([3.7, 0.4, 1.7], [0, 0.2, 0], "#0c0f13"), // wheels, as a dark skirt
      part([4.4, 0.65, 1.8], [0, 0.62, 0], "#ffffff"),
      part([2.4, 0.55, 1.62], [-0.3, 1.22, 0], GLASS),
      part([2.1, 0.06, 1.5], [-0.3, 1.52, 0], "#ffffff"), // roof
    ])!,
  [VAN]: () =>
    mergeGeometries([
      part([4.8, 0.45, 1.9], [0, 0.22, 0], "#0c0f13"),
      part([5.6, 1.9, 2], [0, 1.3, 0], "#ffffff"),
      part([1.3, 0.7, 2.04], [2.17, 1.75, 0], GLASS), // cab windows, wrapping the front
    ])!,
  // a VBZ bus: white over blue
  [BUS]: () =>
    mergeGeometries([
      part([10.6, 0.5, 2.4], [0, 0.25, 0], "#0c0f13"),
      part([12, 2.7, 2.5], [0, 1.7, 0], "#e8ecef"),
      part([12.02, 0.85, 2.53], [0, 0.78, 0], "#1f4e9c"),
      part([12.04, 1, 2.54], [0, 1.95, 0], GLASS),
    ])!,
};

/** Room in the instanced meshes: every lane full, of whichever kinds. */
const CAPACITY = 2 * LANE_Z.length * MAX_PER_LANE;

const DASH = 9; // one 3 m dash every 9 m
const DASHES = Math.floor(bridge.length / DASH);

/** Lane markings, the median and the footways: enough for the deck to read as a road. */
function Markings() {
  const layout = (m: THREE.InstancedMesh | null) => {
    if (!m) return;
    const mat = new THREE.Matrix4();
    for (let i = 0; i < DASHES * 2; i++) {
      const x = ((i >> 1) + 0.5) * DASH - bridge.length / 2;
      m.setMatrixAt(i, mat.makeTranslation(x, DECK_TOP + 0.01, i % 2 ? 4.8 : -4.8));
    }
    m.instanceMatrix.needsUpdate = true;
  };
  return (
    <group>
      <instancedMesh ref={layout} args={[undefined, undefined, DASHES * 2]} receiveShadow>
        <boxGeometry args={[3, 0.06, 0.14]} />
        <meshStandardMaterial color="#8f9ba8" roughness={1} />
      </instancedMesh>
      {/* solid lines: beside the median and along the bus lanes */}
      {[-8.4, -1.2, 1.2, 8.4].map((z) => (
        <mesh key={z} position={[0, DECK_TOP + 0.01, z]} receiveShadow>
          <boxGeometry args={[bridge.length, 0.06, 0.14]} />
          <meshStandardMaterial color="#8f9ba8" roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, DECK_TOP + 0.06, 0]} receiveShadow>
        <boxGeometry args={[bridge.length, 0.12, 1.5]} />
        <meshStandardMaterial color="#384450" roughness={0.95} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, DECK_TOP + 0.08, s * (bridge.width / 2 - 1)]} receiveShadow>
          <boxGeometry args={[bridge.length, 0.16, 2]} />
          <meshStandardMaterial color="#384450" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

/** Headlight pool on the road ahead of a vehicle: a soft ellipse, brightest near the bumper. */
function usePoolTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 64;
    const ctx = c.getContext("2d")!;
    ctx.setTransform(1, 0, 0, 0.29, 0, 32 * (1 - 0.29));
    const g = ctx.createRadialGradient(16, 32, 0, 16, 32, 108);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.3, "rgba(255,255,255,0.5)");
    g.addColorStop(0.7, "rgba(255,255,255,0.12)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, -200, 128, 500);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

const POOL_LEN = 12;

/**
 * Cars, vans and the odd bus crossing the Hardbrücke; a child of the bridge's group, so +x
 * runs along the deck. The road itself (crossing/road.ts) moves them; this steps it and
 * draws what it holds: one InstancedMesh per kind, plus one for the lamps and one for the
 * headlight pools that fade in at night.
 */
export function BridgeTraffic({ night }: { night: boolean }) {
  const geos = useMemo(() => KINDS.map((_, k) => MODELS[k]()), []);
  const lampGeo = useMemo(() => lampGeometry(), []);
  const poolGeo = useMemo(() => new THREE.PlaneGeometry(POOL_LEN, 5).rotateX(-Math.PI / 2), []);
  const poolTex = usePoolTexture();
  const bodies = useRef<(THREE.InstancedMesh | null)[]>([]);
  const lamps = useRef<THREE.InstancedMesh>(null);
  const pools = useRef<THREE.InstancedMesh>(null);
  const lampMat = useRef<THREE.MeshBasicMaterial>(null);
  const poolMat = useRef<THREE.MeshBasicMaterial>(null);
  const scratch = useRef({ dummy: new THREE.Object3D(), tint: new THREE.Color(), used: KINDS.map(() => 0) });
  const nightAmt = useNight(night);

  useFrame((_, rawDt) => {
    const meshes = bodies.current;
    const lampMesh = lamps.current;
    const poolMesh = pools.current;
    if (!lampMesh || !poolMesh || !lampMat.current || !poolMat.current || KINDS.some((_, k) => !meshes[k])) return;
    const dt = Math.min(rawDt, 0.1);
    road.step(dt);
    crossing.frame(dt); // the game on the bridge, if one is on, goes by where the vehicles now are

    const nt = nightAmt(dt);
    lampMat.current.color.setScalar(THREE.MathUtils.lerp(0.6, 1, nt));
    poolMat.current.opacity = 0.5 * nt;
    poolMesh.visible = nt > 0.01;

    const { dummy: d, tint, used } = scratch.current;
    used.fill(0);
    let all = 0;
    for (const lane of road.lanes) {
      for (const c of lane.list) {
        if (all >= CAPACITY) break;
        const k = KINDS[c.kind];
        const mesh = meshes[c.kind]!;
        const slot = used[c.kind]++;
        const x = lane.dir * (c.p - LOOP / 2);
        // grow out of / shrink into the ends of the deck, or a gap in the traffic
        const grow = THREE.MathUtils.smoothstep(Math.min(c.p, LOOP - c.p), 0, 7) * smooth(c.shown);
        d.rotation.y = lane.dir > 0 ? 0 : Math.PI;
        d.position.set(x, DECK_TOP, lane.z);
        d.scale.set(c.sx * grow, c.sy * grow, grow);
        d.updateMatrix();
        mesh.setMatrixAt(slot, d.matrix);
        mesh.setColorAt(slot, tint.setHex(c.tint));
        d.position.y = DECK_TOP + k.lampY * c.sy * grow;
        d.scale.set(c.len * grow, c.sy * grow, k.width * grow);
        d.updateMatrix();
        lampMesh.setMatrixAt(all, d.matrix);
        d.position.set(x + lane.dir * (c.len / 2 + POOL_LEN / 2 - 1.2), DECK_TOP + 0.07, lane.z);
        d.scale.setScalar(grow);
        d.updateMatrix();
        poolMesh.setMatrixAt(all, d.matrix);
        all++;
      }
    }
    KINDS.forEach((_, k) => {
      const m = meshes[k]!;
      m.count = used[k];
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    });
    lampMesh.count = poolMesh.count = all;
    lampMesh.instanceMatrix.needsUpdate = true;
    poolMesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <Markings />
      {KINDS.map((_, k) => (
        <instancedMesh
          key={k}
          ref={(m) => {
            bodies.current[k] = m;
          }}
          args={[geos[k], undefined, CAPACITY]}
          frustumCulled={false}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial vertexColors roughness={0.45} metalness={0.25} />
        </instancedMesh>
      ))}
      <instancedMesh ref={lamps} args={[lampGeo, undefined, CAPACITY]} frustumCulled={false}>
        <meshBasicMaterial ref={lampMat} vertexColors toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={pools} args={[poolGeo, undefined, CAPACITY]} frustumCulled={false} visible={false}>
        <meshBasicMaterial ref={poolMat} map={poolTex} color="#ffe6bd" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}

// ── Trains on the railway corridor ──────────────────────────────────────────────

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
  const parts = [
    part([len - 1.2, 0.85, 2.5], [0, 0.57, 0], "#161b21"), // bogies and underframe
    part([len, top - 1, 2.9], [0, (top + 1) / 2, 0], loco ? spec.accent : "#e3e7ec"),
    part([len - 0.8, 0.22, 2.3], [0, top + 0.11, 0], "#707b87"),
  ];
  if (!loco) parts.push(part([len + 0.02, spec.decks === 2 ? 0.45 : 0.2, 2.94], [0, spec.decks === 2 ? 2.7 : 1.55, 0], spec.accent));
  if (cabFront) parts.push(part([0.1, 1, 2.3], [len / 2, top - 1.15, 0], GLASS));
  if (cabBack) parts.push(part([0.1, 1, 2.3], [-len / 2, top - 1.15, 0], GLASS));
  return mergeGeometries(parts)!;
}

/** The window bands along both sides, lit from within at night. */
function windowGeometry(len: number, spec: TrainSpec): THREE.BufferGeometry {
  const band = (y: number, h: number) => new THREE.BoxGeometry(len - 3, h, 2.95).translate(0, y, 0);
  return mergeGeometries(spec.decks === 2 ? [band(1.95, 0.7), band(3.5, 0.7)] : [band(2.75, 0.85)])!;
}

/** Three white lamps at the front of a train, or two red ones at its back. */
function trainLamps(len: number, front: boolean): THREE.BufferGeometry {
  const x = (front ? 1 : -1) * (len / 2 + 0.04);
  const color = front ? "#fff4d6" : "#ff2a1a";
  const lamps = [part([0.1, 0.22, 0.3], [x, 1.5, 0.95], color), part([0.1, 0.22, 0.3], [x, 1.5, -0.95], color)];
  if (front) lamps.push(part([0.1, 0.2, 0.3], [x, 3.75, 0], color));
  return mergeGeometries(lamps)!;
}

/**
 * One train that now and then runs the length of the corridor on one of its tracks, and
 * waits out of sight in between. Swiss trains keep left: of each pair of tracks the even
 * one carries trains along the corridor's bearing, the odd one those coming back.
 * A vehicle crossing the end of the track is squeezed to the part still on it; its shell
 * is a prism along x, so that looks like cutting it off there.
 */
function Train({ spec, night }: { spec: TrainSpec; night: boolean }) {
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
  const nightAmt = useNight(night);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const nt = nightAmt(dt);
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
export function Trains({ night }: { night: boolean }) {
  return (
    <>
      <Train spec={S_BAHN} night={night} />
      <Train spec={INTERCITY} night={night} />
    </>
  );
}
