import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { NIGHT_FOG } from "./blender";

/** Far enough to sit behind the whole site, inside the camera's far plane (2500). */
const STAR_RADIUS = 2000;

/**
 * The backdrop: by day the day HDRI itself; by night a dark dome with stars, while the
 * night HDRI stays the environment and the glass keeps reflecting the city lights in it.
 * `night` is the swapped sky (the midpoint of the fade); the stars fade in with
 * `scene.userData.nightBlend`, which Blender writes every frame.
 */
export function Sky({ night, hdri }: { night: boolean; hdri: THREE.Texture }) {
  const dome = useMemo(() => nightDome(), []);
  const stars = useMemo(() => starField(), []);
  const ref = useRef<THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>>(null);
  useEffect(
    () => () => {
      dome.dispose();
      stars.geometry.dispose();
      stars.material.dispose();
    },
    [dome, stars],
  );

  useFrame(({ scene, camera, clock, gl }) => {
    const backdrop = night ? dome : hdri;
    if (scene.background !== backdrop) scene.background = backdrop;
    const pts = ref.current;
    if (!pts) return;
    // stars are at infinity: they travel with the camera and only turn with it
    pts.position.copy(camera.position);
    const nt = (scene.userData.nightBlend as number | undefined) ?? (night ? 1 : 0);
    const fade = THREE.MathUtils.smoothstep(nt, 0.5, 1);
    pts.visible = fade > 0;
    const u = pts.material.uniforms;
    u.uFade.value = fade;
    u.uTime.value = clock.elapsedTime;
    u.uPx.value = gl.getPixelRatio();
  });
  return <primitive ref={ref} object={stars} />;
}

/** Night dome, zenith to below the horizon: deep blue-black, lightening into the city's glow, then the fog. */
function nightDome() {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 512;
  const ctx = c.getContext("2d")!;
  // equirect rows: 0 is the zenith, 0.5 the horizon, 1 the nadir
  const g = ctx.createLinearGradient(0, 0, 0, c.height);
  g.addColorStop(0, "#02040b");
  g.addColorStop(0.2, "#040914");
  g.addColorStop(0.36, "#08101f");
  g.addColorStop(0.45, "#141a2b");
  g.addColorStop(0.49, "#2a2533");
  g.addColorStop(0.5, "#2c2632");
  g.addColorStop(0.52, `#${NIGHT_FOG.getHexString()}`);
  g.addColorStop(1, `#${NIGHT_FOG.getHexString()}`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Deterministic, so the same stars come back on every visit. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STAR_TINTS = [new THREE.Color("#a9c1ff"), new THREE.Color("#ffffff"), new THREE.Color("#fff1d6"), new THREE.Color("#ffd2a1")];

function starField() {
  const rand = mulberry32(201);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
  const pos: number[] = [];
  const col: number[] = [];
  const size: number[] = [];
  const bright: number[] = [];
  const phase: number[] = [];
  const v = new THREE.Vector3();
  // the Milky Way's plane, tilted across the sky
  const band = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.05, 0.4, 0.35));

  const add = (dir: THREE.Vector3, faint: boolean) => {
    if (dir.y < -0.02) return;
    const b = faint ? rand() ** 3 * 0.45 : rand() ** 5;
    // extinction and city glow wash out the stars near the horizon
    const horizon = THREE.MathUtils.smoothstep(dir.y, -0.02, 0.35);
    const alpha = (0.55 + 0.45 * b) * (0.15 + 0.85 * horizon);
    pos.push(dir.x * STAR_RADIUS, dir.y * STAR_RADIUS, dir.z * STAR_RADIUS);
    const tint = STAR_TINTS[Math.min(STAR_TINTS.length - 1, Math.floor(rand() ** 1.6 * STAR_TINTS.length))];
    col.push(tint.r, tint.g, tint.b);
    size.push(1.7 + 2.8 * b);
    bright.push(alpha);
    phase.push(rand());
  };

  // the camera's 36° view shows only a few percent of the sky, so it takes many
  for (let i = 0; i < 25000; i++) {
    const y = rand() * 2 - 1;
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(1 - y * y);
    add(v.set(r * Math.cos(a), y, r * Math.sin(a)), false);
  }
  for (let i = 0; i < 12000; i++) {
    const a = rand() * Math.PI * 2;
    const off = gauss() * 0.12;
    add(v.set(Math.cos(a), off, Math.sin(a)).normalize().applyQuaternion(band), true);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute("aSize", new THREE.Float32BufferAttribute(size, 1));
  geo.setAttribute("aBright", new THREE.Float32BufferAttribute(bright, 1));
  geo.setAttribute("aPhase", new THREE.Float32BufferAttribute(phase, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uFade: { value: 0 }, uPx: { value: 1 } },
    vertexShader: /* glsl */ `
      uniform float uTime, uFade, uPx;
      attribute float aSize, aBright, aPhase;
      attribute vec3 color;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        // a slow, slight twinkle, each star on its own beat
        float tw = 1.0 + 0.28 * sin(uTime * (0.8 + 1.9 * aPhase) + aPhase * 60.0);
        vAlpha = aBright * tw * uFade;
        vColor = color;
        gl_PointSize = aSize * uPx;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float r = length(gl_PointCoord - 0.5) * 2.0;
        float a = 1.0 - smoothstep(0.35, 1.0, r);
        gl_FragColor = vec4(vColor * vAlpha * a, 1.0);
      }`,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = -1;
  points.name = "stars";
  return points;
}
