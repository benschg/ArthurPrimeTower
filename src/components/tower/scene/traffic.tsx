import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { bridge } from "../geometry";
import { smoothstep } from "../math";
import { crossing } from "../crossing/store";
import { race } from "../race/store";
import { BUS, CAR, DECK_TOP, KINDS, LANE_Z, LOOP, MAX_PER_LANE, road, VAN } from "../crossing/road";
import { canvasTexture } from "./helpers";
import { GLASS, lampGeometry, part, parts } from "./parts";
import { useStage } from "./stage";

/** The model of each kind of vehicle (see KINDS in crossing/road.ts for their sizes). */
const MODELS: Record<number, () => THREE.BufferGeometry> = {
  [CAR]: () =>
    parts([
      part([3.7, 0.4, 1.7], [0, 0.2, 0], "#0c0f13"), // wheels, as a dark skirt
      part([4.4, 0.65, 1.8], [0, 0.62, 0], "#ffffff"),
      part([2.4, 0.55, 1.62], [-0.3, 1.22, 0], GLASS),
      part([2.1, 0.06, 1.5], [-0.3, 1.52, 0], "#ffffff"), // roof
    ]),
  [VAN]: () =>
    parts([
      part([4.8, 0.45, 1.9], [0, 0.22, 0], "#0c0f13"),
      part([5.6, 1.9, 2], [0, 1.3, 0], "#ffffff"),
      part([1.3, 0.7, 2.04], [2.17, 1.75, 0], GLASS), // cab windows, wrapping the front
    ]),
  // a VBZ bus: white over blue
  [BUS]: () =>
    parts([
      part([10.6, 0.5, 2.4], [0, 0.25, 0], "#0c0f13"),
      part([12, 2.7, 2.5], [0, 1.7, 0], "#e8ecef"),
      part([12.02, 0.85, 2.53], [0, 0.78, 0], "#1f4e9c"),
      part([12.04, 1, 2.54], [0, 1.95, 0], GLASS),
    ]),
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
  return useMemo(
    () =>
      canvasTexture(128, 64, (ctx) => {
        ctx.setTransform(1, 0, 0, 0.29, 0, 32 * (1 - 0.29));
        const g = ctx.createRadialGradient(16, 32, 0, 16, 32, 108);
        g.addColorStop(0, "rgba(255,255,255,1)");
        g.addColorStop(0.3, "rgba(255,255,255,0.5)");
        g.addColorStop(0.7, "rgba(255,255,255,0.12)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, -200, 128, 500);
      }),
    [],
  );
}

const POOL_LEN = 12;

/**
 * Cars, vans and the odd bus crossing the Hardbrücke; a child of the bridge's group, so +x
 * runs along the deck. The road itself (crossing/road.ts) moves them; this steps it and
 * draws what it holds: one InstancedMesh per kind, plus one for the lamps and one for the
 * headlight pools that fade in at night.
 */
export function BridgeTraffic() {
  const { blendRef } = useStage();
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

  useFrame((_, rawDt) => {
    const meshes = bodies.current;
    const lampMesh = lamps.current;
    const poolMesh = pools.current;
    if (!lampMesh || !poolMesh || !lampMat.current || !poolMat.current || KINDS.some((_, k) => !meshes[k])) return;
    const dt = Math.min(rawDt, 0.1);
    road.step(dt);
    // a game on the bridge, if one is on, goes by where the vehicles now are
    crossing.frame(dt);
    race.frame(dt);

    const nt = blendRef.current.night;
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
        const grow = THREE.MathUtils.smoothstep(Math.min(c.p, LOOP - c.p), 0, 7) * smoothstep(c.shown);
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
