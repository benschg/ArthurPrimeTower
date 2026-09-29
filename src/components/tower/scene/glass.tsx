import { createFacadeMaterial, cubeUVDefines } from "../facadeShader";
import * as THREE from "three";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { FacadeMaterial } from "../facadeShader";
import { OPEN_GAP, type ExtractState } from "../Interiors";
import { FLOORS, floorHeight, floorElevation, stageForFloor } from "../geometry";
import { extrudeUp } from "./helpers";
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
}: {
  night: boolean;
  dim: boolean;
  env: THREE.Texture;
  unit: UnitProps;
  explodeRef: RefObject<{ gap: number; thin: number }>;
  extractRef: RefObject<ExtractState>;
}) {
  const roofRef = useRef<THREE.Group>(null);
  const ringsRef = useRef<THREE.Group>(null);
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
    const opening = ex && ex.floor >= 0 ? OPEN_GAP * ex.open : 0;
    if (roofRef.current) roofRef.current.position.y = (FLOORS - 1) * gap + opening;
    if (ringsRef.current) {
      ringsRef.current.children.forEach((ring, f) => {
        ring.position.y = floorElevation(f) + f * gap + (ex && ex.floor >= 0 && f > ex.floor ? opening : 0);
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
          <mesh key={f} geometry={g} material={material} position={[0, floorElevation(f), 0]} castShadow receiveShadow />
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
