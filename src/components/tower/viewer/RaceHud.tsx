"use client";

import type { Lang } from "@/i18n";
import { ui } from "@/i18n/ui";
import { useGameHud } from "../gameStore";
import { race } from "../race/store";
import { Bar, Footnotes, GameOver, HudHeader, Pad } from "./hud";

const seconds = (tenths: number) => (tenths / 10).toFixed(1);

/** Bottom-left card while the Hardbrücke sprint runs: place, time, speed, and a pad for touch. */
export function RaceHud({ lang, onQuit }: { lang: Lang; onQuit: () => void }) {
  const g = useGameHud(race);
  const t = ui[lang].race;
  const done = g.phase === "done";
  return (
    <div key={g.crashes} className={"pointer-events-auto " + (g.crashes > 0 && !done ? "hud-shake" : "")}>
      <HudHeader t={t} muted={g.muted} onToggleSound={() => race.toggleSound()} onQuit={onQuit} over={done} />
      {done ? (
        <GameOver
          t={t}
          title={g.place === 1 ? t.won : t.placed(g.place)}
          text={t.doneText(seconds(g.tenths), g.crashes)}
          newBest={g.newBest}
          best={`${g.best.toFixed(1)} s`}
          onAgain={() => race.start()}
          onQuit={onQuit}
        />
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
          <Bar fraction={g.progress} className="bg-accent duration-200 ease-linear" />
          <Footnotes>
            <span>
              {t.crashes} {g.crashes}
            </span>
            <span>{g.best > 0 ? `${t.best} ${g.best.toFixed(1)} s` : ""}</span>
          </Footnotes>
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
  const g = useGameHud(race);
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
