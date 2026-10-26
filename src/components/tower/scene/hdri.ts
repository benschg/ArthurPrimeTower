import * as THREE from "three";
import { use, useEffect, useMemo, useState } from "react";
import { useThree } from "@react-three/fiber";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { createGlassEnv } from "./facadeShader";

export const HDRI = {
  day: "/hdri/kloofendal_48d_partly_cloudy_puresky_2k.hdr",
  night: "/hdri/shanghai_bund_2k.hdr",
};

// One download of each sky however many parts of the scene ask for it.
const loads = new Map<string, Promise<THREE.Texture>>();
function load(url: string): Promise<THREE.Texture> {
  let p = loads.get(url);
  if (!p) {
    p = new HDRLoader().loadAsync(url).then((t) => {
      t.mapping = THREE.EquirectangularReflectionMapping;
      return t;
    });
    loads.set(url, p);
  }
  return p;
}

/**
 * The two skies. The scene waits (suspends) for the day one only; the night one, 6.5 MB, is
 * fetched once the scene is up and is null until it arrives, so the day sky stands in for it.
 */
export function useHdri(): { day: THREE.Texture; night: THREE.Texture | null } {
  const day = use(load(HDRI.day));
  const [night, setNight] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let live = true;
    load(HDRI.night).then((t) => live && setNight(t));
    return () => {
      live = false;
    };
  }, []);
  return { day, night };
}

/** GGX-prefiltered (PMREM) versions of the two skies for the glass; the night one is made as soon as its sky arrives. */
export function useGlassEnvs(): { day: THREE.Texture; night: THREE.Texture | null } {
  const hdri = useHdri();
  const gl = useThree((st) => st.gl);
  const day = useMemo(() => createGlassEnv(gl, hdri.day), [gl, hdri.day]);
  const night = useMemo(() => (hdri.night ? createGlassEnv(gl, hdri.night) : null), [gl, hdri.night]);
  useEffect(() => () => day.dispose(), [day]);
  useEffect(() => () => night?.dispose(), [night]);
  return { day, night };
}
