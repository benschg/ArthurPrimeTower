/**
 * "Type the tower": three characters are drawn with the window blinds (a pane with its blind
 * down is a dot) on the tower's three-faced west flank, one character per face. The player
 * types them and the next three come. Rounds get shorter and draw from a wider, more
 * confusable character set.
 */
import { blinds, PANE_W } from "../blinds";
import { floorElevation, perimeterOffsets, stageForFloor, type Pt } from "../geometry";
import { GLYPH_H, GLYPH_W, GLYPHS } from "./font5x7";

export const SLOTS = 3;
/** Facade edge per character, left to right as seen from outside: V3-V4, V2-V3, V1-V2. */
export const SLOT_EDGES = [2, 1, 0];
/** Panes per glyph column: double-width dots give the letters natural proportions. */
const PX = 2;
/** Glyph rows: floors 32 down to 26. All in the top stage, so their pane columns line up. */
export const TOP_FLOOR = 32;
export const BOTTOM_FLOOR = TOP_FLOOR - GLYPH_H + 1;
/** Camera target height for the game: the middle of the glyph rows. */
export const TYPING_FOCUS_Y = (floorElevation(BOTTOM_FLOOR) + floorElevation(TOP_FLOOR + 1)) / 2;
/** Where the camera looks from: square to the flank's chord (V1 to V4), from outside. */
export const TYPING_VIEW: { center: Pt; out: Pt } = (() => {
  const poly = stageForFloor(TOP_FLOOR).polygon;
  const a = poly[0];
  const b = poly[3];
  const center: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  let out: Pt = [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
  if (out[0] * center[0] + out[1] * center[1] < 0) out = [-out[0], -out[1]]; // away from the tower axis
  return { center, out };
})();
/** Blind look during the game: warm amber that glows, readable by day and night. */
export const GAME_TINT: [number, number, number] = [1.0, 0.72, 0.28];
export const GAME_GLOW = 1.5;
export const GAME_BLIND_SPEED = 7;

export type TypingState = {
  active: boolean;
  over: boolean;
  round: number;
  chars: string;
  typed: number;
  score: number;
  streak: number;
  best: number;
  newBest: boolean;
  timeLeft: number;
  timeTotal: number;
  mistakes: number;
  /** increments on every wrong key so the HUD can shake */
  flash: number;
  /** seconds of grace before the first round's clock starts (the camera is still arriving) */
  warmup: number;
};

export type KeyEvent = "char" | "round" | "milestone" | "miss";

const BEST_KEY = "prime-tower-typing-best";

export function readBest(): number {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeBest(v: number) {
  try {
    window.localStorage.setItem(BEST_KEY, String(v));
  } catch {
    /* storage unavailable */
  }
}

export function idleTyping(best = 0): TypingState {
  return { active: false, over: false, round: 1, chars: "", typed: 0, score: 0, streak: 0, best, newBest: false, timeLeft: 0, timeTotal: 0, mistakes: 0, flash: 0, warmup: 0 };
}

/** Seconds per round: generous at first, then tightening to a floor. */
export function roundTime(round: number): number {
  return Math.max(3.5, 10 - 0.55 * (round - 1));
}

/** Characters a round may use. Early rounds avoid look-alikes; later ones lean into them. */
export function charsetFor(round: number): string {
  if (round <= 2) return "ACEHLMPRTUXY";
  if (round <= 5) return "ABCDEFGHJKLMNPQRSTUVWXYZ";
  if (round <= 8) return "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" + "OI0S5B8Z2G6";
}

export function drawChars(round: number, avoid = ""): string {
  const set = charsetFor(round);
  let out = "";
  let guard = 0;
  while (out.length < SLOTS && guard++ < 200) {
    const c = set[Math.floor(Math.random() * set.length)];
    if (out.includes(c) || (avoid.includes(c) && Math.random() < 0.7)) continue;
    out += c;
  }
  return out;
}

export function newGame(best: number): TypingState {
  const t = roundTime(1);
  return { ...idleTyping(best), active: true, chars: drawChars(1), timeLeft: t, timeTotal: t, warmup: 2.5 };
}

/** Pure key transition; returns the next state and what happened, for effects to act on. */
export function applyKey(s: TypingState, key: string): { next: TypingState; event: KeyEvent | null } {
  if (!s.active || s.over) return { next: s, event: null };
  s = s.warmup > 0 ? { ...s, warmup: 0 } : s; // an eager first key ends the grace period
  if (key !== s.chars[s.typed]) {
    return { next: { ...s, streak: 0, mistakes: s.mistakes + 1, timeLeft: Math.max(0.4, s.timeLeft - 1), flash: s.flash + 1 }, event: "miss" };
  }
  const streak = s.streak + 1;
  let score = s.score + 10 + Math.min(streak, 10);
  const typed = s.typed + 1;
  if (typed < SLOTS) return { next: { ...s, typed, streak, score }, event: "char" };
  score += 25 + Math.ceil(s.timeLeft) * 3;
  const round = s.round + 1;
  const t = roundTime(round);
  const next = { ...s, round, chars: drawChars(round, s.chars), typed: 0, streak, score, timeLeft: t, timeTotal: t };
  return { next, event: s.round % 5 === 0 ? "milestone" : "round" };
}

/** Timer tick; ends the game when time runs out and records a new best. */
export function tick(s: TypingState, dt: number): TypingState {
  if (!s.active || s.over) return s;
  if (s.warmup > 0) return { ...s, warmup: Math.max(0, s.warmup - dt) };
  const timeLeft = s.timeLeft - dt;
  if (timeLeft > 0) return { ...s, timeLeft };
  const newBest = s.score > s.best;
  const best = Math.max(s.best, s.score);
  if (newBest) writeBest(best);
  return { ...s, timeLeft: 0, over: true, best, newBest };
}

/** Draw the round's characters, one per face of the flank; typed slots are blank. */
export function paint(chars: string, typed: number): void {
  for (let r = 0; r < GLYPH_H; r++) {
    const f = TOP_FLOOR - r;
    const { cum } = perimeterOffsets(stageForFloor(f).polygon);
    for (let slot = 0; slot < SLOTS; slot++) {
      const edge = SLOT_EDGES[slot];
      // clear the whole face row, then draw within the panes that lie fully on this face
      const [ca, cb] = blinds.facadePanes(f, edge);
      for (let p = ca; p < cb; p++) blinds.set(f, p, 0);
      if (slot < typed) continue;
      const rows = GLYPHS[chars[slot]];
      if (!rows) continue;
      const a = Math.ceil(cum[edge] / PANE_W);
      const b = Math.floor(cum[edge + 1] / PANE_W);
      const margin = Math.max(0, Math.floor((b - a - GLYPH_W * PX) / 2));
      for (let c = 0; c < GLYPH_W; c++) {
        if (rows[r][c] !== "1") continue;
        for (let k = 0; k < PX; k++) {
          // the perimeter coordinate runs right to left as seen from outside, so columns mirror
          blinds.set(f, b - 1 - margin - (c * PX + k), 1);
        }
      }
    }
  }
}
