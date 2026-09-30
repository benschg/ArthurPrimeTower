import * as THREE from "three";
import { BLIND_PANES, blinds } from "./blinds";
import { FLOORS } from "./geometry";

/**
 * Glass facade shader, one ring per floor.
 *
 * - Reflection and transmission share the light: colour = mix(behind, env, F), with a
 *   Schlick Fresnel whose F0 is a tinted coating, so the glass is emerald head-on and a
 *   neutral mirror at grazing angles.
 * - Reflections sample a PMREM (GGX-prefiltered) environment. Rays that point below the
 *   horizon hit an analytic ground plane that fades into the horizon with distance.
 * - Every pane is tilted and bowed slightly by a hash of its id, which breaks the
 *   reflection up pane by pane like a real curtain wall. The sun adds a GGX glint.
 * - Behind the glass, interior mapping traces the view ray into a box room per bay:
 *   floor, desks, ceiling lights, partitions and a back wall, seen through the tinted glass
 *   (Beer-Lambert absorption, longer path at grazing angles). Spandrels and mullions hide
 *   the slab edge; some panes have blinds.
 * - Output is premultiplied so reflections stay when the glass fades (tenants/explode).
 */

export const facadeVertex = /* glsl */ `
attribute vec2 aFloor; // floor index, floor-to-floor height

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec2 vUv;
varying vec2 vFloor;

void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vUv = uv;
  vFloor = aFloor;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const facadeFragment = /* glsl */ `
uniform sampler2D uEnv;
uniform float uNight;
uniform float uOpacity;
uniform float uReflectivity;
uniform float uRoughness;
uniform float uEnvIntensity;
uniform vec3 uSunDir;
uniform float uSunIntensity;
uniform vec3 uF0;
uniform vec3 uGlassTint;
uniform vec3 uGround;
uniform sampler2D uBlinds; // one byte per pane per floor, 0 = raised, 255 = fully lowered
uniform vec2 uBlindsSize; // (panes, floors)

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec2 vUv;
varying vec2 vFloor;

// GLSL3: declare the fragment output ourselves and alias it so three's chunks can use it.
layout(location = 0) out highp vec4 fragColor;
#define gl_FragColor fragColor

#include <common>
#include <cube_uv_reflection_fragment>

#define PANE_W 1.5
#define ROOM_W 6.0
#define ROOM_D 7.5
#define SPANDREL 0.47
#define MULLION 0.04

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

vec3 schlick(vec3 f0, float c) {
  return f0 + (1.0 - f0) * pow(1.0 - c, 5.0);
}

/** Anti-aliased coverage of lines of half-width w around multiples of period p (d = coordinate). */
float lines(float d, float p, float w) {
  float fw = fwidth(d) + 1e-4;
  float x = abs(fract(d / p + 0.5) - 0.5) * p;
  float cov = 1.0 - smoothstep(w - fw, w + fw, x);
  return mix(cov, 2.0 * w / p, smoothstep(0.25, 0.8, fw / p));
}

/** Environment along a direction: prefiltered sky above the horizon, a ground plane below. */
vec3 environment(vec3 P, vec3 R, float rough) {
  vec3 sky = textureCubeUV(uEnv, R, rough).rgb * uEnvIntensity;
  if (R.y >= 0.0) return sky;
  float t = -P.y / min(R.y, -1e-4);
  vec3 horizon = textureCubeUV(uEnv, normalize(vec3(R.x, 0.03, R.z)), max(rough, 0.35)).rgb * uEnvIntensity;
  // near: the ground; far: haze into the horizon
  vec3 ground = uGround * (0.6 + 0.4 * (1.0 - uNight));
  return mix(ground, horizon, smoothstep(60.0, 700.0, t));
}

