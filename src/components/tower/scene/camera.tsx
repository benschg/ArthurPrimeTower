import * as THREE from "three";
import { useEffect, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { entrances } from "../entrances";
import { EDGE_SE, edgeOutwardNormal, stages } from "../geometry";
import type { ControlsLike } from "./helpers";
import { useFacadeFrame } from "./maintenance";
import { TYPING_FOCUS_Y, TYPING_VIEW } from "../typing/game";

/**
 * Eases the orbit target and camera distance when a mode changes (garage → look low,
 * explode → back off), then leaves the camera to the user. Portrait screens start farther out.
 */
export function CameraRig({
  showGarage,
  explode,
  facing,
  controlsRef,
}: {
  showGarage: boolean;
  explode: boolean;
  /** square up to the Hardbruecke facade for a game */
  facing: "none" | "cleaning" | "typing";
  controlsRef: RefObject<ControlsLike | null>;
}) {
  const size = useThree((st) => st.size);
  const portrait = size.height > size.width;
  const mode = facing !== "none" ? facing : showGarage ? "garage" : explode ? "explode" : "default";
  const facade = useFacadeFrame();
  const goal = useRef(new THREE.Vector3());
  const anim = useRef({ until: 0, mode: "" });
  const dirRef = useRef(new THREE.Vector3());

  useEffect(() => {
    anim.current = { until: performance.now() + 1600, mode };
  }, [mode, portrait]);

  // Deep link /#entrance: start at street level in front of the main entrance.
  const { camera: cam0 } = useThree();
  useEffect(() => {
    if (typeof window === "undefined" || window.location.hash !== "#entrance") return;
    const c = controlsRef.current;
    if (!c) return;
    const d = entrances()[0];
    const out = edgeOutwardNormal(stages[0].polygon, EDGE_SE);
    c.target.set(d.e, 3, -d.n);
    cam0.position.set(d.e + out[0] * 38, 7, -(d.n + out[1] * 38));
    anim.current = { until: 0, mode };
    c.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((st, dt) => {
    const c = controlsRef.current;
    if (!c) return;
    const camera = st.camera;
    if (facing !== "none") {
      // Square up to a game's surface: the cleaning facade, or the three-faced flank the
      // typing game writes on (far enough back to take in all three faces).
      const typing = facing === "typing";
      const { a, along, len, lowY, highY } = facade;
      const out = typing ? TYPING_VIEW.out : facade.out;
      const mx = typing ? TYPING_VIEW.center[0] : a[0] + (along[0] * len) / 2;
      const mz = typing ? -TYPING_VIEW.center[1] : -(a[1] + (along[1] * len) / 2);
      const my = typing ? TYPING_FOCUS_Y : (lowY + highY) / 2;
      const dist = typing ? (portrait ? 250 : 128) : portrait ? 215 : 150;
      goal.current.set(mx + out[0] * dist, my + 6, mz - out[1] * dist);
      c.target.x = THREE.MathUtils.damp(c.target.x, mx, 3, dt);
      c.target.y = THREE.MathUtils.damp(c.target.y, my, 3, dt);
      c.target.z = THREE.MathUtils.damp(c.target.z, mz, 3, dt);
      camera.position.x = THREE.MathUtils.damp(camera.position.x, goal.current.x, 3, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, goal.current.y, 3, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, goal.current.z, 3, dt);
      c.update();
      return;
    }
    // Only steer the target while a mode transition is running; afterwards zoom-to-cursor
    // may carry the target wherever the user is looking (e.g. down to the entrance).
    if (performance.now() < anim.current.until) {
      c.target.x = THREE.MathUtils.damp(c.target.x, 0, 2.5, dt);
      c.target.z = THREE.MathUtils.damp(c.target.z, 0, 2.5, dt);
      const wantY = showGarage ? 2 : explode ? 96 : 58;
      c.target.y = THREE.MathUtils.damp(c.target.y, wantY, 2.5, dt);
      const base = showGarage ? 230 : explode ? 420 : 290;
      const wantDist = base * (portrait ? 1.8 : 1);
      const dir = dirRef.current;
      dir.copy(camera.position).sub(c.target);
      const dist = THREE.MathUtils.damp(dir.length(), wantDist, 2.5, dt);
      if (showGarage) dir.setY(THREE.MathUtils.damp(dir.y, dist * 0.42, 2.5, dt));
      camera.position.copy(c.target).add(dir.setLength(dist));
    }
    c.update();
  });
  return null;
}
