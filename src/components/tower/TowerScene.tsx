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
      // PCF: three removed PCFSoftShadowMap in r186, which the bare `shadows` flag still asks for.
      shadows="percentage"
      dpr={dpr}
      camera={{ position: [200, 120, 160], fov: 36, near: 1, far: 2500 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      // a stray click beside the board must not end the game; its HUD has the way out
      onPointerMissed={() => !props.pacman && props.onSelect(null)}
      className="!absolute inset-0"
    >
      <Suspense fallback={null}>
        <Scene {...props} />
      </Suspense>
    </Canvas>
  );
}
