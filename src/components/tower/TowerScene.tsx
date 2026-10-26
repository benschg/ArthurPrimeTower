"use client";

import * as THREE from "three";
import { memo, useEffect, useRef, useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import type { SceneProps } from "./scene/types";
import { Scene } from "./scene/Scene";

/**
 * The canvas. Rendered client-side only (dynamic import, ssr: false), so window is available.
 * Memoised: the viewer re-renders for its HUD far more often than the scene's props change.
 */
function TowerScene(props: SceneProps) {
  // Pixel ratio: capped lower on phones, and stepped down toward 1 on devices that cannot hold
  // the frame rate (PerformanceMonitor: after a few seconds well under the refresh rate).
  const [maxDpr] = useState(() => (window.matchMedia("(max-width: 640px)").matches ? 1.25 : 1.75));
  const [dpr, setDpr] = useState(maxDpr);
  // Nothing to draw while the viewer is scrolled out of sight: the page below stays smooth.
  const canvas = useRef<HTMLCanvasElement>(null);
  const [onScreen, setOnScreen] = useState(true);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Canvas
      ref={canvas}
      // PCF: three removed PCFSoftShadowMap in r186, which the bare `shadows` flag still asks for.
      shadows="percentage"
      dpr={[1, dpr]}
      frameloop={onScreen ? "always" : "never"}
      camera={{ position: [200, 120, 160], fov: 36, near: 1, far: 2500 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      // a stray click beside the board must not end the game; its HUD has the way out
      onPointerMissed={() => !props.pacman && props.onSelect(null)}
      className="!absolute inset-0"
    >
      <PerformanceMonitor factor={1} flipflops={3} onChange={({ factor }) => setDpr(Math.round((1 + (maxDpr - 1) * factor) * 4) / 4)} />
      <Suspense fallback={null}>
        <Scene {...props} />
      </Suspense>
    </Canvas>
  );
}

export default memo(TowerScene);
