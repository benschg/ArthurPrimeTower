import * as THREE from "three";
import { edgeOutwardNormal, FLOORS, perimeterOffsets, stageForFloor } from "./geometry";

/**
 * Window blinds, one value per pane per floor: 0 = raised, 1 = fully lowered.
 *
 * The facade shader reads a data texture (BLIND_PANES x FLOORS, one byte per pane) at the
 * pane it is shading. Pane k of floor f is the 1.5 m strip of glass from k*1.5 m to (k+1)*1.5 m
 * along that floor's perimeter, measured from the west corner of the footprint the way the
 * facade UVs are laid out (see perimeterUV in scene/helpers.ts). Changes glide: setters write
 * a target and update(dt) eases the texture toward it.
 */

/** Width of one glass pane in metres; must match PANE_W in facadeShader.ts. */
export const PANE_W = 1.5;
/** Texture width in panes. The longest perimeter (top stage, ~176 m) needs 118. */
export const BLIND_PANES = 128;

export class Blinds {
  readonly texture: THREE.DataTexture;
  /** Ease rate toward the target, per second. Larger = snappier. */
  speed = 2.5;
  private readonly data = new Uint8Array(BLIND_PANES * FLOORS);
  private readonly target = new Float32Array(BLIND_PANES * FLOORS);
  private readonly current = new Float32Array(BLIND_PANES * FLOORS);
  private dirty = true;

  constructor() {
    this.texture = new THREE.DataTexture(this.data, BLIND_PANES, FLOORS, THREE.RedFormat, THREE.UnsignedByteType);
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.generateMipmaps = false;
    this.texture.needsUpdate = true;
  }

  /** Number of panes around floor f. */
  panes(f: number): number {
    return Math.min(BLIND_PANES, Math.ceil(perimeterOffsets(stageForFloor(f).polygon).total / PANE_W));
  }

  /** Pane index range [from, to) covered by facade edge `edge` (0..7, see EDGE_* in geometry) on floor f. */
  facadePanes(f: number, edge: number): [number, number] {
    const { cum } = perimeterOffsets(stageForFloor(f).polygon);
    return [Math.floor(cum[edge] / PANE_W), Math.min(BLIND_PANES, Math.ceil(cum[edge + 1] / PANE_W))];
  }

  get(f: number, pane: number): number {
    return this.target[f * BLIND_PANES + pane] ?? 0;
  }

  set(f: number, pane: number, amount: number): this {
    if (f < 0 || f >= FLOORS || pane < 0 || pane >= BLIND_PANES) return this;
    this.target[f * BLIND_PANES + pane] = THREE.MathUtils.clamp(amount, 0, 1);
    return this;
  }

  setFloor(f: number, amount: number): this {
    const n = this.panes(f);
    for (let k = 0; k < n; k++) this.set(f, k, amount);
    return this;
  }

  setFacade(f: number, edge: number, amount: number): this {
    const [a, b] = this.facadePanes(f, edge);
    for (let k = a; k < b; k++) this.set(f, k, amount);
    return this;
  }

  setAll(amount: number): this {
    for (let f = 0; f < FLOORS; f++) this.setFloor(f, amount);
    return this;
  }

  /** Apply a function per pane: fn(floor, pane, edge) -> amount. */
  map(fn: (f: number, pane: number, edge: number) => number): this {
    for (let f = 0; f < FLOORS; f++) {
      const { cum } = perimeterOffsets(stageForFloor(f).polygon);
      const n = this.panes(f);
      let edge = 0;
      for (let k = 0; k < n; k++) {
        const u = (k + 0.5) * PANE_W;
        while (edge < cum.length - 2 && u > cum[edge + 1]) edge++;
        this.set(f, k, fn(f, k, edge));
      }
    }
    return this;
  }

  /** The default look: a share of panes with blinds lowered to a random height. */
  randomize(fraction = 0.28, seed = 1): this {
    let s = seed >>> 0 || 1;
    const rnd = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
    return this.map(() => (rnd() < fraction ? 0.15 + 0.85 * rnd() : 0));
  }

  /**
   * Sun shading: facades facing the sun lower their blinds in proportion to how directly the
   * sun hits them. `sunEN` is the horizontal direction toward the sun (East, North).
   */
  setFromSun(sunEN: [number, number], strength = 0.85): this {
    const len = Math.hypot(sunEN[0], sunEN[1]) || 1;
    const sx = sunEN[0] / len;
    const sy = sunEN[1] / len;
    return this.map((f, _k, edge) => {
      const n = edgeOutwardNormal(stageForFloor(f).polygon, edge);
      const facing = n[0] * sx + n[1] * sy;
      return facing > 0 ? THREE.MathUtils.smoothstep(facing, 0.15, 0.9) * strength : 0;
    });
  }

  /** Jump to the target immediately instead of easing. */
  snap(): this {
    this.current.set(this.target);
    this.dirty = true;
    return this;
  }

  /** Ease toward the target; call once per frame. Returns true when the texture changed. */
  update(dt: number): boolean {
    const k = 1 - Math.exp(-this.speed * Math.max(dt, 0));
    let changed = this.dirty;
    for (let i = 0; i < this.current.length; i++) {
      const c = this.current[i];
      const t = this.target[i];
      if (c === t) continue;
      const nc = Math.abs(t - c) < 0.003 ? t : c + (t - c) * k;
      this.current[i] = nc;
      changed = true;
    }
    if (!changed) return false;
    for (let i = 0; i < this.current.length; i++) this.data[i] = Math.round(this.current[i] * 255);
    this.texture.needsUpdate = true;
    this.dirty = false;
    return true;
  }
}

/** The tower's blinds; the facade material reads this texture. Scriptable as window.primeTower.blinds. */
export const blinds = new Blinds().randomize().snap();
