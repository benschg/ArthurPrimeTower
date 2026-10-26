"use client";

import type { Lang } from "@/i18n";
import { ui } from "@/i18n/ui";
import type { CleanState } from "../scene/types";
import { Bar } from "./hud";

/** Bottom-left card during the window-cleaning game: share cleaned, the clock, and again or stop. */
export function CleaningHud({ clean, lang, onAgain, onStop }: { clean: CleanState; lang: Lang; onAgain: () => void; onStop: () => void }) {
  const g = ui[lang].game;
  const success = clean.progress >= 0.99;
  const pct = success ? 100 : Math.round(clean.progress * 100);
  const finished = success || clean.secondsLeft <= 0;
  return (
    <div className="pointer-events-auto">
      <p className="font-mono text-[11px] uppercase tracking-widest text-accent">{g.title}</p>
      <div className="mt-2 flex items-baseline justify-between font-mono text-sm">
        <span>
          <span className="text-2xl font-semibold text-paper">{pct}%</span> <span className="text-muted">{g.cleaned}</span>
        </span>
        <span className={clean.secondsLeft < 10 ? "text-red-400" : "text-muted"}>
          {g.time} {Math.ceil(clean.secondsLeft)}s
        </span>
      </div>
      <Bar fraction={pct / 100} className="bg-accent duration-200" />
      <p className="mt-2 text-xs text-muted leading-snug">{finished ? (success ? g.done : g.timeUp) : g.hint}</p>
      <div className="mt-3 flex gap-2 font-mono text-xs">
        <button onClick={onAgain} className="glass px-3 py-1.5 rounded-md hover:text-accent">
          {g.again}
        </button>
        <button onClick={onStop} className="glass px-3 py-1.5 rounded-md hover:text-accent">
          {g.stop}
        </button>
      </div>
    </div>
  );
}
