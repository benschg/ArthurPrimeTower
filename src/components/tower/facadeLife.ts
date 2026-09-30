import { blinds } from "./blinds";
import { windows } from "./windows";

/** Seconds between two changes, picked at random within the range. */
const WINDOW_EVERY: [number, number] = [2.5, 6];
const BLIND_EVERY: [number, number] = [1.5, 4];

const pause = ([a, b]: [number, number]) => a + (b - a) * Math.random();

/**
 * Ambient life on the facade: now and then someone in the tower opens or shuts a window, or
 * moves the blinds of a room. Each change is one `stir()` of the windows or the blinds, which
 * keeps the overall share of open windows and lowered blinds where `randomize()` put it, so the
 * facade keeps its look while it slowly rearranges itself. Scriptable as primeTower.life.
 */
class FacadeLife {
  /** Freeze the facade, e.g. while scripting the blinds or windows from the console. */
  paused = false;
  private windowIn = 3;
  private blindIn = 2;

  /** Call once per frame while nothing else (a game) owns the facade. */
  update(dt: number): void {
    if (this.paused) return;
    this.windowIn -= dt;
    if (this.windowIn <= 0) {
      windows.stir();
      this.windowIn = pause(WINDOW_EVERY);
    }
    this.blindIn -= dt;
    if (this.blindIn <= 0) {
      blinds.stir();
      this.blindIn = pause(BLIND_EVERY);
    }
  }
}

export type { FacadeLife };
export const facadeLife = new FacadeLife();
