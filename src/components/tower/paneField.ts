import { FLOORS, perimeterOffsets, stageForFloor } from "./geometry";
import { clamp } from "./math";

/** Width of one glass pane in metres; the facade shader is built with it. */
export const PANE_W = 1.5;
/** Texture width in panes. The longest perimeter (top stage, ~176 m) needs 118. */
export const PANE_COLUMNS = 128;

/**
 * One value in 0..1 per pane per floor, kept as bytes (PANE_COLUMNS x FLOORS, one per pane) that
 * the scene uploads as a data texture for the facade shader to sample at the pane it is shading
 * (see paneTexture in scene/facadeShader.ts). Pane k of floor f is the 1.5 m strip of glass from
 * k*1.5 m to (k+1)*1.5 m along that floor's perimeter, measured from the west corner of the
 * footprint the way the facade UVs are laid out (see perimeterUV in scene/helpers.ts). Changes
 * glide: setters write a target and update(dt) eases the bytes toward it. The blinds and the
 * opening windows are each one of these. No three.js here, so the page loads it up front.
 */
export class PaneField {
  /** The bytes the texture is made from; `version` counts their changes. */
  readonly data = new Uint8Array(PANE_COLUMNS * FLOORS);
  version = 0;
  /** Ease rate toward the target, per second. Larger = snappier. */
  speed: number;
  protected readonly target = new Float32Array(PANE_COLUMNS * FLOORS);
  protected readonly current = new Float32Array(PANE_COLUMNS * FLOORS);
  /** the bytes lag the eased values */
  protected dirty = true;
  /** some pane has not reached its target yet */
  private moving = false;

  constructor(speed = 2.5) {
    this.speed = speed;
  }

  /** Number of panes around floor f. */
  panes(f: number): number {
    return Math.min(PANE_COLUMNS, Math.ceil(perimeterOffsets(stageForFloor(f).polygon).total / PANE_W));
  }

  /** Pane index range [from, to) covered by facade edge `edge` (0..7, see EDGE_* in geometry) on floor f. */
  facadePanes(f: number, edge: number): [number, number] {
    const { cum } = perimeterOffsets(stageForFloor(f).polygon);
    return [Math.floor(cum[edge] / PANE_W), Math.min(PANE_COLUMNS, Math.ceil(cum[edge + 1] / PANE_W))];
  }

  get(f: number, pane: number): number {
    return this.target[f * PANE_COLUMNS + pane] ?? 0;
  }

  set(f: number, pane: number, amount: number): this {
    if (f < 0 || f >= FLOORS || pane < 0 || pane >= PANE_COLUMNS) return this;
    this.target[f * PANE_COLUMNS + pane] = clamp(amount, 0, 1);
    this.moving = true;
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

  /** Copy of every pane's target, for restoring after a temporary takeover. */
  snapshot(): Float32Array {
    return new Float32Array(this.target);
  }

  restore(snap: Float32Array): this {
    this.target.set(snap);
    this.moving = true;
    return this;
  }

  /** Jump to the target immediately instead of easing. */
  snap(): this {
    this.current.set(this.target);
    this.dirty = true;
    return this;
  }

  /** Ease toward the target; call once per frame. Returns true when the bytes changed. */
  update(dt: number): boolean {
    let changed = this.dirty;
    if (this.moving) {
      const k = 1 - Math.exp(-this.speed * Math.max(dt, 0));
      let still = false;
      for (let i = 0; i < this.current.length; i++) {
        const c = this.current[i];
        const t = this.target[i];
        if (c === t) continue;
        const nc = Math.abs(t - c) < 0.003 ? t : c + (t - c) * k;
        this.current[i] = nc;
        if (nc !== t) still = true;
        changed = true;
      }
      // everything has arrived: skip the scan until a setter moves a target again
      this.moving = still;
    }
    if (!changed) return false;
    for (let i = 0; i < this.current.length; i++) this.data[i] = Math.round(this.current[i] * 255);
    this.version++;
    this.dirty = false;
    return true;
  }
}
