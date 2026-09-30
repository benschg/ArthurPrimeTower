"use client";

import type { ReactNode } from "react";
import type { Lang } from "@/i18n";
import { ui } from "@/i18n/ui";
import { LIVES } from "../crossing/game";
import { crossing, useCrossingHud } from "../crossing/store";

/** Bottom-left card while the Hardbrücke game runs: crossings, lives, the clock, and a pad for touch. */
export function CrossingHud({ lang, onQuit }: { lang: Lang; onQuit: () => void }) {
  const g = useCrossingHud();
  const t = ui[lang].crossing;
  const over = g.phase === "over";
  return (
    <div key={g.knocks} className={"pointer-events-auto " + (g.knocks > 0 && !over ? "hud-shake" : "")}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-widest text-accent">{t.title}</p>
        <p className="font-mono text-[11px] text-muted">
          {t.level} {g.level}
        </p>
        <span className="flex items-center gap-3">
          <button
            onClick={() => crossing.toggleSound()}
            className={"hover:text-accent " + (g.muted ? "text-muted/60" : "text-muted")}
            aria-label={g.muted ? t.soundOff : t.soundOn}
            aria-pressed={!g.muted}
            title={g.muted ? t.soundOff : t.soundOn}
          >
            <Speaker on={!g.muted} />
          </button>
          {!over && (
            <button onClick={onQuit} className="font-mono text-[11px] text-muted hover:text-accent" aria-label={t.quit} title={t.quit}>
              ✕
            </button>
          )}
        </span>
      </div>

      {over ? (
        <>
          <p className="mt-2 text-xl font-semibold leading-tight">{t.gameOver}</p>
          <p className="mt-1 text-sm text-muted">{t.overText(g.crossings)}</p>
          {g.newBest ? (
            <p className="mt-1 font-mono text-xs text-accent">{t.newBest}</p>
          ) : (
            <p className="mt-1 font-mono text-xs text-muted">
              {t.best} {g.best}
            </p>
          )}
          <div className="mt-3 flex gap-2 font-mono text-xs">
            <button onClick={() => crossing.start()} className="glass px-3 py-1.5 rounded-md hover:text-accent">
              {t.again} ⏎
            </button>
            <button onClick={onQuit} className="glass px-3 py-1.5 rounded-md hover:text-accent">
              {t.quit} esc
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="mt-2 flex items-center gap-1.5">
            {Array.from({ length: LIVES }, (_, i) => (
              <Life key={i} on={i < g.lives} />
            ))}
            <span className="sr-only">
              {t.lives} {g.lives}
            </span>
            <span className="ml-auto text-right font-mono text-sm leading-tight">
              <span className="block text-2xl font-semibold text-paper">{g.crossings}</span>
              <span className="block text-[10px] uppercase tracking-widest text-muted">{t.crossings}</span>
            </span>
          </div>
          {/* the clock for this crossing */}
          <div className="mt-2 h-2 rounded-full bg-ink-3 overflow-hidden">
            <div className={"h-full transition-[width] duration-200 ease-linear " + (g.time < 0.25 ? "bg-red-400" : "bg-accent")} style={{ width: `${g.time * 100}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[10px] text-muted">
            <span>{t.time}</span>
            <span>
              {t.best} {g.best}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted leading-snug pointer-coarse:hidden">{t.hint}</p>
          {/* touch screens have no arrow keys */}
          <div className="mt-3 hidden pointer-coarse:grid grid-cols-3 gap-1.5 w-40 mx-auto font-mono text-lg">
            <Pad label={t.steer.up} x={0} y={1} className="col-start-2">
              ▲
            </Pad>
            <Pad label={t.steer.left} x={-1} y={0} className="col-start-1 row-start-2">
              ◀
            </Pad>
            <Pad label={t.steer.down} x={0} y={-1} className="col-start-2 row-start-2">
              ▼
            </Pad>
            <Pad label={t.steer.right} x={1} y={0} className="col-start-3 row-start-2">
              ▶
            </Pad>
          </div>
        </>
      )}
    </div>
  );
}

function Speaker({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 6h2.5L8 3v10L4.5 10H2z" fill="currentColor" />
      {on ? <path d="M10.5 5.5a3.5 3.5 0 0 1 0 5M12.5 3.5a6.3 6.3 0 0 1 0 9" /> : <path d="M10.5 6l4 4M14.5 6l-4 4" />}
    </svg>
  );
}

/** One life: the frog's face. */
function Life({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className={"h-5 w-5 transition-opacity " + (on ? "" : "opacity-20")} aria-hidden>
      <ellipse cx="10" cy="12" rx="8.5" ry="6.5" fill="#5cb84a" />
      <circle cx="5.2" cy="6.4" r="3.4" fill="#5cb84a" />
      <circle cx="14.8" cy="6.4" r="3.4" fill="#5cb84a" />
      <circle cx="5.2" cy="6.2" r="2" fill="#f6f8e6" />
      <circle cx="14.8" cy="6.2" r="2" fill="#f6f8e6" />
      <circle cx="5.2" cy="6.2" r="0.9" fill="#10151b" />
      <circle cx="14.8" cy="6.2" r="0.9" fill="#10151b" />
      <path d="M5.5 13.2 Q10 16.4 14.5 13.2" fill="none" stroke="#2c6a2a" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

function Pad({ label, x, y, className, children }: { label: string; x: number; y: number; className: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        crossing.move(x, y);
      }}
      className={"glass h-12 rounded-lg active:text-accent select-none touch-none " + className}
    >
      {children}
    </button>
  );
}
