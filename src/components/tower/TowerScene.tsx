"use client";

import * as THREE from "three";
import { useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import type { SceneProps } from "./scene/types";
import { Scene } from "./scene/Scene";

export type { CleanState, SceneProps, ViewerState } from "./scene/types";
export type { ExtractState } from "./Interiors";

export default function TowerScene(props: SceneProps) {
  // Rendered client-side only (dynamic import, ssr: false), so window is available.
  const [dpr] = useState<[number, number]>(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches ? [1, 1.25] : [1, 1.75],
  );
  return (
    <Canvas
      shadows
      dpr={dpr}
      camera={{ position: [200, 120, 160], fov: 36, near: 1, far: 2500 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      onPointerMissed={() => props.onSelect(null)}
      className="!absolute inset-0"
    >
      <Suspense fallback={null}>
        <Scene {...props} />
      </Suspense>
    </Canvas>
  );
}
