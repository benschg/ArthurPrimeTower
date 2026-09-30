"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { blinds } from "../blinds";
import { confettiCannons } from "./cannons";
import { applyKey, GAME_BLIND_SPEED, GAME_GLOW, GAME_TINT, idleTyping, newGame, paint, readBest, tick, type TypingState } from "./game";

/**
 * Runs the typing game: takes over the blinds while active (restoring them after), listens
 * to the keyboard, runs the round timer, and fires the roof confetti cannons on successes.
 */
export function useTypingGame(onQuit: () => void) {
  const [g, setG] = useState<TypingState>(() => idleTyping());
  const gRef = useRef(g);
  const snapshot = useRef<Float32Array | null>(null);

  useEffect(() => {
    gRef.current = g;
  }, [g]);

  const start = useCallback(() => {
    if (!snapshot.current) snapshot.current = blinds.snapshot();
    blinds.setAll(0).snap();
    blinds.speed = GAME_BLIND_SPEED;
    blinds.setStyle(GAME_TINT, GAME_GLOW);
    const s = newGame(readBest());
    paint(s.chars, 0);
    setG(s);
  }, []);

  const stop = useCallback(() => {
    if (snapshot.current) {
      blinds.restore(snapshot.current);
      snapshot.current = null;
    }
    blinds.resetStyle();
    blinds.speed = 2.5;
    setG((s) => ({ ...s, active: false }));
    onQuit();
  }, [onQuit]);

  // round timer
  useEffect(() => {
    if (!g.active || g.over) return;
    const id = window.setInterval(() => setG((s) => tick(s, 0.1)), 100);
    return () => window.clearInterval(id);
  }, [g.active, g.over]);

  /** Feed one character (any case); returns false if it was not a playable key. */
  const pressKey = useCallback((raw: string): boolean => {
    const k = raw.toUpperCase();
    if (!/^[A-Z0-9]$/.test(k)) return false;
    const cur = gRef.current;
    if (!cur.active || cur.over) return false;
    const { next, event } = applyKey(cur, k);
    if (event === "char") {
      // the cannon above the character just typed pops a small puff
      paint(next.chars, next.typed);
      confettiCannons.fire(next.typed - 1, 14, 0.85);
    } else if (event === "round") {
      // all three typed: every cannon fires
      paint(next.chars, 0);
      confettiCannons.fire("all", 42, 1);
    } else if (event === "milestone") {
      // every fifth round: a double volley
      paint(next.chars, 0);
      confettiCannons.fire("all", 60, 1.1);
      window.setTimeout(() => confettiCannons.fire("all", 60, 1), 380);
    }
    gRef.current = next;
    setG(next);
    return true;
  }, []);

  // keyboard (desktop). Handled keys are prevented, so a focused input sees no change event.
  useEffect(() => {
    if (!g.active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Escape") {
        e.preventDefault();
        stop();
        return;
      }
      if (gRef.current.over) {
        if (e.key === "Enter") {
          e.preventDefault();
          start();
        }
        return;
      }
      if (e.key.length !== 1) return;
      if (pressKey(e.key)) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [g.active, start, stop, pressKey]);

  return { game: g, start, stop, pressKey };
}
