import * as THREE from "three";
import { useMemo } from "react";
import { canvasTexture } from "./helpers";

/** Radial glow sprite texture for the aviation lights. */
export function useGlowTexture() {
  return useMemo(
    () =>
      canvasTexture(128, 128, (ctx) => {
        const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, "rgba(255,70,50,1)");
        g.addColorStop(0.25, "rgba(255,50,40,0.55)");
        g.addColorStop(0.6, "rgba(255,40,30,0.12)");
        g.addColorStop(1, "rgba(255,40,30,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 128, 128);
      }),
    [],
  );
}

/** Louvre stripes for the roof plant enclosure. */
export function useLouvreTexture() {
  return useMemo(() => {
    const tex = canvasTexture(16, 128, (ctx) => {
      ctx.fillStyle = "#232c36";
      ctx.fillRect(0, 0, 16, 128);
      ctx.fillStyle = "#0f151c";
      for (let y = 0; y < 128; y += 8) ctx.fillRect(0, y, 16, 3);
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 6);
    return tex;
  }, []);
}
