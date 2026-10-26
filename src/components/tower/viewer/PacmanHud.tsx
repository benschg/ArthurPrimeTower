"use client";

import type { Lang } from "@/i18n";
import { ui } from "@/i18n/ui";
import { useGameHud } from "../gameStore";
import { LIVES } from "../pacman/game";
import { pacman } from "../pacman/store";
import { Bar, DirPad, Footnotes, GameOver, HudHeader, lifeClass, Lives, Score } from "./hud";

/** Bottom-left card while the floor-13 game runs: score, lives, dots left, and a pad for touch. */
export function PacmanHud({ lang, onQuit }: { lang: Lang; onQuit: () => void }) {
  const g = useGameHud(pacman);
  const t = ui[lang].pacman;
  const over = g.phase === "over";
  const eaten = g.dots > 0 ? (g.dots - g.left) / g.dots : 0;
  return (
    <div className="pointer-events-auto">
      <HudHeader t={t} level={`${t.level} ${g.level}`} muted={g.muted} onToggleSound={() => pacman.toggleSound()} onQuit={onQuit} over={over} />
      {over ? (
        <GameOver t={t} title={t.gameOver} text={t.overText(g.score, g.level)} newBest={g.newBest} best={g.best} onAgain={() => pacman.start()} onQuit={onQuit} />
      ) : (
        <>
          <div className="mt-2 flex items-center gap-1.5">
            <Lives left={g.lives} of={LIVES} label={t.lives} Icon={Life} />
            <Score value={g.score} label={t.score} />
          </div>
          <Bar fraction={Math.round(eaten * 100) / 100} className="bg-[#ffd91a] duration-150" />
          <Footnotes>
            <span>
              {g.left} {t.dots}
            </span>
            <span>
              {t.best} {g.best}
            </span>
          </Footnotes>
          <p className="mt-2 text-xs text-muted leading-snug pointer-coarse:hidden">{t.hint}</p>
          <DirPad labels={t.steer} onDir={(x, y) => pacman.steer(x, y)} />
        </>
      )}
    </div>
  );
}

function Life({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className={lifeClass(on)} aria-hidden>
      <path d="M10 10 L18.2 5.3 A9.4 9.4 0 1 0 18.2 14.7 Z" fill="#ffd91a" />
    </svg>
  );
}