/** Interior mapping: the room behind this bay, seen along rd (x along wall, y up, z inward). */
vec3 interior(vec3 ro, vec3 rd, float floorIdx, float roomH, out float lit) {
  float rx = floor(ro.x / ROOM_W);
  vec2 id = vec2(rx, floorIdx);
  float h = hash12(id + 3.7);
  float floorOn = step(hash12(vec2(floorIdx, 91.0)), 0.3);
  lit = max(step(h, 0.28), floorOn);

  vec3 lo = vec3(rx * ROOM_W, 0.0, 0.0);
  vec3 hi = vec3(lo.x + ROOM_W, roomH, ROOM_D);
  vec3 inv = 1.0 / rd;
  vec3 tFar = (mix(lo, hi, step(0.0, rd)) - ro) * inv;
  float t = min(min(tFar.x, tFar.y), tFar.z);
  vec3 p = ro + rd * t;
  bool desk = false;
  // On-screen footprint of the hit surface (metres per pixel). Hard interior patterns are
  // faded to their mean once they drop below a few pixels, which stops them shimmering on
  // the upper floors seen at grazing angles. Computed here, before any divergent branch.
  float foot = max(fwidth(p.x), fwidth(p.z));
  float detail = 1.0 - smoothstep(0.12, 0.5, foot);

  // desks: tops at 0.75 m in two rows parallel to the glass
  float tDesk = (0.75 - ro.y) * inv.y;
  if (rd.y < 0.0 && tDesk > 0.0 && tDesk < t) {
    vec3 q = ro + rd * tDesk;
    float row = step(1.3, q.z) * step(q.z, 2.9) + step(4.2, q.z) * step(q.z, 5.8);
    float seg = detail > 0.5 ? step(0.15, fract((q.x + h * 3.0) / 1.7)) : 1.0;
    if (row * seg > 0.5) { t = tDesk; p = q; desk = true; }
  }

  vec3 albedo;
  float emit = 0.0;
  if (desk) {
    albedo = vec3(0.55, 0.53, 0.5);
  } else if (t == tFar.y && rd.y < 0.0) {
    albedo = vec3(0.06, 0.065, 0.075); // carpet
  } else if (t == tFar.y) {
    albedo = vec3(0.55); // ceiling with light panels
    vec2 c = fract(vec2(p.x / 1.5, p.z / 1.8));
    float panel = step(0.25, c.x) * step(c.x, 0.75) * step(0.2, c.y) * step(c.y, 0.8);
    panel = mix(0.3, panel, detail); // 0.3 = mean coverage of the panel grid
    emit = panel * lit * mix(1.2, 6.0, uNight);
  } else if (t == tFar.z) {
    // back wall toward the core, sometimes an accent colour, a dark door now and then
    albedo = mix(vec3(0.32, 0.31, 0.29), vec3(0.12, 0.24, 0.3), step(0.8, hash12(id + 9.1)));
    float door = step(abs(fract(p.x / ROOM_W + h) - 0.5), 0.08) * step(p.y, 2.2);
    albedo = mix(albedo, vec3(0.05), door);
  } else {
    albedo = vec3(0.2, 0.2, 0.21); // partition
  }

  // daylight through the window, falling off with depth; warm ceiling light in lit rooms
  float day = (1.0 - uNight) * (0.06 + 0.22 * exp(-p.z / 2.5));
  vec3 light = vec3(0.85, 0.92, 1.0) * day + vec3(1.0, 0.86, 0.66) * lit * mix(0.08, 0.7, uNight);
  light += vec3(0.004) * uNight;
  return albedo * light + vec3(1.0, 0.93, 0.8) * emit;
}

