"use client";

import type { Lang } from "@/i18n";
import { ui } from "@/i18n/ui";
import { LIVES } from "../crossing/game";
import { crossing } from "../crossing/store";
import { useGameHud } from "../gameStore";
import { Bar, DirPad, Footnotes, GameOver, HudHeader, lifeClass, Lives, Score } from "./hud";

/** Bottom-left card while the Hardbrücke game runs: crossings, lives, the clock, and a pad for touch. */
export function CrossingHud({ lang, onQuit }: { lang: Lang; onQuit: () => void }) {
  const g = useGameHud(crossing);
  const t = ui[lang].crossing;
  const over = g.phase === "over";
  return (
    <div key={g.knocks} className={"pointer-events-auto " + (g.knocks > 0 && !over ? "hud-shake" : "")}>
      <HudHeader t={t} level={`${t.level} ${g.level}`} muted={g.muted} onToggleSound={() => crossing.toggleSound()} onQuit={onQuit} over={over} />
      {over ? (
        <GameOver t={t} title={t.gameOver} text={t.overText(g.crossings)} newBest={g.newBest} best={g.best} onAgain={() => crossing.start()} onQuit={onQuit} />
      ) : (
        <>
          <div className="mt-2 flex items-center gap-1.5">
            <Lives left={g.lives} of={LIVES} label={t.lives} Icon={Life} />
            <Score value={g.crossings} label={t.crossings} />
          </div>
          {/* the clock for this crossing */}
          <Bar fraction={g.time} className={"duration-200 ease-linear " + (g.time < 0.25 ? "bg-red-400" : "bg-accent")} />
          <Footnotes>
            <span>{t.time}</span>
            <span>
              {t.best} {g.best}
            </span>
          </Footnotes>
          <p className="mt-2 text-xs text-muted leading-snug pointer-coarse:hidden">{t.hint}</p>
          <DirPad labels={t.steer} onDir={(x, y) => crossing.move(x, y)} />
        </>
      )}
    </div>
  );
}

/** One life: the frog's face. */
function Life({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className={lifeClass(on)} aria-hidden>
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
