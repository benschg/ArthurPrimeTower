"use client";

import { useMemo } from "react";

export const CONFETTI_COLORS = ["#7dd3c0", "#4f8fd6", "#f2c14e", "#e25c4a", "#a78bfa", "#ffffff"];

/** Full-viewer confetti burst with a success card. Deterministic layout, CSS-driven motion. */
export function Celebration({ title, text }: { title: string; text: string }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => {
        const r = (k: number) => {
          const n = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
          return n - Math.floor(n);
        };
        return {
          left: r(1) * 100,
          delay: r(2) * 1.8,
          duration: 2.6 + r(3) * 2,
          size: 6 + r(4) * 8,
          color: CONFETTI_COLORS[Math.floor(r(5) * CONFETTI_COLORS.length)],
          sway: 20 + r(6) * 60,
          round: r(7) > 0.6,
        };
      }),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className={"confetti absolute -top-4 " + (p.round ? "rounded-full" : "rounded-sm")}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 1.6,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ["--sway" as string]: `${p.sway}px`,
          }}
        />
      ))}
      <div className="celebrate-card absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 glass rounded-2xl px-8 py-6 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-accent">{title}</p>
        <p className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">100%</p>
        <p className="mt-1 text-sm text-muted">{text}</p>
      </div>
    </div>
  );
}
