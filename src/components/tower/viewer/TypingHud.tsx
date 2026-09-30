"use client";

import { useEffect, useRef } from "react";
import type { Lang } from "@/i18n";
import { ui } from "@/i18n/ui";
import type { TypingState } from "../typing/game";
import { SLOTS } from "../typing/game";

export function TypingHud({
  game: g,
  lang,
  onAgain,
  onQuit,
  onKey,
}: {
  game: TypingState;
  lang: Lang;
  onAgain: () => void;
  onQuit: () => void;
  onKey: (k: string) => void;
}) {
  const t = ui[lang].typing;
  const frac = g.timeTotal > 0 ? g.timeLeft / g.timeTotal : 0;
  const urgent = !g.over && g.warmup <= 0 && g.timeLeft < 3;
  const input = useRef<HTMLInputElement>(null);
  // Phones: an invisible input summons the soft keyboard; its change events feed the game.
  // Desktop key presses are prevented on keydown, so they never reach this input.
  useEffect(() => {
    if (g.active && !g.over) input.current?.focus({ preventScroll: true });
  }, [g.active, g.over, g.round]);
  return (
    <div key={g.flash} className={"pointer-events-auto " + (g.flash > 0 ? "hud-shake" : "")}>
      <input
        ref={input}
        aria-label={t.title}
        className="absolute h-px w-px opacity-0"
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        inputMode="text"
        value=""
        onChange={(e) => {
          const v = e.target.value;
          if (v) onKey(v[v.length - 1]);
        }}
      />
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-widest text-accent">{t.title}</p>
        <p className="font-mono text-[11px] text-muted">
          {t.round} {g.round}
        </p>
        {!g.over && (
          <button onClick={onQuit} className="font-mono text-[11px] text-muted hover:text-accent" aria-label={t.quit} title={t.quit}>
            ✕
          </button>
        )}
      </div>

      {g.over ? (
        <>
          <p className="mt-2 text-xl font-semibold leading-tight">{t.over}</p>
          <p className="mt-1 text-sm text-muted">{t.overText(g.score, g.round - 1)}</p>
          {g.newBest ? (
            <p className="mt-1 font-mono text-xs text-accent">{t.newBest}</p>
          ) : (
            <p className="mt-1 font-mono text-xs text-muted">
              {t.best} {g.best}
            </p>
          )}
          <div className="mt-3 flex gap-2 font-mono text-xs">
            <button onClick={onAgain} className="glass px-3 py-1.5 rounded-md hover:text-accent">
              {t.again} ⏎
            </button>
            <button onClick={onQuit} className="glass px-3 py-1.5 rounded-md hover:text-accent">
              {t.quit} esc
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="mt-2 flex items-center gap-2">
            {Array.from({ length: SLOTS }, (_, i) => (
              <span
                key={i}
                className={
                  "grid h-9 w-9 place-items-center rounded-md border font-mono text-base transition-colors " +
                  (i < g.typed
                    ? "border-accent bg-accent/20 text-accent"
                    : i === g.typed
                      ? "border-accent/70 text-paper animate-pulse"
                      : "border-line text-muted")
                }
                aria-hidden
              >
                {i < g.typed ? g.chars[i] : "·"}
              </span>
            ))}
            <span className="ml-auto text-right font-mono text-sm leading-tight">
              <span className="block text-2xl font-semibold text-paper">{g.score}</span>
              <span className="block text-[10px] uppercase tracking-widest text-muted">{t.score}</span>
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-ink-3 overflow-hidden">
            <div
              className={"h-full transition-[width] duration-100 " + (urgent ? "bg-red-400" : g.warmup > 0 ? "bg-accent/50 animate-pulse" : "bg-accent")}
              style={{ width: `${Math.max(0, Math.min(100, frac * 100))}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[10px] text-muted">
            <span>
              {t.streak} {g.streak}
            </span>
            <span>
              {t.best} {Math.max(g.best, g.score)}
            </span>
            <span className={urgent ? "text-red-400" : ""}>{g.warmup > 0 ? t.ready : `${g.timeLeft.toFixed(1)}s`}</span>
          </div>
          <p className="mt-2 text-xs text-muted leading-snug">{t.hint}</p>
        </>
      )}
    </div>
  );
}
