"use client";

import { useEffect, useRef } from "react";
import type { Lang } from "@/i18n";
import { ui } from "@/i18n/ui";
import { SLOTS, type TypingState } from "../typing/game";
import { Bar, Footnotes, GameOver, HudHeader, Score } from "./hud";

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
      <HudHeader t={t} level={`${t.round} ${g.round}`} onQuit={onQuit} over={g.over} />
      {g.over ? (
        <GameOver t={t} title={t.over} text={t.overText(g.score, g.round - 1)} newBest={g.newBest} best={g.best} onAgain={onAgain} onQuit={onQuit} />
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
            <Score value={g.score} label={t.score} />
          </div>
          <Bar fraction={frac} className={"duration-100 " + (urgent ? "bg-red-400" : g.warmup > 0 ? "bg-accent/50 animate-pulse" : "bg-accent")} />
          <Footnotes>
            <span>
              {t.streak} {g.streak}
            </span>
            <span>
              {t.best} {Math.max(g.best, g.score)}
            </span>
            <span className={urgent ? "text-red-400" : ""}>{g.warmup > 0 ? t.ready : `${g.timeLeft.toFixed(1)}s`}</span>
          </Footnotes>
          <p className="mt-2 text-xs text-muted leading-snug">{t.hint}</p>
        </>
      )}
    </div>
  );
}
