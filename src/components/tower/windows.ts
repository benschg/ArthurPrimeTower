import { FLOORS, perimeterOffsets, stageForFloor } from "./geometry";
import { PANE_COLUMNS, PANE_W, PaneField, seededRandom } from "./paneField";

/** How far an open window stands proud of the facade, in metres (the facade shader is built with it). */
// TESTING: exaggerated so the effect is easy to judge; the real opening is 0.06.
export const OPEN_DEPTH = 0.15;

/**
 * The tower's opening windows, one value per pane per floor: 0 = shut, 1 = pushed out the full
 * 6 cm. They open parallel to the facade, so an open pane keeps facing the same way and only
 * the slit around it shows; the facade shader draws that slit from this field's texture.
 *
 * Every second or third element opens (panes 0, 2, 5, 7, 10, ... along the perimeter) on the
 * office and conference floors. The lobby and the top floor stay shut, and so does any pane that
 * the 1.5 m grid happens to lay across a corner of the footprint. Setters ignore the rest.
 */
export class Windows extends PaneField {
  private readonly canOpen = new Uint8Array(PANE_COLUMNS * FLOORS);
  /** Share of the opening windows that are open, as last set by randomize(); stir() holds it. */
  private share = 0.3;

  constructor() {
    super(1.4);
    for (let f = 1; f < FLOORS - 1; f++) {
      const { cum, total } = perimeterOffsets(stageForFloor(f).polygon);
      for (let k = 0; (k + 1) * PANE_W <= total && k < PANE_COLUMNS; k++) {
        if (k % 5 !== 0 && k % 5 !== 2) continue;
        const from = k * PANE_W;
        const to = from + PANE_W;
        // a corner inside the pane (not on its joint) means the grid wraps it around the building
        if (cum.some((c) => c > from + 0.05 && c < to - 0.05)) continue;
        this.canOpen[f * PANE_COLUMNS + k] = 1;
      }
    }
  }

  /** True when pane `pane` of floor f is one of the opening elements. */
  openable(f: number, pane: number): boolean {
    return f >= 0 && f < FLOORS && pane >= 0 && pane < PANE_COLUMNS && this.canOpen[f * PANE_COLUMNS + pane] === 1;
  }

  override set(f: number, pane: number, amount: number): this {
    return super.set(f, pane, this.openable(f, pane) ? amount : 0);
  }

  /** The default look: a share of the opening windows pushed out. */
  randomize(fraction = 0.3, seed = 7): this {
    const rnd = seededRandom(seed);
    this.share = fraction;
    return this.map(() => (rnd() < fraction ? 1 : 0));
  }

  /**
   * One small change: a window somewhere is pushed out or pulled shut. The window it lands on
   * gets a fresh draw at the share randomize() set, so the number of open windows holds.
   */
  stir(rnd: () => number = Math.random): this {
    for (let tries = 0; tries < 24; tries++) {
      const f = 1 + Math.floor(rnd() * (FLOORS - 2));
      const k = Math.floor(rnd() * this.panes(f));
      if (!this.openable(f, k)) continue;
      const next = rnd() < this.share ? 1 : 0;
      if (next === this.get(f, k)) continue;
      return this.set(f, k, next);
    }
    return this;
  }
}

/** The tower's windows; the facade material reads this texture. Scriptable as window.primeTower.windows. */
export const windows = new Windows().randomize().snap();
