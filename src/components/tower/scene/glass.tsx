import { createFacadeMaterial, cubeUVDefines } from "../facadeShader";
import { blinds } from "../blinds";
import { windows } from "../windows";
import { facadeLife } from "../facadeLife";
import * as THREE from "three";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { FacadeMaterial } from "../facadeShader";
import type { ExtractState } from "../Interiors";
import { FLOORS, floorHeight, floorElevation, stageForFloor } from "../geometry";
import { liftAbove, extrudeUp, bulgeLift, bulgeScale, type ExplodeState } from "./helpers";
import type { UnitProps } from "./types";
import { MaintenanceUnit } from "./maintenance";
import { Roof } from "./roof";
import { DAY_GROUND, NIGHT_GROUND } from "./blender";

export function GlassStages({
  night,
  dim,
  lively,
  env,
  unit,
  explodeRef,
  extractRef,
  outgoingRef,
}: {
  night: boolean;
  dim: boolean;
  /** windows and blinds change by themselves now and then (off while a game owns the facade) */
  lively: boolean;
  env: THREE.Texture;
  unit: UnitProps;
  explodeRef: RefObject<ExplodeState>;
  extractRef: RefObject<ExtractState>;
  outgoingRef: RefObject<ExtractState>;
}) {
  const roofRef = useRef<THREE.Group>(null);
  const ringsRef = useRef<THREE.Group>(null);
  // A pulled-out floor's ring fades away so the plate does not clip through it. Faded rings
  // get their own material clone (uniforms synced from the shared one each frame): a shared
  // material's uniforms are only re-uploaded when the material changes between draws, so a
  // per-object tweak would be skipped or leak onto neighbouring rings.
  const fadeMats = useRef<FacadeMaterial[] | null>(null);
  // The shared material is reached through the first ring so it is mutated as a scene
  // object, not as a memoised value.
  const mat = () => (ringsRef.current?.children[0] as THREE.Mesh | undefined)?.material as FacadeMaterial | undefined;
  // One shared facade material; one glass ring per floor so the stack can open and explode.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- env swaps via the uniform below
  const material = useMemo(() => createFacadeMaterial(env), []);
  const rings = useMemo(
    () =>
      Array.from({ length: FLOORS }, (_, f) => {
        // closed ring, 1.5 cm short so the caps of stacked rings never share a plane (no z-fighting)
        const g = extrudeUp(stageForFloor(f).polygon, floorHeight(f) - 0.015);
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
    if (lively) facadeLife.update(dt);
    blinds.update(dt);
    windows.update(dt);
    const gap = explodeRef.current?.gap ?? 0;
    const ex = extractRef.current;
    const prev = outgoingRef.current;
    if (!ex || !prev) return;
    if (roofRef.current) roofRef.current.position.y = (FLOORS - 1) * gap + liftAbove(FLOORS, ex, prev);
    const m = mat();
    if (!m) return;
    if (!fadeMats.current) {
      // Built from the factory rather than m.clone(): cloning a material copies its uniforms,
      // and uEnv holds a PMREM render-target texture, which cloneUniforms cannot copy (it warns
      // and shares the reference). syncClone below sets uEnv and the rest anyway.
      fadeMats.current = [0, 1].map(() => {
        const c = createFacadeMaterial(m.uniforms.uEnv.value as THREE.Texture);
        c.depthWrite = false;
        return c;
      });
    }
    const syncClone = (c: FacadeMaterial, fade: number) => {
      for (const key in m.uniforms) {
        const v = m.uniforms[key].value;
        const target = c.uniforms[key];
        if (!target) continue;
        if (v && typeof v === "object" && "copy" in v && !("isTexture" in v)) (target.value as { copy: (x: unknown) => void }).copy(v);
        else target.value = v;
      }
      c.uniforms.uOpacity.value = m.uniforms.uOpacity.value * fade;
      if (c.defines.CUBEUV_TEXEL_HEIGHT !== m.defines.CUBEUV_TEXEL_HEIGHT) {
        c.defines = { ...m.defines };
        c.needsUpdate = true;
      }
    };
    const fadeOf = (t: number) => 1 - THREE.MathUtils.smoothstep(t, 0, 0.35);
    if (ringsRef.current) {
      ringsRef.current.children.forEach((child, f) => {
        const ring = child as THREE.Mesh;
        const xs = explodeRef.current;
        ring.position.y = floorElevation(f) + f * gap + liftAbove(f, ex, prev) + (xs ? bulgeLift(f, xs) : 0);
        const bs = xs ? bulgeScale(f, xs) : 1;
        ring.scale.set(bs, 1, bs);
        const slot = f === ex.floor ? 0 : f === prev.floor ? 1 : -1;
        const fade = slot === 0 ? fadeOf(ex.t) : slot === 1 ? fadeOf(prev.t) : 1;
        if (slot >= 0 && fade < 0.999) {
          const c = fadeMats.current![slot];
          syncClone(c, fade);
          if (ring.material !== c) ring.material = c;
        } else if (ring.material !== m) {
          ring.material = m;
        }
      });
    }
    const u = m.uniforms;
    u.uBlindColor.value.copy(blinds.tint);
    u.uBlindGlow.value = blinds.glow;
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
