"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { blinds } from "../blinds";
import { applyKey, GAME_BLIND_SPEED, GAME_GLOW, GAME_TINT, idleTyping, newGame, paint, readBest, tick, type TypingState } from "./game";

export type BurstSpec = { id: number; n: number; x: number; y: number };

/**
 * Runs the typing game: takes over the blinds while active (restoring them after), listens
 * to the keyboard, runs the round timer, and emits confetti bursts for the HUD to render.
 */
export function useTypingGame(onQuit: () => void) {
  const [g, setG] = useState<TypingState>(() => idleTyping());
  const [bursts, setBursts] = useState<BurstSpec[]>([]);
  const gRef = useRef(g);
  const snapshot = useRef<Float32Array | null>(null);
  const burstId = useRef(0);

  useEffect(() => {
    gRef.current = g;
  }, [g]);

  const burst = useCallback((n: number, x = 50, y = 42) => {
    const id = ++burstId.current;
    setBursts((b) => [...b, { id, n, x, y }]);
    window.setTimeout(() => setBursts((b) => b.filter((q) => q.id !== id)), 1600);
  }, []);

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
  const pressKey = useCallback(
    (raw: string): boolean => {
      const k = raw.toUpperCase();
      if (!/^[A-Z0-9]$/.test(k)) return false;
      const cur = gRef.current;
      if (!cur.active || cur.over) return false;
      const { next, event } = applyKey(cur, k);
      if (event === "char") {
        paint(next.chars, next.typed);
        burst(12);
      } else if (event === "round") {
        paint(next.chars, 0);
        burst(40);
      } else if (event === "milestone") {
        paint(next.chars, 0);
        burst(110);
      }
      gRef.current = next;
      setG(next);
      return true;
    },
    [burst],
  );

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

  return { game: g, bursts, start, stop, pressKey };
}
