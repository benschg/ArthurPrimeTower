"use client";

import Link from "next/link";
import { presentationPath } from "@/data/presentation";
import type { Lang } from "@/i18n";
import { ui } from "@/i18n/ui";
import { AboutInfo } from "./AboutInfo";

/** Top left: eyebrow, the title (its "P" starts the typing game), the tagline and the link to the talk. */
export function TitleBlock({ lang, gameView, onStartTyping }: { lang: Lang; gameView: boolean; onStartTyping: () => void }) {
  const t = ui[lang].viewer;
  return (
    <div className="absolute left-4 top-4 sm:left-8 sm:top-8 pointer-events-none max-w-[60vw]">
      {/* data-board-avoid: the floor-13 game board is fitted clear of these (scene/boardFit.ts) */}
      <p data-board-avoid className="font-mono text-[11px] uppercase tracking-[0.3em] text-accent">
        {t.eyebrow}
      </p>
      <h1 data-board-avoid className="mt-2 w-fit text-4xl sm:text-6xl font-semibold tracking-tight leading-[0.95]">
        <button
          type="button"
          onClick={(e) => {
            // drop focus first: a focused button that then gets disabled would swallow the game's keys
            e.currentTarget.blur();
            onStartTyping();
          }}
          aria-label={ui[lang].typing.startLabel}
          title={ui[lang].typing.startLabel}
          className="pointer-events-auto cursor-pointer rounded-sm transition-colors hover:text-accent focus-visible:text-accent focus-visible:outline-none"
        >
          P
        </button>
        rime
        <br />
        Tower
        <AboutInfo lang={lang} />
      </h1>
      {/* the tagline and link step aside while a game owns the view */}
      <p className={"mt-3 text-sm text-muted max-w-xs hidden sm:block transition-opacity duration-500 " + (gameView ? "opacity-0" : "")}>{t.tagline}</p>
      <Link
        href={presentationPath}
        tabIndex={gameView ? -1 : undefined}
        className={
          "mt-4 inline-flex items-center gap-2 rounded-full border border-accent/50 bg-ink/60 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-accent hover:bg-accent/15 hover:border-accent transition-all duration-500 " +
          (gameView ? "pointer-events-none opacity-0" : "pointer-events-auto")
        }
      >
        {ui[lang].sections.talk.cta} →
      </Link>
    </div>
  );
}
