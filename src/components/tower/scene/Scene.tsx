import * as THREE from "three";
import { useRef, useState, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { Interiors, PLATE_LIFT, type ExtractState, PLATE_TILT } from "../Interiors";
import { floorElevation } from "../geometry";
import { EXPLODE_GAP, AX_X, AX_Y, PLATE_YAW, type ControlsLike, type ExplodeState } from "./helpers";
import type { SceneProps, UnitProps } from "./types";
import { useHdri } from "./hdri";
import { Sky } from "./nightSky";
import { GlassStages } from "./glass";
import { Entrances } from "./entrances";
import { Structure, FloorSlices, FloorLabel } from "./floors";
import { Site } from "./site";
import { GaragePeekTarget, Garage } from "./garage";
import { CameraRig } from "./camera";
import { Blender } from "./blender";
import { ConfettiCannons } from "./cannons";
import { PacmanBoard } from "./pacman";
import { PAC_FLOOR } from "../pacman/maze";
import { boardOutline, fitBoard } from "./boardFit";

/** The game floor is held nearly face-on, like a board; upright screens turn it on end. */
const BOARD_TILT = 1.3;
/** A pulled-out floor shifts the picture by this fraction of the view's width. */
const VIEW_SHIFT = 0.17;

export function Scene(props: SceneProps) {
  const { night, showGarage, showTenants, explode, autoRotate, hovered, selected, cleaning, typing, pacman, crossing, race, lang, onHover, onSelect, onStartCleaning, onCleanProgress, onHoverUnit, onPlayBridge, onHoverBridge } = props;
  // a game owns the facade, the camera and the pointer
  const busy = cleaning.active || typing || crossing || race;
  const labelFloor = selected ?? hovered;
  const [peek, setPeek] = useState(false);
  const garageOpen = showGarage || explode || (peek && !busy);
  const [skyNight, setSkyNight] = useState(night);
  const [garageMounted, setGarageMounted] = useState(false);
  const explodeRef = useRef<ExplodeState>({ gap: 0, thin: 1, hoverF: -1, hoverAmt: 0 });
  const extractRef = useRef<ExtractState>({ floor: -1, t: 0, open: 0, shift: 0, pos: new THREE.Vector3(), quat: new THREE.Quaternion(), spin: 0, tilt: PLATE_TILT, zoom: 1 });
  // The floor on its way back in while a newly selected one comes out.
  const outgoingRef = useRef<ExtractState>({ floor: -1, t: 0, open: 0, shift: 0, pos: new THREE.Vector3(), quat: new THREE.Quaternion(), spin: 0, tilt: PLATE_TILT, zoom: 1 });
  // Dragging on the pulled-out floor turns and tilts it; the wheel over it zooms it.
  const onPlateDrag = useCallback((dx: number, dy: number) => {
    const ex = extractRef.current;
    ex.spin += dx * 0.008;
    ex.tilt = THREE.MathUtils.clamp(ex.tilt + dy * 0.004, 0.3, 1.5);
  }, []);
  const onPlateZoom = useCallback((factor: number) => {
    const ex = extractRef.current;
    ex.zoom = THREE.MathUtils.clamp(ex.zoom * factor, 0.55, 2.6);
  }, []);
  const [interiorsActive, setInteriorsActive] = useState(false);
  const bind = useRef({ pos: new THREE.Vector3(), quat: new THREE.Quaternion(), q1: new THREE.Quaternion(), q2: new THREE.Quaternion(), rest: new THREE.Vector3(), off: new THREE.Vector3() });
  // Game board: `posed` marks that the plate has been set up for it (for a view of w x h),
  // (tx, ty) is where its centre goes on the canvas, `amt` eases it there.
  const board = useRef({ posed: false, amt: 0, w: 0, h: 0, tx: 0, ty: 0 });
  useFrame((st, dt) => {
    const x = explodeRef.current;
    x.gap = THREE.MathUtils.damp(x.gap, explode ? EXPLODE_GAP : 0, 4, dt);
    x.thin = THREE.MathUtils.damp(x.thin, explode ? 0.12 : 1, 4, dt);
    // dock-style bulge around the hovered floor (explode view only, not while a floor is pulled out)
    const bulgeOn = explode && hovered !== null && selected === null && !busy;
    if (bulgeOn && hovered !== null) {
      x.hoverF = x.hoverAmt < 0.02 ? hovered : THREE.MathUtils.damp(x.hoverF, hovered, 10, dt);
    }
    x.hoverAmt = THREE.MathUtils.damp(x.hoverAmt, bulgeOn ? 1 : 0, 8, dt);
    if (x.hoverAmt < 0.002 && !bulgeOn) {
      x.hoverAmt = 0;
      x.hoverF = -1;
    }

    const ex = extractRef.current;
    const prev = outgoingRef.current;
    const sel = selected !== null && !busy;
    // Selecting another floor while one is out: hand the current one to the outgoing slot so
    // it retracts while the new one opens and pops out at the same time.
    if (sel && ex.floor >= 0 && ex.floor !== selected) {
      prev.floor = ex.floor;
      prev.t = ex.t;
      prev.open = ex.open;
      prev.pos.copy(ex.pos);
      prev.quat.copy(ex.quat);
      prev.spin = ex.spin;
      prev.tilt = ex.tilt;
      prev.zoom = ex.zoom;
      ex.floor = selected;
      ex.t = 0;
      ex.open = 0;
      ex.spin = 0;
      ex.tilt = PLATE_TILT;
      ex.zoom = 1;
    }
    if (sel && ex.floor < 0) {
      ex.floor = selected;
      ex.spin = 0;
      ex.tilt = PLATE_TILT;
      ex.zoom = 1;
    }
    // The game starts a moment after its floor is selected: turn the plate into a board once
    // (and again when the view is resized), centred and sized so the whole floor shows clear
    // of the HUD. After that the player's drag and wheel work as on any other floor.
    const upright = st.size.height > st.size.width;
    const plateDist = upright ? 150 : 112;
    const fovTan = Math.tan(THREE.MathUtils.degToRad((st.camera as THREE.PerspectiveCamera).fov) / 2);
    const bd = board.current;
    if (pacman && ex.floor === PAC_FLOOR && (!bd.posed || bd.w !== st.size.width || bd.h !== st.size.height)) {
      if (!bd.posed) {
        ex.tilt = BOARD_TILT;
        ex.spin = upright ? Math.PI / 2 : 0;
      }
      const fit = fitBoard(st.gl.domElement, ex.tilt, PLATE_YAW + ex.spin);
      ex.zoom = THREE.MathUtils.clamp((fit.ppm * 2 * plateDist * fovTan) / st.size.height, 0.4, 2.6);
      bd.tx = fit.x;
      bd.ty = fit.y;
      bd.w = st.size.width;
      bd.h = st.size.height;
      bd.posed = true;
    }
    if (!pacman) bd.posed = false;
    bd.amt = THREE.MathUtils.damp(bd.amt, pacman ? 1 : 0, 6, dt);
    // Current: open the stack above the floor, then pop the plate out; reverse on release.
    ex.open = THREE.MathUtils.damp(ex.open, sel ? 1 : ex.t < 0.3 ? 0 : 1, 3.5, dt);
    ex.t = THREE.MathUtils.damp(ex.t, sel && ex.open > 0.55 ? 1 : 0, 3.5, dt);
    ex.shift = THREE.MathUtils.damp(ex.shift, sel ? 1 : 0, 3, dt);
    if (!sel && ex.t < 0.002 && ex.open < 0.002) {
      ex.t = 0;
      ex.open = 0;
      ex.floor = -1;
    }
    // Outgoing: plate back in first, then the stack closes.
    if (prev.floor >= 0) {
      prev.t = THREE.MathUtils.damp(prev.t, 0, 4, dt);
      prev.open = THREE.MathUtils.damp(prev.open, prev.t < 0.3 ? 0 : 1, 3.5, dt);
      if (prev.t < 0.002 && prev.open < 0.002) {
        prev.t = 0;
        prev.open = 0;
        prev.floor = -1;
      }
    }
    const cam = st.camera;
    const size = st.size;
    const pose = (e: ExtractState) => {
      if (e.floor < 0) return;
      const f = e.floor;
      const b = bind.current;
      // rest: the plate's slot in the (possibly exploded) stack
      b.rest.set(0, floorElevation(f) + PLATE_LIFT + f * x.gap, 0);
      // bound: a spot on the right of the view, tilted toward the viewer, long axis horizontal
      const dist = plateDist;
      const right = size.height > size.width ? 0 : 44;
      const up = size.height > size.width ? -38 : -6;
      b.off.set(right, up, -dist).multiplyScalar(1 / e.zoom);
      if (f === PAC_FLOOR && bd.amt > 0.001) {
        // The game board: the centre of its outline goes to its spot on the canvas, however
        // the plate is turned and whatever the view offset below does to the picture.
        const ppm = (size.height * e.zoom) / (2 * dist * fovTan);
        const o = boardOutline(e.tilt, PLATE_YAW + e.spin);
        const bx = (bd.tx - size.width / 2 + ex.shift * VIEW_SHIFT * size.width) / ppm - o.cx;
        const by = -(bd.ty - size.height / 2) / ppm - o.cy;
        b.off.x = THREE.MathUtils.lerp(b.off.x, bx, bd.amt);
        b.off.y = THREE.MathUtils.lerp(b.off.y, by, bd.amt);
      }
      b.off.applyQuaternion(cam.quaternion);
      b.pos.copy(cam.position).add(b.off);
      b.q1.setFromAxisAngle(AX_X, e.tilt);
      b.q2.setFromAxisAngle(AX_Y, PLATE_YAW + e.spin);
      b.quat.copy(cam.quaternion).multiply(b.q1).multiply(b.q2);
      // Blend slot -> camera pose with the (already damped) pop-out amount. No extra lag:
      // once fully out the plate is rigidly linked to the camera.
      const k = e.t * e.t * (3 - 2 * e.t);
      e.pos.copy(b.rest).lerp(b.pos, k);
      e.quat.identity().slerp(b.quat, k);
    };
    pose(ex);
    pose(prev);
    // shift the picture right so the tower sits left of the pulled-out floor
    const cam2 = cam as THREE.PerspectiveCamera;
    if (ex.shift > 0.001) cam2.setViewOffset(size.width, size.height, ex.shift * VIEW_SHIFT * size.width, 0, size.width, size.height);
    else if (cam2.view?.enabled) cam2.clearViewOffset();
    const want = x.gap > 0.001 || ex.floor >= 0 || prev.floor >= 0 || explode || selected !== null;
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

      <Environment map={env} />
      <Sky night={skyNight} hdri={env} />
      <Blender night={night} garageOpen={garageOpen} onSkyNight={setSkyNight} onGarageMounted={setGarageMounted} />

      <group>
        <GlassStages night={night} dim={dim} lively={!busy} env={glassEnv} unit={unit} explodeRef={explodeRef} extractRef={extractRef} outgoingRef={outgoingRef} />
        <Structure visible={showTenants && !explode} />
        <FloorSlices
          showTenants={showTenants}
          explode={explode}
          hovered={hovered}
          selected={selected}
          onHover={onHover}
          onSelect={onSelect}
          interactive={!busy}
          explodeRef={explodeRef}
          extractRef={extractRef} outgoingRef={outgoingRef}
          onPlateDrag={onPlateDrag}
          onPlateZoom={onPlateZoom}
        />
        <Interiors explodeRef={explodeRef} extractRef={extractRef} outgoingRef={outgoingRef} active={interiorsActive} hideFloor={pacman ? PAC_FLOOR : -1} />
        {pacman && <PacmanBoard extractRef={extractRef} lang={lang} />}
        <Entrances />
        <ConfettiCannons active={typing} />
        {labelFloor !== null && !busy && selected === null && <FloorLabel floor={labelFloor} explode={explode} lang={lang} />}
      </group>

      <Site lang={lang} night={night} interactive={!busy} onPlayBridge={onPlayBridge} onHoverBridge={onHoverBridge} />
      <GaragePeekTarget onChange={setPeek} />
      {garageMounted && <Garage lang={lang} />}

      <OrbitControls
        ref={controlsRef as never}
        makeDefault
        enablePan={false}
        enabled={!busy}
        autoRotate={autoRotate && !busy}
        autoRotateSpeed={0.5}
        zoomToCursor
        minDistance={explode ? 14 : 45}
        maxDistance={600}
        maxPolarAngle={showGarage ? Math.PI * 0.64 : Math.PI * 0.495}
        target={[0, 58, 0]}
      />
      <CameraRig showGarage={showGarage} explode={explode} facing={cleaning.active ? "cleaning" : typing ? "typing" : crossing ? "crossing" : race ? "race" : "none"} controlsRef={controlsRef} />
    </>
  );
}
