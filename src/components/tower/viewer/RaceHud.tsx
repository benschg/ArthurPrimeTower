"use client";

import type { ReactNode } from "react";
import type { Lang } from "@/i18n";
import { ui } from "@/i18n/ui";
import { race, useRaceHud } from "../race/store";

const seconds = (tenths: number) => (tenths / 10).toFixed(1);

/** Bottom-left card while the Hardbrücke sprint runs: place, time, speed, and a pad for touch. */
export function RaceHud({ lang, onQuit }: { lang: Lang; onQuit: () => void }) {
  const g = useRaceHud();
  const t = ui[lang].race;
  const done = g.phase === "done";
  return (
    <div key={g.crashes} className={"pointer-events-auto " + (g.crashes > 0 && !done ? "hud-shake" : "")}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-widest text-accent">{t.title}</p>
        <span className="flex items-center gap-3">
          <button
            onClick={() => race.toggleSound()}
            className={"hover:text-accent " + (g.muted ? "text-muted/60" : "text-muted")}
            aria-label={g.muted ? t.soundOff : t.soundOn}
            aria-pressed={!g.muted}
            title={g.muted ? t.soundOff : t.soundOn}
          >
            <Speaker on={!g.muted} />
          </button>
          {!done && (
            <button onClick={onQuit} className="font-mono text-[11px] text-muted hover:text-accent" aria-label={t.quit} title={t.quit}>
              ✕
            </button>
          )}
        </span>
      </div>

      {done ? (
        <>
          <p className="mt-2 text-xl font-semibold leading-tight">{g.place === 1 ? t.won : t.placed(g.place)}</p>
          <p className="mt-1 text-sm text-muted">{t.doneText(seconds(g.tenths), g.crashes)}</p>
          {g.newBest ? (
            <p className="mt-1 font-mono text-xs text-accent">{t.newBest}</p>
          ) : (
            <p className="mt-1 font-mono text-xs text-muted">
              {t.best} {g.best.toFixed(1)} s
            </p>
          )}
          <div className="mt-3 flex gap-2 font-mono text-xs">
            <button onClick={() => race.start()} className="glass px-3 py-1.5 rounded-md hover:text-accent">
              {t.again} ⏎
            </button>
            <button onClick={onQuit} className="glass px-3 py-1.5 rounded-md hover:text-accent">
              {t.quit} esc
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="mt-2 flex items-end justify-between font-mono leading-tight">
            <span>
              <span className="text-3xl font-semibold text-paper">{g.place}.</span> <span className="text-[10px] uppercase tracking-widest text-muted">{t.ofFour}</span>
            </span>
            <span className="text-right">
              <span className="block text-2xl font-semibold text-paper tabular-nums">{seconds(g.tenths)} s</span>
              <span className="block text-[10px] uppercase tracking-widest text-muted tabular-nums">{g.kmh} km/h</span>
            </span>
          </div>
          {/* how far along the bridge */}
          <div className="mt-2 h-2 rounded-full bg-ink-3 overflow-hidden">
            <div className="h-full bg-accent transition-[width] duration-200 ease-linear" style={{ width: `${g.progress * 100}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[10px] text-muted">
            <span>
              {t.crashes} {g.crashes}
            </span>
            <span>{g.best > 0 ? `${t.best} ${g.best.toFixed(1)} s` : ""}</span>
          </div>
          <p className="mt-2 text-xs text-muted leading-snug pointer-coarse:hidden">{t.hint}</p>
          {/* touch screens have no arrow keys */}
          <div className="mt-3 hidden pointer-coarse:grid grid-cols-3 gap-1.5 font-mono text-lg">
            <Pad label={t.steer.left} onDown={() => race.steer(-1)}>
              ◀
            </Pad>
            <Pad label={t.steer.brake} onDown={() => race.brake(true)} onUp={() => race.brake(false)}>
              ▼
            </Pad>
            <Pad label={t.steer.right} onDown={() => race.steer(1)}>
              ▶
            </Pad>
          </div>
        </>
      )}
    </div>
  );
}

/** The start lights, as big digits over the middle of the view: 3, 2, 1, GO! */
export function RaceCountdown({ lang }: { lang: Lang }) {
  const g = useRaceHud();
  const text = g.phase === "count" ? String(g.count) : g.go ? ui[lang].race.go : null;
  if (!text) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
      <p key={text} className="race-count font-mono text-8xl sm:text-9xl font-extrabold text-paper">
        {text}
      </p>
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

function Pad({ label, onDown, onUp, children }: { label: string; onDown: () => void; onUp?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        onDown();
      }}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerLeave={onUp}
      className="glass h-12 rounded-lg active:text-accent select-none touch-none"
    >
      {children}
    </button>
  );
}
