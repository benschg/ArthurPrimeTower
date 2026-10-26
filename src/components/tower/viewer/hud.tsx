"use client";

import type { ComponentType, ReactNode } from "react";

/** Labels every game's HUD has (each game has its own wording in ui). */
type HudText = { title: string; quit: string; again: string; best: string; newBest: string; soundOn?: string; soundOff?: string };

/** The card's top row: the game's title, an optional level or round, the sound switch and the way out. */
export function HudHeader({
  t,
  level,
  muted,
  onToggleSound,
  onQuit,
  over,
}: {
  t: HudText;
  /** e.g. "level 3", right of the title */
  level?: ReactNode;
  /** with onToggleSound: the game has sound */
  muted?: boolean;
  onToggleSound?: () => void;
  onQuit: () => void;
  /** the game has ended: the quit button is in the game-over block instead */
  over: boolean;
}) {
  const sound = onToggleSound !== undefined;
  return (
    <div className="flex items-baseline justify-between gap-2">
      <p className="font-mono text-[11px] uppercase tracking-widest text-accent">{t.title}</p>
      {level !== undefined && <p className="font-mono text-[11px] text-muted">{level}</p>}
      {(sound || !over) && (
        <span className="flex items-center gap-3">
          {sound && (
            <button
              onClick={onToggleSound}
              className={"hover:text-accent " + (muted ? "text-muted/60" : "text-muted")}
              aria-label={muted ? t.soundOff : t.soundOn}
              aria-pressed={!muted}
              title={muted ? t.soundOff : t.soundOn}
            >
              <Speaker on={!muted} />
            </button>
          )}
          {!over && (
            <button onClick={onQuit} className="font-mono text-[11px] text-muted hover:text-accent" aria-label={t.quit} title={t.quit}>
              ✕
            </button>
          )}
        </span>
      )}
    </div>
  );
}

/** After the last life or the finish: the outcome, the best, and play again or quit (Enter and Esc do the same). */
export function GameOver({ t, title, text, newBest, best, onAgain, onQuit }: { t: HudText; title: string; text: string; newBest: boolean; best: ReactNode; onAgain: () => void; onQuit: () => void }) {
  return (
    <>
      <p className="mt-2 text-xl font-semibold leading-tight">{title}</p>
      <p className="mt-1 text-sm text-muted">{text}</p>
      {newBest ? (
        <p className="mt-1 font-mono text-xs text-accent">{t.newBest}</p>
      ) : (
        <p className="mt-1 font-mono text-xs text-muted">
          {t.best} {best}
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
  );
}

/** A thin progress bar, 0..1; `className` colours the fill and sets its transition. */
export function Bar({ fraction, className }: { fraction: number; className: string }) {
  return (
    <div className="mt-2 h-2 rounded-full bg-ink-3 overflow-hidden">
      <div className={"h-full transition-[width] " + className} style={{ width: `${Math.max(0, Math.min(100, fraction * 100))}%` }} />
    </div>
  );
}

/** The small print under the bar, spread across the card. */
export function Footnotes({ children }: { children: ReactNode }) {
  return <div className="mt-1.5 flex justify-between font-mono text-[10px] text-muted">{children}</div>;
}

/** The big number at the right of the card. */
export function Score({ value, label }: { value: ReactNode; label: string }) {
  return (
    <span className="ml-auto text-right font-mono text-sm leading-tight">
      <span className="block text-2xl font-semibold text-paper">{value}</span>
      <span className="block text-[10px] uppercase tracking-widest text-muted">{label}</span>
    </span>
  );
}

/** The lives left, as icons, then for screen readers as a number. */
export function Lives({ left, of, label, Icon }: { left: number; of: number; label: string; Icon: ComponentType<{ on: boolean }> }) {
  return (
    <>
      {Array.from({ length: of }, (_, i) => (
        <Icon key={i} on={i < left} />
      ))}
      <span className="sr-only">
        {label} {left}
      </span>
    </>
  );
}

/** Dims a life that is gone. */
export const lifeClass = (on: boolean) => "h-5 w-5 transition-opacity " + (on ? "" : "opacity-20");

function Speaker({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 6h2.5L8 3v10L4.5 10H2z" fill="currentColor" />
      {on ? <path d="M10.5 5.5a3.5 3.5 0 0 1 0 5M12.5 3.5a6.3 6.3 0 0 1 0 9" /> : <path d="M10.5 6l4 4M14.5 6l-4 4" />}
    </svg>
  );
}

/** A button for touch screens, which have no arrow keys: it acts on press, and `onUp` on release. */
export function Pad({ label, onDown, onUp, className = "", children }: { label: string; onDown: () => void; onUp?: () => void; className?: string; children: ReactNode }) {
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
      className={"glass h-12 rounded-lg active:text-accent select-none touch-none " + className}
    >
      {children}
    </button>
  );
}

/** Four arrows for touch screens; `onDir` gets the direction on screen, x to the right, y up. */
export function DirPad({ labels, onDir }: { labels: { up: string; down: string; left: string; right: string }; onDir: (x: number, y: number) => void }) {
  return (
    <div className="mt-3 hidden pointer-coarse:grid grid-cols-3 gap-1.5 w-40 mx-auto font-mono text-lg">
      <Pad label={labels.up} onDown={() => onDir(0, 1)} className="col-start-2">
        ▲
      </Pad>
      <Pad label={labels.left} onDown={() => onDir(-1, 0)} className="col-start-1 row-start-2">
        ◀
      </Pad>
      <Pad label={labels.down} onDown={() => onDir(0, -1)} className="col-start-2 row-start-2">
        ▼
      </Pad>
      <Pad label={labels.right} onDown={() => onDir(1, 0)} className="col-start-3 row-start-2">
        ▶
      </Pad>
    </div>
  );
}
