import { createGlassEnv } from "../facadeShader";
import * as THREE from "three";
import { useEffect, useMemo } from "react";
import { useLoader, useThree } from "@react-three/fiber";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

export const HDRI = {
  day: "/hdri/kloofendal_48d_partly_cloudy_puresky_2k.hdr",
  night: "/hdri/shanghai_bund_2k.hdr",
};

/** Loads both HDRIs once; returns the current one for the sky and its PMREM for the glass. */
export function useHdri(night: boolean) {
  const [day, nite] = useLoader(RGBELoader, [HDRI.day, HDRI.night]);
  const gl = useThree((st) => st.gl);
  const glass = useMemo(() => {
    for (const t of [day, nite]) t.mapping = THREE.EquirectangularReflectionMapping;
    return [createGlassEnv(gl, day), createGlassEnv(gl, nite)];
  }, [gl, day, nite]);
  useEffect(() => () => glass.forEach((t) => t.dispose()), [glass]);
  return night ? { env: nite, glassEnv: glass[1] } : { env: day, glassEnv: glass[0] };
}
