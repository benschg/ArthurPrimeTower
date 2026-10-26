/**
 * Message channel between the typing game (DOM side) and the roof confetti cannons (3D side).
 * The game queues shots; the scene drains the queue each frame and reports how many pieces
 * are in the air.
 */
export type Shot = { cannon: number | "all"; count: number; power: number };

/** The paper colours, of the roof cannons' confetti and of the window-cleaning celebration. */
export const CONFETTI_COLORS = ["#7dd3c0", "#4f8fd6", "#f2c14e", "#e25c4a", "#a78bfa", "#ffffff"];

const queue: Shot[] = [];

export const confettiCannons = {
  /** pieces currently in the air (written by the scene) */
  live: 0,
  /** Fire one cannon (0..2, left to right as seen from outside) or all of them. */
  fire(cannon: number | "all", count: number, power = 1) {
    queue.push({ cannon, count, power });
  },
  drain(): Shot[] {
    return queue.splice(0, queue.length);
  },
};
