import * as THREE from "three";
import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { Interiors, PLATE_LIFT, type ExtractState } from "../Interiors";
import { floorElevation } from "../geometry";
import { EXPLODE_GAP, AX_X, AX_Y, PLATE_YAW, type ControlsLike } from "./helpers";
import type { SceneProps, UnitProps } from "./types";
import { useHdri } from "./hdri";
import { GlassStages } from "./glass";
import { Entrances } from "./entrances";
import { Structure, FloorSlices, FloorLabel } from "./floors";
import { Site } from "./site";
import { GaragePeekTarget, Garage } from "./garage";
import { CameraRig } from "./camera";
import { Blender } from "./blender";

export function Scene(props: SceneProps) {
  const { night, showGarage, showTenants, explode, autoRotate, hovered, selected, cleaning, lang, onHover, onSelect, onStartCleaning, onCleanProgress, onHoverUnit } = props;
  const labelFloor = selected ?? hovered;
  const [peek, setPeek] = useState(false);
  const garageOpen = showGarage || (peek && !explode && !cleaning.active);
  const [skyNight, setSkyNight] = useState(night);
  const [garageMounted, setGarageMounted] = useState(false);
  const explodeRef = useRef({ gap: 0, thin: 1 });
  const extractRef = useRef<ExtractState>({ floor: -1, t: 0, open: 0, shift: 0, pos: new THREE.Vector3(), quat: new THREE.Quaternion() });
  const [interiorsActive, setInteriorsActive] = useState(false);
  const bind = useRef({ pos: new THREE.Vector3(), quat: new THREE.Quaternion(), q1: new THREE.Quaternion(), q2: new THREE.Quaternion(), rest: new THREE.Vector3(), off: new THREE.Vector3() });
  useFrame((st, dt) => {
    const x = explodeRef.current;
    x.gap = THREE.MathUtils.damp(x.gap, explode ? EXPLODE_GAP : 0, 4, dt);
    x.thin = THREE.MathUtils.damp(x.thin, explode ? 0.12 : 1, 4, dt);

    const ex = extractRef.current;
    const sel = selected !== null && !cleaning.active;
    if (sel && ex.floor < 0) ex.floor = selected;
    // Selecting another floor while one is out: put the current one back first, then switch.
    const switching = sel && ex.floor >= 0 && ex.floor !== selected;
    const out = sel && !switching;
    // Choreography: open the stack above the floor, then pop the plate out; reverse on release.
    ex.open = THREE.MathUtils.damp(ex.open, out ? 1 : ex.t < 0.3 ? 0 : 1, 3.5, dt);
    ex.t = THREE.MathUtils.damp(ex.t, out && ex.open > 0.55 ? 1 : 0, 3.5, dt);
    ex.shift = THREE.MathUtils.damp(ex.shift, sel ? 1 : 0, 3, dt);
    if (switching && ex.t < 0.01 && ex.open < 0.02) {
      ex.t = 0;
      ex.open = 0;
      ex.floor = selected;
    }
    if (!sel && ex.t < 0.002 && ex.open < 0.002) {
      ex.t = 0;
      ex.open = 0;
      ex.floor = -1;
    }
    if (ex.floor >= 0) {
      const f = ex.floor;
      const b = bind.current;
      const cam = st.camera;
      const size = st.size;
      // rest: the plate's slot in the (possibly exploded) stack
      b.rest.set(0, floorElevation(f) + PLATE_LIFT + f * x.gap, 0);
      // bound: a spot on the right of the view, tilted toward the viewer, long axis horizontal
      const dist = size.height > size.width ? 150 : 112;
      const right = size.height > size.width ? 0 : 44;
      const up = size.height > size.width ? -38 : -6;
      b.off.set(right, up, -dist).applyQuaternion(cam.quaternion);
      b.pos.copy(cam.position).add(b.off);
      b.q1.setFromAxisAngle(AX_X, 0.95);
      b.q2.setFromAxisAngle(AX_Y, PLATE_YAW);
      b.quat.copy(cam.quaternion).multiply(b.q1).multiply(b.q2);
      // Blend slot -> camera pose with the (already damped) pop-out amount. No extra lag:
      // once fully out the plate is rigidly linked to the camera.
      const e = ex.t * ex.t * (3 - 2 * ex.t);
      ex.pos.copy(b.rest).lerp(b.pos, e);
      ex.quat.identity().slerp(b.quat, e);
      // shift the picture right so the tower sits left of the pulled-out floor
      const cam2 = cam as THREE.PerspectiveCamera;
      if (ex.shift > 0.001) cam2.setViewOffset(size.width, size.height, ex.shift * 0.17 * size.width, 0, size.width, size.height);
      else if (cam2.view?.enabled) cam2.clearViewOffset();
    }
    const want = x.gap > 0.001 || ex.floor >= 0 || explode || selected !== null;
    if (want !== interiorsActive) setInteriorsActive(want);
  });
  const unit: UnitProps = { cleaning, onStart: onStartCleaning, onProgress: onCleanProgress, onHoverUnit };
  const dim = showTenants || explode;
  const controlsRef = useRef<ControlsLike | null>(null);
  const { env, glassEnv } = useHdri(skyNight);
  return (
    <>
      <fog attach="fog" args={["#1a2230", 420, 1100]} />

      <ambientLight name="ambient" intensity={0.5} />
      <directionalLight
        name="sun"
        position={[-140, 220, 120]}
        intensity={2.4}
        color="#fff3dd"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-260}
        shadow-camera-right={260}
        shadow-camera-top={260}
        shadow-camera-bottom={-260}
        shadow-camera-near={10}
        shadow-camera-far={700}
        shadow-bias={-0.0004}
      />
      <directionalLight name="fill" position={[160, 90, -140]} intensity={0.6} color="#8fc9ff" />

      <Environment map={env} background />
      <Blender night={night} garageOpen={garageOpen} onSkyNight={setSkyNight} onGarageMounted={setGarageMounted} />

      <group>
        <GlassStages night={night} dim={dim} env={glassEnv} unit={unit} explodeRef={explodeRef} extractRef={extractRef} />
        <Structure visible={showTenants && !explode} />
        <FloorSlices
          showTenants={showTenants}
          explode={explode}
          hovered={hovered}
          selected={selected}
          onHover={onHover}
          onSelect={onSelect}
          interactive={!cleaning.active}
          explodeRef={explodeRef}
          extractRef={extractRef}
        />
        <Interiors explodeRef={explodeRef} extractRef={extractRef} active={interiorsActive} />
        <Entrances />
        {labelFloor !== null && !cleaning.active && selected === null && <FloorLabel floor={labelFloor} explode={explode} lang={lang} />}
      </group>

      <Site lang={lang} />
      <GaragePeekTarget onChange={setPeek} />
      {garageMounted && <Garage lang={lang} />}

      <OrbitControls
        ref={controlsRef as never}
        makeDefault
        enablePan={false}
        enabled={!cleaning.active}
        autoRotate={autoRotate && !cleaning.active}
        autoRotateSpeed={0.5}
        zoomToCursor
        minDistance={explode ? 14 : 45}
        maxDistance={600}
        maxPolarAngle={showGarage ? Math.PI * 0.64 : Math.PI * 0.495}
        target={[0, 58, 0]}
      />
      <CameraRig showGarage={showGarage} explode={explode} cleaning={cleaning.active} controlsRef={controlsRef} />
    </>
  );
}
