import { createFacadeMaterial, cubeUVDefines } from "../facadeShader";
import * as THREE from "three";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { FacadeMaterial } from "../facadeShader";
import type { ExtractState } from "../Interiors";
import { FLOORS, floorHeight, floorElevation, stageForFloor } from "../geometry";
import { extrudeUp, liftAbove } from "./helpers";
import type { UnitProps } from "./types";
import { MaintenanceUnit } from "./maintenance";
import { Roof } from "./roof";
import { DAY_GROUND, NIGHT_GROUND } from "./blender";

export function GlassStages({
  night,
  dim,
  env,
  unit,
  explodeRef,
  extractRef,
  outgoingRef,
}: {
  night: boolean;
  dim: boolean;
  env: THREE.Texture;
  unit: UnitProps;
  explodeRef: RefObject<{ gap: number; thin: number }>;
  extractRef: RefObject<ExtractState>;
  outgoingRef: RefObject<ExtractState>;
}) {
  const roofRef = useRef<THREE.Group>(null);
  const ringsRef = useRef<THREE.Group>(null);
  // Per-ring opacity factor (1 = normal). A pulled-out floor's ring fades away so the plate
  // does not clip through it; applied per draw via onBeforeRender on the shared material.
  const fades = useRef<Float32Array>(new Float32Array(FLOORS).fill(1));
  const ringRef = (f: number) => (m: THREE.Mesh | null) => {
    if (!m) return;
    m.onBeforeRender = () => {
      const mat = m.material as FacadeMaterial;
      const fade = fades.current[f];
      if (fade < 0.999) {
        mat.userData.savedOpacity = mat.uniforms.uOpacity.value;
        mat.userData.savedDepth = mat.depthWrite;
        mat.uniforms.uOpacity.value *= fade;
        mat.depthWrite = false;
      }
    };
    m.onAfterRender = () => {
      const mat = m.material as FacadeMaterial;
      if (mat.userData.savedOpacity !== undefined) {
        mat.uniforms.uOpacity.value = mat.userData.savedOpacity;
        mat.depthWrite = mat.userData.savedDepth;
        delete mat.userData.savedOpacity;
        delete mat.userData.savedDepth;
      }
    };
  };
  // One shared facade material; one glass ring per floor so the stack can open and explode.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- env swaps via the uniform below
  const material = useMemo(() => createFacadeMaterial(env), []);
  const rings = useMemo(
    () =>
      Array.from({ length: FLOORS }, (_, f) => {
        const g = extrudeUp(stageForFloor(f).polygon, floorHeight(f));
        // floor index and height: the shader's interior mapping and per-pane variation key on them
        const n = g.attributes.position.count;
        const a = new Float32Array(n * 2);
        for (let i = 0; i < n; i++) {
          a[i * 2] = f;
          a[i * 2 + 1] = floorHeight(f);
        }
        g.setAttribute("aFloor", new THREE.BufferAttribute(a, 2));
        return g;
      }),
    [],
  );
  const mat = () => (ringsRef.current?.children[0] as THREE.Mesh | undefined)?.material as FacadeMaterial | undefined;

  useEffect(() => {
    const m = mat();
    if (!m) return;
    m.uniforms.uEnv.value = env;
    // day and night HDRIs differ in resolution: the cube-UV sampling constants follow the texture
    const defines = cubeUVDefines(env);
    if (defines.CUBEUV_TEXEL_HEIGHT !== m.defines.CUBEUV_TEXEL_HEIGHT) {
      m.defines = defines;
      m.needsUpdate = true;
    }
  }, [env]);

  useFrame((_, dt) => {
    const gap = explodeRef.current?.gap ?? 0;
    const ex = extractRef.current;
    const prev = outgoingRef.current;
    if (!ex || !prev) return;
    if (roofRef.current) roofRef.current.position.y = (FLOORS - 1) * gap + liftAbove(FLOORS, ex, prev);
    const fadeOf = (t: number) => 1 - THREE.MathUtils.smoothstep(t, 0, 0.35);
    if (ringsRef.current) {
      ringsRef.current.children.forEach((ring, f) => {
        ring.position.y = floorElevation(f) + f * gap + liftAbove(f, ex, prev);
        fades.current[f] = f === ex.floor ? fadeOf(ex.t) : f === prev.floor ? fadeOf(prev.t) : 1;
      });
    }
    const m = mat();
    if (!m) return;
    const u = m.uniforms;
    u.uNight.value = THREE.MathUtils.damp(u.uNight.value, night ? 1 : 0, 3, dt);
    u.uOpacity.value = THREE.MathUtils.damp(u.uOpacity.value, dim ? 0.14 : 1, 6, dt);
    u.uEnvIntensity.value = THREE.MathUtils.damp(u.uEnvIntensity.value, night ? 0.3 : 1.15, 3, dt);
    u.uSunIntensity.value = THREE.MathUtils.damp(u.uSunIntensity.value, night ? 0 : 2.4, 3, dt);
    u.uGround.value.lerpColors(DAY_GROUND, NIGHT_GROUND, u.uNight.value);
    m.depthWrite = !dim;
  });

  return (
    <group>
      <group ref={ringsRef}>
        {rings.map((g, f) => (
          <mesh key={f} ref={ringRef(f)} geometry={g} material={material} position={[0, floorElevation(f), 0]} castShadow receiveShadow />
        ))}
      </group>
      {/* the roof and the cradle ride up with the exploded stack */}
      <group ref={roofRef}>
        <Roof night={night} party={unit.cleaning.active && unit.cleaning.progress >= 0.99} />
        <MaintenanceUnit {...unit} />
      </group>
    </group>
  );
}
