import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { TOWER_HEIGHT, floorElevation, EDGE_SE, edgeOutwardNormal, stages, type Pt } from "../geometry";
import { hash } from "./helpers";
import type { UnitProps } from "./types";

export const GAME_SECONDS = 60;

export const CLEAN_PX = 6; // dirt canvas pixels per metre

/** Frame of the Hardbruecke facade of the top stage: origin a, unit vector along, outward normal. */
export function useFacadeFrame() {
  const top = stages[stages.length - 1].polygon;
  return useMemo(() => {
    const a = top[EDGE_SE];
    const b = top[(EDGE_SE + 1) % top.length];
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const len = Math.hypot(ex, ey);
    const along: Pt = [ex / len, ey / len];
    const out = edgeOutwardNormal(top, EDGE_SE);
    const yaw = Math.atan2(ey, ex); // rotation.y so a box's local x runs along the facade
    const lowY = floorElevation(17) + 0.4; // the facade steps in below floor 17
    const highY = TOWER_HEIGHT - 0.3;
    return { a, along, out, len, yaw, lowY, highY };
  }, [top]);
}

/** Dirt layer: a canvas the squeegee clears; progress is tracked on a 1 m grid. */
export function useDirt(len: number, height: number) {
  return useMemo(() => {
    const w = Math.ceil(len * CLEAN_PX);
    const h = Math.ceil(height * CLEAN_PX);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    const paint = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(70, 58, 40, 0.55)";
      ctx.fillRect(0, 0, w, h);
      // streaks and blotches
      for (let i = 0; i < 260; i++) {
        const x = hash(i, 3) * w;
        const y = hash(i, 7) * h;
        const r = 4 + hash(i, 11) * 22;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        const dark = hash(i, 5) > 0.5;
        g.addColorStop(0, dark ? "rgba(40,32,22,0.75)" : "rgba(150,140,120,0.5)");
        g.addColorStop(1, "rgba(60,50,35,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < 40; i++) {
        const x = hash(i, 13) * w;
        ctx.fillStyle = "rgba(35,28,20,0.35)";
        ctx.fillRect(x, hash(i, 17) * h * 0.5, 1 + hash(i, 19) * 3, h * (0.3 + hash(i, 23) * 0.6));
      }
    };
    paint();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const cols = Math.ceil(len);
    const rows = Math.ceil(height);
    const cleaned = new Uint8Array(cols * rows);
    // Mutation goes through these closures so React sees the memoised object as read-only.
    const reset = () => {
      paint();
      cleaned.fill(0);
      tex.needsUpdate = true;
    };
    const clear = (x: number, y: number, cw: number, ch: number) => {
      ctx.clearRect(x, y, cw, ch);
      tex.needsUpdate = true;
    };
    /** Marks a 1 m cell as cleaned; true if it was dirty before. */
    const clearAll = () => {
      ctx.clearRect(0, 0, w, h);
      cleaned.fill(1);
      tex.needsUpdate = true;
    };
    const mark = (gx: number, gy: number) => {
      if (gx < 0 || gy < 0 || gx >= cols || gy >= rows) return false;
      const idx = gy * cols + gx;
      if (cleaned[idx]) return false;
      cleaned[idx] = 1;
      return true;
    };
    return { tex, cols, rows, reset, clear, clearAll, mark };
  }, [len, height]);
}

/**
 * Building maintenance unit (facade access cradle): a trolley on a roof rail along the
 * Hardbruecke facade, a jib reaching over the parapet, two cables and a cradle. Idle, it
 * slowly travels the upper facade; clicked, it becomes the player's squeegee.
 */
