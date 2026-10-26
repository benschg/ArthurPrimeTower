import * as THREE from "three";
import { blinds } from "../blinds";
import { FLOORS } from "../geometry";
import { PANE_COLUMNS, type PaneField } from "../paneField";
import { windows } from "../windows";
import { facadeFragment, facadeVertex } from "./facadeGlsl";

// The glass facade's material (its shaders are in facadeGlsl.ts), its uniforms and the textures it samples.

/** One byte per pane per floor, uploaded again whenever its field has changed (see syncPaneTextures). */
function paneTexture(field: PaneField): THREE.DataTexture {
  const tex = new THREE.DataTexture(field.data, PANE_COLUMNS, FLOORS, THREE.RedFormat, THREE.UnsignedByteType);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  tex.userData.version = field.version;
  return tex;
}

const paneTextures = { blinds: paneTexture(blinds), windows: paneTexture(windows) };

/** Re-upload the blinds and windows textures if their fields changed; call after updating them. */
export function syncPaneTextures(): void {
  for (const [tex, field] of [
    [paneTextures.blinds, blinds],
    [paneTextures.windows, windows],
  ] as const) {
    if (tex.userData.version === field.version) continue;
    tex.userData.version = field.version;
    tex.needsUpdate = true;
  }
}

export type FacadeUniforms = {
  uEnv: { value: THREE.Texture | null };
  uNight: { value: number };
  uOpacity: { value: number };
  uReflectivity: { value: number };
  uRoughness: { value: number };
  uEnvIntensity: { value: number };
  uSunDir: { value: THREE.Vector3 };
  uSunIntensity: { value: number };
  uF0: { value: THREE.Color };
  uGlassTint: { value: THREE.Color };
  uGround: { value: THREE.Color };
  uBlinds: { value: THREE.Texture };
  uBlindsSize: { value: THREE.Vector2 };
  uBlindColor: { value: THREE.Color };
  uBlindGlow: { value: number };
  uWindows: { value: THREE.Texture };
};

export function createFacadeUniforms(): FacadeUniforms {
  return {
    uEnv: { value: null },
    uNight: { value: 0 },
    uOpacity: { value: 1 },
    uReflectivity: { value: 1 },
    uRoughness: { value: 0.06 },
    uEnvIntensity: { value: 1 },
    uSunDir: { value: new THREE.Vector3(-0.45, 0.75, 0.45).normalize() },
    uSunIntensity: { value: 2.4 },
    // coated solar-control glass: greenish reflection head-on, neutral at grazing angles
    uF0: { value: new THREE.Color().setRGB(0.1, 0.19, 0.17) },
    // transmittance of one pane at normal incidence
    uGlassTint: { value: new THREE.Color().setRGB(0.72, 0.9, 0.84) },
    uGround: { value: new THREE.Color("#161d27") },
    uBlinds: { value: paneTextures.blinds },
    uBlindsSize: { value: new THREE.Vector2(PANE_COLUMNS, FLOORS) },
    uBlindColor: { value: new THREE.Color(0.5, 0.49, 0.46) },
    uBlindGlow: { value: 0 },
    uWindows: { value: paneTextures.windows },
  };
}

export type FacadeMaterial = THREE.ShaderMaterial & { uniforms: FacadeUniforms };

/** Defines three's cube-UV chunk needs for a PMREM texture (mirrors WebGLProgram's generateCubeUVSize). */
export function cubeUVDefines(pmrem: THREE.Texture): Record<string, string | number> {
  const imageHeight = (pmrem.image as { height: number }).height;
  const maxMip = Math.log2(imageHeight) - 2;
  return {
    ENVMAP_TYPE_CUBE_UV: "",
    CUBEUV_TEXEL_WIDTH: 1 / (3 * Math.max(Math.pow(2, maxMip), 7 * 16)),
    CUBEUV_TEXEL_HEIGHT: 1 / imageHeight,
    CUBEUV_MAX_MIP: maxMip.toFixed(1),
  };
}

/** The facade material for a PMREM environment (swap uEnv later for one of the same size). */
export function createFacadeMaterial(pmrem: THREE.Texture): FacadeMaterial {
  const uniforms = createFacadeUniforms();
  uniforms.uEnv.value = pmrem;
  return new THREE.ShaderMaterial({
    uniforms,
    defines: cubeUVDefines(pmrem),
    vertexShader: facadeVertex,
    fragmentShader: facadeFragment,
    glslVersion: THREE.GLSL3,
    transparent: true,
    premultipliedAlpha: true,
  }) as FacadeMaterial;
}

/** GGX-prefiltered (PMREM) version of an equirectangular HDR for the glass reflections. */
export function createGlassEnv(renderer: THREE.WebGLRenderer, equirect: THREE.Texture): THREE.Texture {
  const gen = new THREE.PMREMGenerator(renderer);
  const rt = gen.fromEquirectangular(equirect);
  gen.dispose();
  return rt.texture;
}
