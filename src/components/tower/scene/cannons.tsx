"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { edgeOutwardNormal, FLOORS, stageForFloor, TOWER_HEIGHT } from "../geometry";
import { confettiCannons } from "../typing/cannons";
import { SLOT_EDGES } from "../typing/game";

const MAX = 720; // pieces, recycled round-robin
const LIFE = 11; // seconds in the air: long enough to float down past the letters
const GRAVITY = 4.2; // paper falls gently: low effective gravity ...
const DRAG = 1.25; // ... and strong drag, for a terminal speed of about 3.4 m/s
const ELEVATION = (54 * Math.PI) / 180; // barrels point up and out over the facade
const SCALE = 1.5; // cannon size
const BARREL = 2.4;
const COLORS = ["#7dd3c0", "#4f8fd6", "#f2c14e", "#e25c4a", "#a78bfa", "#ffffff"].map((c) => new THREE.Color(c));
const UP = new THREE.Vector3(0, 1, 0);

type Mount = { pos: THREE.Vector3; dir: THREE.Vector3; side: THREE.Vector3; quat: THREE.Quaternion };

/**
 * Three small confetti cannons on the roof, one above each face the typing game writes on.
 * Shots queued by the game launch paper pieces that arc out over the facade and float down.
 * Pieces are one InstancedMesh simulated on the CPU (drag, flutter, tumble).
 */