export function MaintenanceUnit({ cleaning, onStart, onProgress, onHoverUnit }: UnitProps) {
  const frame = useFacadeFrame();
  const { a, along, out, len, yaw, lowY, highY } = frame;
  const H = highY - lowY;
  const dirt = useDirt(len, H);

  const trolley = useRef<THREE.Group>(null);
  const cradle = useRef<THREE.Group>(null);
  const cableL = useRef<THREE.Mesh>(null);
  const cableR = useRef<THREE.Mesh>(null);
  const target = useRef({ u: 0.5, y: highY - 6 });
  const pos = useRef({ u: 0.5, y: highY - 6 });
  const prev = useRef({ x: (1 - 0.5) * len, y: highY - 6 - lowY }); // last squeegee position on the canvas
  const game = useRef({ started: 0, lastReport: 0, cleanedCount: 0, done: false });

  const roofY = TOWER_HEIGHT + 0.2;
  const jibReach = 3.2;
  const cradleHalf = 1.9;
  const cradleH = 1.3;

  // Reset when a game starts
  useEffect(() => {
    if (!cleaning.active) return;
    dirt.reset();
    prev.current = { x: (1 - pos.current.u) * len, y: pos.current.y - lowY };
    game.current = { started: performance.now(), lastReport: 0, cleanedCount: 0, done: false };
  }, [cleaning.active, dirt, len, lowY]);

  // Success forced from outside (hidden shortcut): wipe the facade and freeze.
  useEffect(() => {
    if (cleaning.active && cleaning.progress >= 0.99 && !game.current.done) {
      dirt.clearAll();
      game.current.done = true;
    }
  }, [cleaning.active, cleaning.progress, dirt]);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    if (cleaning.active && !game.current.done) {
      // follow the pointer target
      pos.current.u = THREE.MathUtils.damp(pos.current.u, target.current.u, 14, dt);
      pos.current.y = THREE.MathUtils.damp(pos.current.y, target.current.y, 14, dt);
      // squeegee: sweep from the previous position to the new one so fast moves leave a
      // continuous strip (canvas x runs against `along`, like the plane's u)
      const cx = (1 - pos.current.u) * len;
      const cy = pos.current.y - lowY;
      const from = prev.current;
      const dx = cx - from.x;
      const dy = cy - from.y;
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx) / cradleHalf, Math.abs(dy) / (cradleH / 2))));
      for (let k = 1; k <= steps; k++) {
        const sx = from.x + (dx * k) / steps;
        const sy = from.y + (dy * k) / steps;
        dirt.clear((sx - cradleHalf) * CLEAN_PX, (H - sy - cradleH / 2) * CLEAN_PX, cradleHalf * 2 * CLEAN_PX, cradleH * CLEAN_PX);
        for (let gx = Math.floor(sx - cradleHalf); gx <= Math.floor(sx + cradleHalf); gx++) {
          for (let gy = Math.floor(sy - cradleH / 2); gy <= Math.floor(sy + cradleH / 2); gy++) {
            if (dirt.mark(gx, gy)) game.current.cleanedCount++;
          }
        }
      }
      prev.current = { x: cx, y: cy };
      const now = performance.now();
      if (!game.current.done && now - game.current.lastReport > 200) {
        game.current.lastReport = now;
        const progress = Math.min(1, game.current.cleanedCount / (dirt.cols * dirt.rows) / 0.97);
        const secondsLeft = Math.max(0, GAME_SECONDS - (now - game.current.started) / 1000);
        if (progress >= 0.99) game.current.done = true; // freeze the clock and the final score
        onProgress(progress, secondsLeft);
      }
    } else if (!cleaning.active) {
      // idle patrol
      pos.current.u = 0.5 + 0.18 * Math.sin(t * 0.04);
      const drop = 0.5 - 0.5 * Math.cos(t * 0.09);
      pos.current.y = highY - 2 - drop * (H - 4);
    }
    const u = pos.current.u;
    const y = pos.current.y;
    const px = a[0] + along[0] * u * len;
    const pz = a[1] + along[1] * u * len;
    if (trolley.current) trolley.current.position.set(px - out[0] * 1.3, roofY, -(pz - out[1] * 1.3));
    if (cradle.current) cradle.current.position.set(px + out[0] * 1.1, y - cradleH / 2, -(pz + out[1] * 1.1));
    const tipY = roofY + 3.4;
    const cableLen = tipY - (y - cradleH / 2 + 0.6);
    for (const [ref, side] of [[cableL, -1], [cableR, 1]] as const) {
      const m = ref.current;
      if (!m) continue;
      const cxw = px + out[0] * jibReach * 0.55 + along[0] * side * cradleHalf * 0.8;
      const czw = pz + out[1] * jibReach * 0.55 + along[1] * side * cradleHalf * 0.8;
      m.position.set(cxw, tipY - cableLen / 2, -czw);
      m.scale.y = cableLen;
    }
  });

  // Dirt plane sits just outside the glass, rotated so local +z is the outward normal.
  // Its local +x then runs against `along`, hence the mirrored u below.
  const planeRot = Math.atan2(out[0], -out[1]);
  const steer = (uv: THREE.Vector2 | undefined) => {
    if (!uv) return;
    target.current.u = THREE.MathUtils.clamp(1 - uv.x, cradleHalf / len, 1 - cradleHalf / len);
    target.current.y = lowY + THREE.MathUtils.clamp(uv.y, 0.02, 0.98) * H;
  };
  const mid: [number, number, number] = [a[0] + (along[0] * len) / 2 + out[0] * 0.45, (lowY + highY) / 2, -(a[1] + (along[1] * len) / 2 + out[1] * 0.45)];

  return (
    <group>
      {/* Rail along the parapet, inside the roof edge */}
      <mesh
        position={[a[0] + (along[0] * len) / 2 - out[0] * 1.3, roofY + 0.15, -(a[1] + (along[1] * len) / 2 - out[1] * 1.3)]}
        rotation={[0, yaw, 0]}
      >
        <boxGeometry args={[len - 4, 0.3, 1.4]} />
        <meshStandardMaterial color="#6b7580" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Trolley with mast, counterweight and jib */}
      <group ref={trolley} rotation={[0, yaw, 0]}>
        <mesh position={[0, 0.9, 0]} castShadow>
          <boxGeometry args={[2.6, 1.4, 1.8]} />
          <meshStandardMaterial color="#e8b532" roughness={0.6} />
        </mesh>
        <mesh position={[0, 2.5, 0]}>
          <boxGeometry args={[0.5, 2.2, 0.5]} />
          <meshStandardMaterial color="#d9dee5" metalness={0.4} roughness={0.5} />
        </mesh>
        <mesh position={[0, 1.9, -1.4]}>
          <boxGeometry args={[1.6, 1.0, 0.9]} />
          <meshStandardMaterial color="#3a4652" roughness={0.9} />
        </mesh>
        <mesh position={[0, 3.3, (1.3 + jibReach) / 2 - 0.4]}>
          <boxGeometry args={[0.35, 0.35, 1.3 + jibReach + 1.2]} />
          <meshStandardMaterial color="#d9dee5" metalness={0.4} roughness={0.5} />
        </mesh>
        <mesh position={[0, 2.9, 1.3 + jibReach * 0.55]}>
          <boxGeometry args={[3.2, 0.25, 0.25]} />
          <meshStandardMaterial color="#d9dee5" metalness={0.4} roughness={0.5} />
        </mesh>
      </group>

      <mesh ref={cableL}>
        <cylinderGeometry args={[0.03, 0.03, 1, 5]} />
        <meshStandardMaterial color="#cfd6dd" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh ref={cableR}>
        <cylinderGeometry args={[0.03, 0.03, 1, 5]} />
        <meshStandardMaterial color="#cfd6dd" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Cradle: click to start the game */}
      <group
        ref={cradle}
        rotation={[0, yaw, 0]}
        onClick={(e) => {
          e.stopPropagation();
          if (!cleaning.active) onStart();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHoverUnit(true);
        }}
        onPointerOut={() => onHoverUnit(false)}
      >
        {/* generous invisible hit box */}
        <mesh position={[0, 0.7, 0]} visible={false}>
          <boxGeometry args={[cradleHalf * 2 + 2, 3, 3]} />
        </mesh>
        <mesh position={[0, 0.25, 0]} castShadow>
          <boxGeometry args={[cradleHalf * 2, 0.5, 1.1]} />
          <meshStandardMaterial color="#e8b532" roughness={0.6} emissive="#e8b532" emissiveIntensity={cleaning.active ? 0.35 : 0} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * cradleHalf * 0.8, 0.85, 0]}>
            <boxGeometry args={[0.08, 1.2, 0.08]} />
            <meshStandardMaterial color="#cfd6dd" />
          </mesh>
        ))}
        <mesh position={[0, 1.15, 0]}>
          <boxGeometry args={[cradleHalf * 2, 0.06, 1.1]} />
          <meshStandardMaterial color="#cfd6dd" />
        </mesh>
        {[-0.8, 0.7].map((x) => (
          <mesh key={x} position={[x, 1.05, 0]}>
            <capsuleGeometry args={[0.2, 0.9, 4, 8]} />
            <meshStandardMaterial color="#2f6fd6" />
          </mesh>
        ))}
        {/* squeegee blade toward the glass */}
        <mesh position={[0, 0.7, -0.62]}>
          <boxGeometry args={[cradleHalf * 2, cradleH, 0.06]} />
          <meshStandardMaterial color="#9ad7ff" transparent opacity={cleaning.active ? 0.35 : 0} depthWrite={false} />
        </mesh>
      </group>

      {/* Dirt overlay on the facade; also the pointer surface that steers the cradle */}
      <mesh
        position={mid}
        rotation={[0, planeRot, 0]}
        visible={cleaning.active}
        onPointerDown={(e) => {
          if (!cleaning.active) return;
          e.stopPropagation();
          // keep receiving moves while a finger or button drags off the plane
          (e.target as Element | undefined)?.setPointerCapture?.(e.pointerId);
          steer(e.uv);
        }}
        onPointerUp={(e) => (e.target as Element | undefined)?.releasePointerCapture?.(e.pointerId)}
        onPointerMove={(e) => cleaning.active && steer(e.uv)}
      >
        <planeGeometry args={[len, H]} />
        <meshBasicMaterial map={dirt.tex} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
    </group>
  );
}