void main() {
  vec3 Ng = normalize(vWorldNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 P = vWorldPos;
  float wall = 1.0 - smoothstep(0.3, 0.6, abs(Ng.y));

  // Tangent along +u (cotangent frame sign), based on the horizontal wall direction.
  vec3 T0 = normalize(cross(vec3(0.0, 1.0, 0.0), Ng) + vec3(1e-5, 0.0, 0.0));
  vec3 dp1 = dFdx(P), dp2 = dFdy(P);
  vec2 du1 = dFdx(vUv), du2 = dFdy(vUv);
  float det = du1.x * du2.y - du2.x * du1.y;
  vec3 T = T0 * (dot(dp1 * du2.y - dp2 * du1.y, T0) * det < 0.0 ? -1.0 : 1.0);

  float floorIdx = vFloor.x;
  float floorH = vFloor.y;
  float u = vUv.x;
  float v = vUv.y;

  // Per-pane tilt plus a slight pillow bow: breaks the reflection up pane by pane.
  vec2 paneId = vec2(floor(u / PANE_W), floorIdx);
  vec2 pf = vec2(fract(u / PANE_W), v / floorH) - 0.5;
  vec2 tilt = (hash22(paneId) - 0.5) * 0.014 + pf * vec2(0.012, 0.006);
  vec3 N = normalize(Ng + (T * tilt.x + vec3(0.0, 1.0, 0.0) * tilt.y) * wall);

  float NdV = clamp(dot(N, V), 1e-3, 1.0);
  vec3 F = schlick(uF0, NdV) * uReflectivity;
  vec3 R = reflect(-V, N);
  vec3 env = environment(P, R, uRoughness);

  // Sun glint (GGX), narrow and hot; the per-pane tilt scatters it into sparkles.
  vec3 L = normalize(uSunDir);
  vec3 H = normalize(L + V);
  float NdL = max(dot(N, L), 0.0);
  float NdH = max(dot(N, H), 0.0);
  float a = max(uRoughness * uRoughness, 0.0025);
  float a2 = a * a;
  float dd = NdH * NdH * (a2 - 1.0) + 1.0;
  float D = a2 / (PI * dd * dd);
  float LdH = max(dot(L, H), 0.05);
  vec3 spec = min(D * 0.25 / (LdH * LdH), 400.0) * schlick(uF0, LdH) * NdL * uSunIntensity;

  // What is behind the glass (a thin pane shifts the ray but does not bend it).
  vec3 rdView = -V;
  vec3 rd = vec3(dot(rdView, T), rdView.y, max(dot(rdView, -Ng), 1e-3));
  float roomH = floorH - SPANDREL;
  float lit;
  vec3 room = interior(vec3(u, min(v, roomH - 1e-3), 0.0), rd, floorIdx, roomH, lit);

  // blinds: per-pane amount from the controller's texture (row = floor, column = pane)
  float bpane = mod(floor(u / PANE_W), uBlindsSize.x);
  float bl = texture2D(uBlinds, (vec2(bpane, floorIdx) + 0.5) / uBlindsSize).r;
  float blindTo = roomH * (1.0 - bl);
  float blind = step(0.004, bl) * step(blindTo, v) * (1.0 - step(roomH, v));
  float slatHard = 0.85 + 0.15 * step(0.5, fract(v / 0.08));
  float slat = mix(0.925, slatHard, 1.0 - smoothstep(0.015, 0.06, fwidth(v))); // 8 cm slats alias fast
  vec3 blindCol = vec3(0.5, 0.49, 0.46) * slat * ((1.0 - uNight) * 0.35 + lit * mix(0.25, 0.6, uNight));
  room = mix(room, blindCol, blind);

  // spandrel: the same outer glass over a dark insulated back panel
  float span = smoothstep(roomH - 0.02, roomH + 0.02, v);
  room = mix(room, vec3(0.012, 0.018, 0.02), span);

  // tinted double glazing: Beer-Lambert, longer path at grazing angles (n = 1.5)
  float cosT = sqrt(1.0 - (1.0 - NdV * NdV) / 2.25);
  vec3 transmitted = room * pow(uGlassTint, vec3(2.0 / cosT));
  vec3 glass = transmitted * (1.0 - F);
  vec3 refl = env * F + spec;

  // mullions: painted aluminium, a little rough
  float mull = lines(u, PANE_W, MULLION) * wall;
  float sun = 0.5 + 0.5 * max(dot(Ng, L), 0.0);
  vec3 mullCol = vec3(0.035, 0.07, 0.065) * sun * mix(1.0, 0.25, uNight) + environment(P, reflect(-V, Ng), 0.5) * 0.06;

  // Roof and setback ledges: dark gravel membrane instead of glass on upward-facing faces.
  float up = smoothstep(0.55, 0.85, Ng.y);
  vec2 cell = floor(P.xz * 1.5);
  float grain = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
  vec3 roof = mix(vec3(0.10, 0.11, 0.12), vec3(0.17, 0.18, 0.19), grain) * (0.75 + 0.25 * max(dot(Ng, L), 0.0));
  roof = mix(roof, roof * 0.35, uNight) + textureCubeUV(uEnv, Ng, 0.8).rgb * uEnvIntensity * 0.04;
  // Undersides (exposed when floors separate): a dark soffit, not glass.
  float down = smoothstep(0.55, 0.85, -Ng.y);
  vec3 soffit = vec3(0.08, 0.09, 0.11) + textureCubeUV(uEnv, Ng, 0.8).rgb * uEnvIntensity * 0.03;

  // Premultiplied output: the see-through part fades with opacity, reflections mostly stay.
  float alpha = uOpacity;
  float keep = mix(0.45, 1.0, alpha);
  vec3 color = glass * alpha + refl * keep;
  color = mix(color, mullCol * alpha + refl * 0.15 * keep, mull);
  color = mix(color, roof * alpha, up);
  color = mix(color, soffit * alpha, down);

  gl_FragColor = vec4(color, alpha);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

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
    uBlinds: { value: blinds.texture },
    uBlindsSize: { value: new THREE.Vector2(BLIND_PANES, FLOORS) },
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