export function ConfettiCannons({ active }: { active: boolean }) {
  const mounts = useMemo<Mount[]>(() => {
    const poly = stageForFloor(FLOORS - 1).polygon;
    return SLOT_EDGES.map((edge) => {
      const a = poly[edge];
      const b = poly[(edge + 1) % poly.length];
      const out = edgeOutwardNormal(poly, edge);
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const e = (a[0] + b[0]) / 2 - out[0] * 1.9;
      const n = (a[1] + b[1]) / 2 - out[1] * 1.9;
      const dir = new THREE.Vector3(out[0] * Math.cos(ELEVATION), Math.sin(ELEVATION), -out[1] * Math.cos(ELEVATION)).normalize();
      return {
        pos: new THREE.Vector3(e, TOWER_HEIGHT + 0.2, -n),
        dir,
        side: new THREE.Vector3((b[0] - a[0]) / len, 0, -(b[1] - a[1]) / len),
        quat: new THREE.Quaternion().setFromUnitVectors(UP, dir),
      };
    });
  }, []);

  const mesh = useRef<THREE.InstancedMesh>(null);
  const rig = useRef<THREE.Group>(null);
  const barrels = useRef<(THREE.Group | null)[]>([]);
  const flashes = useRef<(THREE.Mesh | null)[]>([]);
  const sim = useRef({
    pos: new Float32Array(MAX * 3),
    vel: new Float32Array(MAX * 3),
    rot: new Float32Array(MAX * 3),
    spin: new Float32Array(MAX * 3),
    age: new Float32Array(MAX).fill(LIFE),
    phase: new Float32Array(MAX),
    size: new Float32Array(MAX),
    shown: new Uint8Array(MAX),
    next: 0,
    kick: [0, 0, 0],
    pop: 0,
    dummy: new THREE.Object3D(),
    v: new THREE.Vector3(),
  });

  // every instance starts hidden and with a colour, so the colour attribute exists from the start
  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < MAX; i++) {
      m.setMatrixAt(i, zero);
      m.setColorAt(i, COLORS[i % COLORS.length]);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, []);

  useFrame((_, rawDt) => {
    const s = sim.current;
    const m = mesh.current;
    if (!m) return;
    // Real time even at low frame rates: split a long frame into short physics steps.
    const total = Math.min(rawDt, 0.25);
    const steps = Math.max(1, Math.ceil(total / 0.034));
    const dt = total / steps;

    // launch queued shots
    for (const shot of confettiCannons.drain()) {
      const which = shot.cannon === "all" ? mounts.map((_, i) => i) : [shot.cannon];
      for (const c of which) {
        const mount = mounts[c];
        if (!mount) continue;
        s.kick[c] = 1;
        for (let k = 0; k < shot.count; k++) {
          const i = s.next;
          s.next = (s.next + 1) % MAX;
          // a wide fan: sideways along the facade, some higher, some flatter, fast and slow
          const speed = (13 + Math.random() * 20) * shot.power;
          s.v
            .copy(mount.dir)
            .addScaledVector(mount.side, (Math.random() - 0.5) * 1.3)
            .addScaledVector(UP, (Math.random() - 0.5) * 0.55)
            .normalize()
            .multiplyScalar(speed);
          s.vel.set([s.v.x, s.v.y, s.v.z], i * 3);
          const muzzle = BARREL * SCALE;
          s.pos.set([mount.pos.x + mount.dir.x * muzzle, mount.pos.y + mount.dir.y * muzzle, mount.pos.z + mount.dir.z * muzzle], i * 3);
          s.rot.set([Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28], i * 3);
          s.spin.set([(Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12], i * 3);
          s.age[i] = 0;
          s.phase[i] = Math.random() * 6.28;
          s.size[i] = 0.75 + Math.random() * 0.6;
          m.setColorAt(i, COLORS[Math.floor(Math.random() * COLORS.length)]);
        }
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
      }
    }

    // pieces: drag, gentle gravity, flutter once they have slowed, tumble
    let live = 0;
    let dirty = false;
    const d = s.dummy;
    for (let i = 0; i < MAX; i++) {
      if (s.age[i] >= LIFE) {
        if (s.shown[i]) {
          d.scale.setScalar(0);
          d.updateMatrix();
          m.setMatrixAt(i, d.matrix);
          s.shown[i] = 0;
          dirty = true;
        }
        continue;
      }
      const j = i * 3;
      for (let step = 0; step < steps; step++) {
        s.age[i] += dt;
        s.vel[j] -= DRAG * s.vel[j] * dt;
        s.vel[j + 1] += (-GRAVITY - DRAG * s.vel[j + 1]) * dt;
        s.vel[j + 2] -= DRAG * s.vel[j + 2] * dt;
        const flutter = Math.min(1, s.age[i] / 1.4);
        s.pos[j] += (s.vel[j] + Math.sin(s.phase[i] + s.age[i] * 3.1) * 2.2 * flutter) * dt;
        s.pos[j + 1] += s.vel[j + 1] * dt;
        s.pos[j + 2] += (s.vel[j + 2] + Math.cos(s.phase[i] * 1.7 + s.age[i] * 2.6) * 2.2 * flutter) * dt;
        s.rot[j] += s.spin[j] * dt;
        s.rot[j + 1] += s.spin[j + 1] * dt;
        s.rot[j + 2] += s.spin[j + 2] * dt;
      }
      if (s.pos[j + 1] < 0.3) s.age[i] = LIFE; // landed
      const fade = Math.min(1, s.age[i] / 0.08) * Math.min(1, Math.max(0, LIFE - s.age[i]));
      d.position.set(s.pos[j], s.pos[j + 1], s.pos[j + 2]);
      d.rotation.set(s.rot[j], s.rot[j + 1], s.rot[j + 2]);
      d.scale.setScalar(s.size[i] * fade);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
      s.shown[i] = 1;
      dirty = true;
      live++;
    }
    if (dirty) m.instanceMatrix.needsUpdate = true;
    confettiCannons.live = live;

    // cannons pop in for the game; barrels recoil and the muzzle flashes on each shot
    s.pop = THREE.MathUtils.damp(s.pop, active ? 1 : 0, 6, total);
    if (rig.current) {
      rig.current.visible = s.pop > 0.01;
      rig.current.children.forEach((c) => c.scale.setScalar(s.pop * SCALE));
    }
    for (let c = 0; c < mounts.length; c++) {
      s.kick[c] = THREE.MathUtils.damp(s.kick[c], 0, 7, total);
      const b = barrels.current[c];
      if (b) b.position.y = -0.6 * s.kick[c];
      const f = flashes.current[c];
      if (f) f.scale.setScalar(0.001 + 1.5 * s.kick[c] * s.kick[c]);
    }
  });

  return (
    <group>
      <group ref={rig} visible={false}>
        {mounts.map((mount, c) => (
          <group key={c} position={mount.pos}>
            {/* carriage */}
            <mesh position={[0, 0.3, 0]} castShadow>
              <boxGeometry args={[1.5, 0.6, 1.5]} />
              <meshStandardMaterial color="#2a3542" roughness={0.7} metalness={0.3} />
            </mesh>
            <group quaternion={mount.quat}>
              <group
                ref={(g) => {
                  barrels.current[c] = g;
                }}
              >
                <mesh position={[0, BARREL / 2, 0]} castShadow>
                  <cylinderGeometry args={[0.36, 0.48, BARREL, 14]} />
                  <meshStandardMaterial color="#39434f" roughness={0.45} metalness={0.7} />
                </mesh>
                <mesh position={[0, BARREL - 0.12, 0]}>
                  <cylinderGeometry args={[0.47, 0.47, 0.26, 14]} />
                  <meshStandardMaterial color="#f2c14e" roughness={0.4} metalness={0.5} />
                </mesh>
                <mesh
                  ref={(f) => {
                    flashes.current[c] = f;
                  }}
                  position={[0, BARREL + 0.4, 0]}
                  scale={0.001}
                >
                  <sphereGeometry args={[0.7, 12, 12]} />
                  <meshBasicMaterial color="#fff2c4" transparent opacity={0.85} toneMapped={false} depthWrite={false} />
                </mesh>
              </group>
            </group>
          </group>
        ))}
      </group>
      <instancedMesh ref={mesh} args={[undefined, undefined, MAX]} frustumCulled={false}>
        <planeGeometry args={[0.95, 0.6]} />
        <meshBasicMaterial side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
