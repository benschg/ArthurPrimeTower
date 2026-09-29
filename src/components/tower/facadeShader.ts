import * as THREE from "three";

/**
 * Glass facade shader.
 *
 * - Samples an equirectangular HDRI directly for reflections, blurred by mip level
 *   according to roughness, and weighted by a Schlick Fresnel term so the glass
 *   goes from emerald when seen head-on to a bright mirror at grazing angles
 *   (the colour shift the architects describe).
 * - Base colour comes from the procedural window texture; a separate mask lights
 *   individual windows at night.
 * - Uses GLSL3 so textureLod is available; three.js aliases gl_FragColor/varying.
 */

export const facadeVertex = /* glsl */ `
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec2 vUv;

void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const facadeFragment = /* glsl */ `
uniform sampler2D uMap;
uniform sampler2D uLit;
uniform sampler2D uEnv;
uniform vec2 uRepeat;
uniform float uNight;
uniform float uOpacity;
uniform float uReflectivity;
uniform float uRoughness;
uniform float uEnvMaxLod;
uniform float uEnvRotation;
uniform float uEnvIntensity;
uniform vec3 uSunDir;
uniform vec3 uTintNear;
uniform vec3 uTintFar;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec2 vUv;

// GLSL3: declare the fragment output ourselves and alias it so three's chunks can use it.
layout(location = 0) out highp vec4 fragColor;
#define gl_FragColor fragColor

#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535

vec2 equirectUv(vec3 d) {
  float u = atan(d.z, d.x) * RECIPROCAL_PI2 + 0.5;
  float v = asin(clamp(d.y, -1.0, 1.0)) * RECIPROCAL_PI + 0.5;
  return vec2(u, v);
}

void main() {
  vec2 uv = vUv * uRepeat;
  vec4 base = texture2D(uMap, uv);
  float lit = texture2D(uLit, uv).r;

  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float NdV = clamp(dot(N, V), 0.0, 1.0);
  float fresnel = 0.16 + 0.84 * pow(1.0 - NdV, 5.0);

  vec3 R = reflect(-V, N);
  float c = cos(uEnvRotation);
  float s = sin(uEnvRotation);
  R = vec3(c * R.x + s * R.z, R.y, -s * R.x + c * R.z);
  float lod = uRoughness * uEnvMaxLod * (1.0 - 0.6 * fresnel);
  vec3 env = textureLod(uEnv, equirectUv(R), lod).rgb * uEnvIntensity;

  float diff = 0.5 + 0.5 * max(dot(N, uSunDir), 0.0);
  vec3 tint = mix(uTintNear, uTintFar, fresnel);
  vec3 dayColor = base.rgb * tint * diff;
  vec3 nightColor = base.rgb * 0.16 + lit * vec3(1.0, 0.8, 0.5) * 1.15;
  vec3 surface = mix(dayColor, nightColor, uNight);

  vec3 color = surface * (1.0 - 0.55 * fresnel) + env * fresnel * uReflectivity;
  gl_FragColor = vec4(color, uOpacity);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export type FacadeUniforms = {
  uMap: { value: THREE.Texture | null };
  uLit: { value: THREE.Texture | null };
  uEnv: { value: THREE.Texture | null };
  uRepeat: { value: THREE.Vector2 };
  uNight: { value: number };
  uOpacity: { value: number };
  uReflectivity: { value: number };
  uRoughness: { value: number };
  uEnvMaxLod: { value: number };
  uEnvRotation: { value: number };
  uEnvIntensity: { value: number };
  uSunDir: { value: THREE.Vector3 };
  uTintNear: { value: THREE.Color };
  uTintFar: { value: THREE.Color };
};

export function createFacadeUniforms(): FacadeUniforms {
  return {
    uMap: { value: null },
    uLit: { value: null },
    uEnv: { value: null },
    uRepeat: { value: new THREE.Vector2(1, 1) },
    uNight: { value: 0 },
    uOpacity: { value: 1 },
    uReflectivity: { value: 1.6 },
    uRoughness: { value: 0.12 },
    uEnvMaxLod: { value: 10 },
    uEnvRotation: { value: 0 },
    uEnvIntensity: { value: 1 },
    uSunDir: { value: new THREE.Vector3(-0.45, 0.75, 0.45).normalize() },
    uTintNear: { value: new THREE.Color("#ffffff") },
    uTintFar: { value: new THREE.Color("#eafff8") },
  };
}

/** Constructor parameters for the facade ShaderMaterial (used via JSX <shaderMaterial args={[params]} />). */
export function facadeMaterialParams(): THREE.ShaderMaterialParameters & { uniforms: FacadeUniforms } {
  return {
    uniforms: createFacadeUniforms(),
    vertexShader: facadeVertex,
    fragmentShader: facadeFragment,
    glslVersion: THREE.GLSL3,
    transparent: true,
  };
}

export type FacadeMaterial = THREE.ShaderMaterial & { uniforms: FacadeUniforms };

/** Prepare an equirectangular HDR for direct sampling with mipmaps. */
export function prepareEnvTexture(tex: THREE.Texture): THREE.Texture {
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

export function envMaxLod(tex: THREE.Texture): number {
  const img = tex.image as { width?: number; height?: number } | undefined;
  const size = Math.max(img?.width ?? 1024, img?.height ?? 512);
  return Math.log2(size);
}
