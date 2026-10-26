import * as THREE from "three";
import { memo, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { entrances } from "../entrances";
import { EDGE_SE, edgeOutwardNormal, stages } from "../geometry";
import { TYPING_FOCUS_Y, TYPING_VIEW } from "../typing/game";
import { crossingView } from "./crossing";
import { CLEAN_FACADE } from "./maintenance";
import { raceView } from "./race";

/** The chase camera of the race takes in more than the viewer's long lens. */
const RACE_FOV = 58;

type ControlsLike = { target: THREE.Vector3; update: () => void };

/** What the camera squares up to for a game: a facade of the tower, or the bridge. */
export type Facing = "none" | "cleaning" | "typing" | "crossing" | "race";

/** Ease the orbit target and the camera toward a view, at rate k. */
function dampView(c: ControlsLike, camera: THREE.Camera, target: [number, number, number], from: [number, number, number], k: number, dt: number) {
  c.target.set(THREE.MathUtils.damp(c.target.x, target[0], k, dt), THREE.MathUtils.damp(c.target.y, target[1], k, dt), THREE.MathUtils.damp(c.target.z, target[2], k, dt));
  camera.position.set(THREE.MathUtils.damp(camera.position.x, from[0], k, dt), THREE.MathUtils.damp(camera.position.y, from[1], k, dt), THREE.MathUtils.damp(camera.position.z, from[2], k, dt));
}

/**
 * The orbit controls, and the rig that moves them: it eases the orbit target and camera
 * distance when a mode changes (garage → look low, explode → back off), then leaves the camera
 * to the user. Portrait screens start farther out. While a game has the view the rig holds the
 * camera on it and the user cannot orbit.
 */
export const CameraControls = memo(function CameraControls({
  showGarage,
  explode,
  autoRotate,
  facing,
}: {
  showGarage: boolean;
  explode: boolean;
  autoRotate: boolean;
  facing: Facing;
}) {
  const controlsRef = useRef<ControlsLike | null>(null);
  const free = facing === "none";
  const size = useThree((st) => st.size);
  const portrait = size.height > size.width;
  const mode = facing !== "none" ? facing : showGarage ? "garage" : explode ? "explode" : "default";
  const anim = useRef({ until: 0, mode: "" });
  const dirRef = useRef(new THREE.Vector3());
  const lens = useRef(0);

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
    // the race widens the lens; everything else has the one the viewer started with
    const cam = camera as THREE.PerspectiveCamera;
    if (!lens.current) lens.current = cam.fov;
    const fov = facing === "race" ? RACE_FOV : lens.current;
    if (Math.abs(cam.fov - fov) > 0.05) {
      cam.fov = THREE.MathUtils.damp(cam.fov, fov, 4, dt);
      cam.updateProjectionMatrix();
    }
    // a game on the bridge: look down across the deck, or chase the player's car
    const view = facing === "crossing" ? crossingView(portrait) : facing === "race" ? raceView(portrait) : null;
    if (view) {
      dampView(c, camera, view.target, view.camera, facing === "race" ? 8 : 3, dt);
      c.update();
      return;
    }
    if (facing === "cleaning" || facing === "typing") {
      // Square up to a game's surface: the cleaning facade, or the three-faced flank the
      // typing game writes on (far enough back to take in all three faces).
      const typing = facing === "typing";
      const { a, along, len, lowY, highY } = CLEAN_FACADE;
      const out = typing ? TYPING_VIEW.out : CLEAN_FACADE.out;
      const mx = typing ? TYPING_VIEW.center[0] : a[0] + (along[0] * len) / 2;
      const mz = typing ? -TYPING_VIEW.center[1] : -(a[1] + (along[1] * len) / 2);
      const my = typing ? TYPING_FOCUS_Y : (lowY + highY) / 2;
      const dist = typing ? (portrait ? 250 : 128) : portrait ? 215 : 150;
      dampView(c, camera, [mx, my, mz], [mx + out[0] * dist, my + 6, mz - out[1] * dist], 3, dt);
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

  return (
    <OrbitControls
      ref={controlsRef as never}
      makeDefault
      enablePan={false}
      enabled={free}
      autoRotate={autoRotate && free}
      autoRotateSpeed={0.5}
      zoomToCursor
      minDistance={explode ? 14 : 45}
      maxDistance={600}
      maxPolarAngle={showGarage ? Math.PI * 0.64 : Math.PI * 0.495}
      target={[0, 58, 0]}
    />
  );
});
