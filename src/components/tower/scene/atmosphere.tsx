import * as THREE from "three";
import { memo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useHdri } from "./hdri";
import { Stars, useNightDome } from "./nightSky";
import { DAY_FOG, DAY_SUN, NIGHT_FOG, NIGHT_SUN } from "./palette";
import { useStage } from "./stage";

/**
 * Light, fog and sky, and the day/night fade they go through together. The fade runs every
 * frame without React: it eases the stage's night blend (which the stars, the ground and the
 * traffic follow) and from it sets the lights, the fog and the scene's background and
 * environment. The sky swaps at the midpoint of the fade, dipping through dark to hide the cut.
 */
export const Atmosphere = memo(function Atmosphere({ night }: { night: boolean }) {
  const { blendRef } = useStage();
  const hdri = useHdri();
  const dome = useNightDome();
  const fog = useRef<THREE.Fog>(null);
  const ambient = useRef<THREE.AmbientLight>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const fill = useRef<THREE.DirectionalLight>(null);

  useFrame(({ scene }, dt) => {
    const b = blendRef.current;
    const want = night ? 1 : 0;
    b.night = THREE.MathUtils.damp(b.night, want, 2.2, dt);
    if (Math.abs(b.night - want) < 0.004) b.night = want;
    const nt = b.night;

    if (ambient.current) ambient.current.intensity = THREE.MathUtils.lerp(0.5, 0.22, nt);
    if (sun.current) {
      sun.current.intensity = THREE.MathUtils.lerp(2.4, 0.45, nt);
      sun.current.color.copy(DAY_SUN).lerp(NIGHT_SUN, nt);
    }
    if (fill.current) fill.current.intensity = THREE.MathUtils.lerp(0.6, 0.2, nt);
    fog.current?.color.copy(DAY_FOG).lerp(NIGHT_FOG, nt);

    // By night the backdrop is the starry dome (see Stars), authored at its final brightness,
    // while the night HDRI lights the scene and shows in the glass (the day one until it has loaded).
    const skyNight = nt >= 0.5;
    const background = skyNight ? dome : hdri.day;
    if (scene.background !== background) scene.background = background;
    const environment = skyNight && hdri.night ? hdri.night : hdri.day;
    if (scene.environment !== environment) scene.environment = environment;
    const dip = 1 - Math.min(1, Math.abs(nt - 0.5) * 2);
    scene.backgroundIntensity = (skyNight ? 1 : 0.55) * (1 - dip * 0.9);
    scene.environmentIntensity = (skyNight ? 0.5 : 0.8) * (1 - dip * 0.6);
    scene.backgroundBlurriness = skyNight ? 0 : 0.02;
  });

  return (
    <>
      <fog ref={fog} attach="fog" args={["#1a2230", 420, 1100]} />
      <ambientLight ref={ambient} intensity={0.5} />
      <directionalLight
        ref={sun}
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
      <directionalLight ref={fill} position={[160, 90, -140]} intensity={0.6} color="#8fc9ff" />
      <Stars />
    </>
  );
});
