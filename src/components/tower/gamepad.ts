import { useEffect, useEffectEvent } from "react";

/** Buttons in the browser's standard layout (Xbox names; PlayStation: A = cross, Back = Share/Select). */
const BTN = { A: 0, LT: 6, BACK: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const STICK = 0.5;
// a held direction repeats like a held key: after a pause, then steadily
const REPEAT_DELAY = 280;
const REPEAT_EVERY = 140;

export type PadHandlers = {
  /** A direction newly pushed on the d-pad or left stick (y up); with `repeat`, again while held. */
  onDir?: (dx: number, dy: number) => void;
  repeat?: boolean;
  /** A or Start: like Enter. */
  onConfirm?: () => void;
  /** Back / Select: like Esc. */
  onBack?: () => void;
  /** Down (d-pad or stick) or the left trigger, whenever that changes between held and released. */
  onDownHeld?: (held: boolean) => void;
};

type PadState = { dir: string; next: number; confirm: boolean; back: boolean; down: boolean };

/**
 * Polls every connected gamepad once a frame while `active` and turns it into the same few
 * actions the games take from the keyboard. Browsers only list a pad after one of its
 * buttons is pressed on the page.
 */
export function useGamepad(active: boolean, handlers: PadHandlers): void {
  const fire = useEffectEvent((what: "dir" | "confirm" | "back" | "down", a = 0, b = 0) => {
    if (what === "dir") handlers.onDir?.(a, b);
    else if (what === "confirm") handlers.onConfirm?.();
    else if (what === "back") handlers.onBack?.();
    else handlers.onDownHeld?.(a === 1);
  });
  const repeats = useEffectEvent(() => !!handlers.repeat);

  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !navigator.getGamepads) return;
    const pads = new Map<number, PadState>();
    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      for (const pad of navigator.getGamepads()) {
        if (!pad?.connected) continue;
        const on = (i: number) => !!pad.buttons[i]?.pressed;
        const ax = pad.axes[0] ?? 0;
        const ay = pad.axes[1] ?? 0;
        let dx = (on(BTN.RIGHT) ? 1 : 0) - (on(BTN.LEFT) ? 1 : 0);
        let dy = (on(BTN.UP) ? 1 : 0) - (on(BTN.DOWN) ? 1 : 0);
        if (!dx && !dy && Math.hypot(ax, ay) > STICK) {
          if (Math.abs(ax) > Math.abs(ay)) dx = Math.sign(ax);
          else dy = -Math.sign(ay);
        }
        if (dx && dy) dy = 0; // one axis at a time, as with the arrow keys
        const cur = {
          dir: dx || dy ? `${dx},${dy}` : "",
          confirm: on(BTN.A) || on(BTN.START),
          back: on(BTN.BACK),
          down: dy === -1 || on(BTN.LT),
        };
        const st = pads.get(pad.index);
        if (!st) {
          // first sight: take the pad as it is, so a button already held does not fire
          pads.set(pad.index, { ...cur, next: now + REPEAT_DELAY });
          continue;
        }
        if (cur.dir && cur.dir !== st.dir) {
          fire("dir", dx, dy);
          st.next = now + REPEAT_DELAY;
        } else if (cur.dir && repeats() && now >= st.next) {
          fire("dir", dx, dy);
          st.next = now + REPEAT_EVERY;
        }
        if (cur.confirm && !st.confirm) fire("confirm");
        if (cur.back && !st.back) fire("back");
        if (cur.down !== st.down) fire("down", cur.down ? 1 : 0);
        Object.assign(st, cur);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}
