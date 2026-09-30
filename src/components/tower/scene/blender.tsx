import * as THREE from "three";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

export const DAY_FOG = new THREE.Color("#1a2230");

export const NIGHT_FOG = new THREE.Color("#070a10");

export const DAY_SUN = new THREE.Color("#fff3dd");

export const NIGHT_SUN = new THREE.Color("#9fb4d6");

export const DAY_GROUND = new THREE.Color("#161d27");

export const NIGHT_GROUND = new THREE.Color("#0d131a");

/**
 * Drives the day/night and garage fades imperatively every frame (no React re-renders):
 * lights, fog, sky intensities, ground opacity and garage opacities. React is only told
 * when the sky HDRI should swap (midpoint of the fade) and when the garage should mount.
 */
export function Blender({
  night,
  garageOpen,
  onSkyNight,
  onGarageMounted,
}: {
  night: boolean;
  garageOpen: boolean;
  onSkyNight: (v: boolean) => void;
  onGarageMounted: (v: boolean) => void;
}) {
  const state = useRef({ night: night ? 1 : 0, garage: 0, skyNight: night, mounted: false });
  const tmp = useRef(new THREE.Color());

  useFrame(({ scene }, dt) => {
    const st = state.current;
    const refs = {
      ambient: scene.getObjectByName("ambient") as THREE.AmbientLight | undefined,
      sun: scene.getObjectByName("sun") as THREE.DirectionalLight | undefined,
      fill: scene.getObjectByName("fill") as THREE.DirectionalLight | undefined,
      fog: scene.fog as THREE.Fog | null,
      ground: (scene.getObjectByName("ground") as THREE.Mesh | undefined)?.material as THREE.MeshStandardMaterial | undefined,
      garage: scene.getObjectByName("garage") as THREE.Group | undefined,
    };
    st.night = THREE.MathUtils.damp(st.night, night ? 1 : 0, 2.2, dt);
    st.garage = THREE.MathUtils.damp(st.garage, garageOpen ? 1 : 0, 4, dt);
    if (Math.abs(st.night - (night ? 1 : 0)) < 0.004) st.night = night ? 1 : 0;
    if (Math.abs(st.garage - (garageOpen ? 1 : 0)) < 0.004) st.garage = garageOpen ? 1 : 0;
    const nt = st.night;
    const gt = st.garage;
    scene.userData.nightBlend = nt;

    // lights and fog
    if (refs.ambient) refs.ambient.intensity = THREE.MathUtils.lerp(0.5, 0.22, nt);
    if (refs.sun) {
      refs.sun.intensity = THREE.MathUtils.lerp(2.4, 0.45, nt);
      refs.sun.color.copy(DAY_SUN).lerp(NIGHT_SUN, nt);
    }
    if (refs.fill) refs.fill.intensity = THREE.MathUtils.lerp(0.6, 0.2, nt);
    if (refs.fog) refs.fog.color.copy(DAY_FOG).lerp(NIGHT_FOG, nt);

    // sky: swap the HDRI at the midpoint, dipping through dark to hide the cut.
    // The night backdrop is the starry dome (see Sky), authored at its final brightness.
    const skyNight = nt >= 0.5;
    if (skyNight !== st.skyNight) {
      st.skyNight = skyNight;
      onSkyNight(skyNight);
    }
    const dip = 1 - Math.min(1, Math.abs(nt - 0.5) * 2);
    scene.backgroundIntensity = (skyNight ? 1 : 0.55) * (1 - dip * 0.9);
    scene.environmentIntensity = (skyNight ? 0.5 : 0.8) * (1 - dip * 0.6);
    scene.backgroundBlurriness = skyNight ? 0 : 0.02;

    // ground and garage
    const ground = refs.ground;
    if (ground) {
      ground.opacity = THREE.MathUtils.lerp(1, 0.12, gt);
      ground.color.copy(tmp.current.copy(DAY_GROUND).lerp(NIGHT_GROUND, nt));
    }
    const mounted = gt > 0.001;
    if (mounted !== st.mounted) {
      st.mounted = mounted;
      onGarageMounted(mounted);
    }
    const g = refs.garage;
    if (g) {
      g.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.Material | undefined;
        if (m && m.userData.baseOpacity !== undefined) m.opacity = m.userData.baseOpacity * gt;
      });
      for (const el of document.querySelectorAll<HTMLElement>(".garage-label")) el.style.opacity = String(gt);
    }
  });
  return null;
}
