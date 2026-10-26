import { edgeOutwardNormal, FLOORS, stageForFloor } from "./geometry";
import { seededRandom, smoothstep } from "./math";
import { PaneField } from "./paneField";

type RGB = [number, number, number];
const DEFAULT_TINT: RGB = [0.5, 0.49, 0.46];

/**
 * Window blinds, one value per pane per floor: 0 = raised, 1 = fully lowered. The facade shader
 * reads the field's texture at the pane it is shading (see PaneField for how panes are addressed).
 */
export class Blinds extends PaneField {
  /** Blind colour (linear RGB 0..1) and glow as the shader sees them; eased toward the targets set by setStyle. */
  readonly tint: RGB = [...DEFAULT_TINT];
  glow = 0;
  private readonly tintTarget: RGB = [...DEFAULT_TINT];
  private glowTarget = 0;
  /** Share of panes with a lowered blind, as last set by randomize(); stir() holds it. */
  private share = 0.28;

  /** The default look: a share of panes with blinds lowered to a random height. */
  randomize(fraction = 0.28, seed = 1): this {
    const rnd = seededRandom(seed);
    this.share = fraction;
    return this.map(() => (rnd() < fraction ? 0.15 + 0.85 * rnd() : 0));
  }

  /**
   * One small change, as if someone in a room reached for the switch: a run of one to three
   * neighbouring blinds is lowered, raised or set to a new height. Each pane it touches gets
   * a fresh draw from the same distribution randomize() uses, so the overall look holds.
   */
  stir(rnd: () => number = Math.random): this {
    for (let tries = 0; tries < 8; tries++) {
      const f = Math.floor(rnd() * FLOORS);
      const from = Math.floor(rnd() * this.panes(f));
      const next = rnd() < this.share ? 0.15 + 0.85 * rnd() : 0;
      // a raised blind staying raised is no change: draw again
      if (next === 0 && this.get(f, from) === 0) continue;
      const to = Math.min(this.panes(f), from + 1 + Math.floor(rnd() * 3));
      for (let k = from; k < to; k++) this.set(f, k, next);
      break;
    }
    return this;
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
      return facing > 0 ? smoothstep(facing, 0.15, 0.9) * strength : 0;
    });
  }

  /** Colour (linear RGB 0..1) and self-glow of lowered blinds; eased like the blinds themselves. */
  setStyle(color: RGB, glow: number): this {
    this.tintTarget.splice(0, 3, ...color);
    this.glowTarget = glow;
    return this;
  }

  resetStyle(): this {
    return this.setStyle(DEFAULT_TINT, 0);
  }

  /** Ease the blinds and their style toward the targets; call once per frame. */
  override update(dt: number): boolean {
    const k = 1 - Math.exp(-this.speed * Math.max(dt, 0));
    for (let i = 0; i < 3; i++) this.tint[i] += (this.tintTarget[i] - this.tint[i]) * k;
    this.glow += (this.glowTarget - this.glow) * k;
    return super.update(dt);
  }
}

/** The tower's blinds; the facade material reads this texture. Scriptable as window.primeTower.blinds. */
export const blinds = new Blinds().randomize().snap();
